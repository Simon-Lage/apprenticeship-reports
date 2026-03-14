import {
  createDatabaseBackupEnvelope,
  createDatabaseBackupImportPreview,
  DatabaseBackupEnvelope,
  DatabaseBackupImportPreview,
  parseDatabaseBackupEnvelope,
} from '@/shared/app/backup-archive';
import {
  AppBootstrapState,
  deriveAppBootstrapState,
} from '@/shared/app/bootstrap';
import { AppMetadata, AppMetadataSchema } from '@/shared/app/state';
import {
  createGoogleSession,
  createPasswordSession,
  deriveGoogleSessionState,
  getPersistedGoogleSession,
  GoogleSession,
} from '@/shared/auth/session';
import {
  markBackupDirty,
  registerBackupAttempt,
  registerBackupFailure,
  registerBackupSuccess,
  registerCloseBackupCheck,
  registerDailyReportForBackup,
  registerLaunchBackupCheck,
  requestManualBackup,
} from '@/shared/backup/policy';
import {
  ensureJsonObject,
  isJsonObject,
  JsonObject,
  JsonObjectSchema,
} from '@/shared/common/json';
import { deriveDriveAccessState } from '@/shared/drive/permissions';
import { DriveBackupFile } from '@/shared/drive/backups';
import {
  ApplyBackupImportInput,
  ApplySettingsImportInput,
  AuthenticateWithGoogleInput,
  AuthenticateWithPasswordInput,
  ChangePasswordInput,
  GrantDriveScopesInput,
  InitializePasswordAuthInput,
  PrepareDriveBackupImportInput,
  RegisterWeeklyReportHashInput,
  SaveGoogleSessionInput,
  SaveOnboardingDraftInput,
  SavePasswordSessionInput,
  SetDriveScopesInput,
} from '@/shared/ipc/app-api';
import {
  completeOnboardingStep as completeValidatedOnboardingStep,
  OnboardingStepDefinition,
  saveOnboardingStepDraft as saveValidatedOnboardingStepDraft,
  skipOnboardingStep as skipValidatedOnboardingStep,
} from '@/shared/onboarding/progress';
import { mergeReportsState } from '@/shared/reports/models';
import { WeeklyReportHashRecord } from '@/shared/reports/stable';
import {
  createSettingsExportEnvelope,
  createSettingsImportPreview,
  createSettingsSnapshot,
  parseSettingsImportEnvelope,
  SettingsExportEnvelope,
  SettingsImportPreview,
} from '@/shared/settings/schema';
import { AppMetadataRepository } from '@/main/services/AppMetadataRepository';
import { GoogleDriveService } from '@/main/services/GoogleDriveService';
import { GoogleOAuthService } from '@/main/services/GoogleOAuthService';
import { WeeklyReportHashService } from '@/main/services/WeeklyReportHashService';
import { PasswordAuthService } from '@/main/services/PasswordAuthService';

export type AppKernelOptions = {
  now?: () => string;
  driveScopes?: string[];
  driveExplanation?: string | null;
  onboardingSteps?: OnboardingStepDefinition[];
  onboardingStepIds?: string[];
  settingsSchemaVersion?: number;
  normalizeSettingsValues?: (values: JsonObject) => JsonObject;
  passwordAuthService?: PasswordAuthService | null;
  googleOAuthService?: GoogleOAuthService | null;
  googleDriveService?: GoogleDriveService | null;
};

export class AppKernel {
  private readonly repository: AppMetadataRepository;

  private readonly weeklyReportHashService: WeeklyReportHashService;

  private readonly now: () => string;

  private readonly driveScopes: string[];

  private readonly driveExplanation: string | null;

  private readonly onboardingSteps: OnboardingStepDefinition[];

  private readonly onboardingStepIds: string[];

  private readonly settingsSchemaVersion: number;

  private readonly normalizeSettingsValues: (values: JsonObject) => JsonObject;

  private readonly passwordAuthService: PasswordAuthService | null;

  private readonly googleOAuthService: GoogleOAuthService | null;

  private readonly googleDriveService: GoogleDriveService | null;

  private activeSession: GoogleSession | null = null;

  private passwordConfigured = false;

  constructor(
    repository: AppMetadataRepository,
    weeklyReportHashService: WeeklyReportHashService,
    options: AppKernelOptions = {},
  ) {
    this.repository = repository;
    this.weeklyReportHashService = weeklyReportHashService;
    this.now = options.now ?? (() => new Date().toISOString());
    this.driveScopes = options.driveScopes ?? [];
    this.driveExplanation = options.driveExplanation ?? null;
    this.onboardingSteps = options.onboardingSteps ?? [];
    this.onboardingStepIds =
      options.onboardingStepIds ?? this.onboardingSteps.map((step) => step.id);
    this.settingsSchemaVersion = options.settingsSchemaVersion ?? 1;
    this.normalizeSettingsValues =
      options.normalizeSettingsValues ??
      ((values) => JsonObjectSchema.parse(values));
    this.passwordAuthService = options.passwordAuthService ?? null;
    this.googleOAuthService = options.googleOAuthService ?? null;
    this.googleDriveService = options.googleDriveService ?? null;
  }

  private getSettingsSnapshotId(currentState: AppMetadata): string {
    return currentState.settings.current.id || 'settings-current';
  }

  private createImportPreviewId(
    now: string,
    scope: 'settings' | 'backup',
  ): string {
    return `${scope}-import-${now.replace(/[^0-9]/g, '')}`;
  }

  private createRecoverySnapshotId(now: string): string {
    return `pre-restore-${now.replace(/[^0-9]/g, '')}`;
  }

  private getCurrentSession(currentState: AppMetadata): GoogleSession | null {
    return this.activeSession ?? currentState.auth.persistedSession;
  }

  private hasSameAccount(
    currentSession: GoogleSession | null,
    nextSession: GoogleSession,
  ): boolean {
    if (!currentSession) {
      return false;
    }

    return (
      currentSession.account.id === nextSession.account.id &&
      currentSession.account.email === nextSession.account.email
    );
  }

  private parseSettingsValues(values: JsonObject): JsonObject {
    return this.normalizeSettingsValues(JsonObjectSchema.parse(values));
  }

  private mergeOnboardingDraftIntoSettings(
    currentSettingsValues: JsonObject,
    stepId: string,
    value: JsonObject,
  ): JsonObject {
    const currentOnboardingValues = ensureJsonObject(
      currentSettingsValues.onboarding ?? {},
    );

    return ensureJsonObject({
      ...currentSettingsValues,
      onboarding: {
        ...currentOnboardingValues,
        [stepId]: value,
      },
    });
  }

  private createDisconnectedDriveState(currentState: AppMetadata) {
    return {
      ...currentState.drive,
      requiredScopes: this.driveScopes,
      grantedScopes: [],
      account: null,
      accessToken: null,
      refreshToken: null,
      connectedAt: null,
      lastValidatedAt: null,
      lastPromptedAt: null,
      explanation: this.driveExplanation,
    };
  }

  private getPasswordAuthService(): PasswordAuthService {
    if (!this.passwordAuthService) {
      throw new Error('Die Passwort-Authentifizierung ist nicht konfiguriert.');
    }

    return this.passwordAuthService;
  }

  private getGoogleOAuthService(): GoogleOAuthService {
    if (!this.googleOAuthService || !this.googleOAuthService.isConfigured()) {
      throw new Error('Google OAuth ist nicht konfiguriert.');
    }

    return this.googleOAuthService;
  }

  private getGoogleDriveService(): GoogleDriveService {
    if (!this.googleDriveService) {
      throw new Error('Google Drive ist noch nicht konfiguriert.');
    }

    return this.googleDriveService;
  }

  private async persistDriveAccessState(input: {
    accessToken: string;
    grantedScopes: string[];
  }): Promise<void> {
    const now = this.now();

    await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        drive: {
          ...currentState.drive,
          accessToken: input.accessToken,
          grantedScopes: input.grantedScopes.length
            ? input.grantedScopes
            : currentState.drive.grantedScopes,
          lastValidatedAt: now,
        },
      }),
    );
  }

  private async refreshDriveAccessState(
    currentState?: AppMetadata,
  ): Promise<AppMetadata> {
    const resolvedState = currentState ?? (await this.repository.read());
    this.assertDatabaseUnlocked(resolvedState);
    const connection = await this.getGoogleDriveService().authorizeConnection(
      resolvedState.drive,
    );

    if (
      connection.accessToken === resolvedState.drive.accessToken &&
      JSON.stringify(connection.grantedScopes) ===
        JSON.stringify(resolvedState.drive.grantedScopes)
    ) {
      return resolvedState;
    }

    const now = this.now();

    return this.repository.update((storedState) =>
      AppMetadataSchema.parse({
        ...storedState,
        drive: {
          ...storedState.drive,
          accessToken: connection.accessToken,
          grantedScopes: connection.grantedScopes.length
            ? connection.grantedScopes
            : storedState.drive.grantedScopes,
          lastValidatedAt: now,
        },
      }),
    );
  }

  private canAttemptDriveBackup(currentState: AppMetadata): boolean {
    if (!this.googleDriveService) {
      return false;
    }

    const authState = deriveGoogleSessionState(
      this.getCurrentSession(currentState),
      this.now(),
    );

    if (!authState.isAuthenticated) {
      return false;
    }

    const driveState = deriveDriveAccessState(currentState.drive, true);
    return driveState.status === 'granted';
  }

  private async executeDriveBackup(currentState?: AppMetadata): Promise<{
    file: DriveBackupFile;
    state: AppMetadata;
  }> {
    await this.refreshDriveAccessState(currentState);
    const attemptedAt = this.now();
    const attemptedState = await this.repository.update((storedState) =>
      AppMetadataSchema.parse({
        ...storedState,
        backup: registerBackupAttempt(storedState.backup, attemptedAt),
      }),
    );
    const envelope = createDatabaseBackupEnvelope(
      this.applyConfiguredDriveState(attemptedState),
      attemptedAt,
    );

    try {
      const result = await this.getGoogleDriveService().uploadBackup({
        permissionState: attemptedState.drive,
        exportedAt: envelope.exportedAt,
        serializedBackup: JSON.stringify(envelope),
      });
      const succeededAt = this.now();
      const nextState = await this.repository.update((storedState) =>
        AppMetadataSchema.parse({
          ...storedState,
          drive: {
            ...storedState.drive,
            accessToken: result.accessToken,
            grantedScopes: result.grantedScopes.length
              ? result.grantedScopes
              : storedState.drive.grantedScopes,
            lastValidatedAt: succeededAt,
          },
          backup: registerBackupSuccess(storedState.backup, succeededAt),
        }),
      );

      return {
        file: result.file,
        state: nextState,
      };
    } catch (error) {
      const failedAt = this.now();
      await this.repository.update((storedState) =>
        AppMetadataSchema.parse({
          ...storedState,
          backup: registerBackupFailure(storedState.backup, failedAt),
        }),
      );
      throw error;
    }
  }

  private async tryProcessPendingBackup(
    currentState?: AppMetadata,
  ): Promise<AppMetadata> {
    const resolvedState = currentState ?? (await this.repository.read());

    if (
      !resolvedState.backup.pendingReasons.length ||
      !this.canAttemptDriveBackup(resolvedState)
    ) {
      return resolvedState;
    }

    try {
      const result = await this.executeDriveBackup(resolvedState);
      return result.state;
    } catch {
      return this.repository.read();
    }
  }

  private assertAuthenticated(currentState: AppMetadata): void {
    const authState = deriveGoogleSessionState(
      this.getCurrentSession(currentState),
      this.now(),
    );

    if (!authState.isAuthenticated) {
      throw new Error(
        'Die lokale Datenbank ist gesperrt, bis der Google-Login abgeschlossen ist.',
      );
    }
  }

  private assertDatabaseUnlocked(currentState: AppMetadata): void {
    this.assertAuthenticated(currentState);

    const driveState = deriveDriveAccessState(currentState.drive, true);

    if (driveState.isLocked) {
      throw new Error(
        'Google-Drive-Berechtigungen fehlen. Die Anwendung bleibt bis zur Freigabe gesperrt.',
      );
    }
  }

  private createPasswordAccount(currentState: AppMetadata) {
    const onboardingValues = ensureJsonObject(
      currentState.settings.current.values.onboarding ?? {},
    );
    const identityValues = isJsonObject(onboardingValues.identity)
      ? onboardingValues.identity
      : {};
    const firstName =
      typeof identityValues.firstName === 'string'
        ? identityValues.firstName.trim()
        : '';
    const lastName =
      typeof identityValues.lastName === 'string'
        ? identityValues.lastName.trim()
        : '';
    const displayName =
      [firstName, lastName].filter(Boolean).join(' ') || 'Lokaler Zugriff';

    return {
      id: 'local-password-user',
      email: 'local@apprenticeship-reports.app',
      displayName,
    };
  }

  private assertOnboardingStepIsKnown(stepId: string): void {
    if (
      this.onboardingStepIds.length &&
      !this.onboardingStepIds.includes(stepId)
    ) {
      throw new Error(`Unknown onboarding step: ${stepId}`);
    }
  }

  private buildBootstrapState(currentState: AppMetadata): AppBootstrapState {
    const currentSession = this.getCurrentSession(currentState);

    return deriveAppBootstrapState({
      now: this.now(),
      session: currentSession,
      passwordConfigured: this.passwordConfigured,
      drive: currentState.drive,
      backup: currentState.backup,
      pendingBackupImportId:
        currentState.recovery.pendingBackupImport?.id ?? null,
      pendingBackupImportCreatedAt:
        currentState.recovery.pendingBackupImport?.createdAt ?? null,
      lastRecoverySnapshotPath: currentState.recovery.lastRecoverySnapshotPath,
      lastRestoredAt: currentState.recovery.lastRestoredAt,
      onboardingState: currentState.onboarding,
      onboardingStepIds: this.onboardingStepIds,
      pendingImport: currentState.settings.pendingImport,
      lastExportedAt: currentState.settings.lastExportedAt,
      weeklyHashCount: Object.keys(currentState.reports.weeklyHashes).length,
      weeklyReportCount: Object.keys(currentState.reports.weeklyReports).length,
      dailyReportCount: Object.keys(currentState.reports.dailyReports).length,
    });
  }

  private applyConfiguredDriveState(currentState: AppMetadata): AppMetadata {
    return AppMetadataSchema.parse({
      ...currentState,
      drive: {
        ...currentState.drive,
        requiredScopes: this.driveScopes,
        explanation: this.driveExplanation,
      },
    });
  }

  async boot(): Promise<AppBootstrapState> {
    this.passwordConfigured = this.passwordAuthService
      ? await this.passwordAuthService.hasPassword()
      : false;
    const nextState = await this.repository.update((currentState) => {
      const configuredState = this.applyConfiguredDriveState(currentState);
      this.activeSession = configuredState.auth.persistedSession;

      return AppMetadataSchema.parse({
        ...configuredState,
        backup: registerLaunchBackupCheck(configuredState.backup),
      });
    });
    const processedState = await this.tryProcessPendingBackup(nextState);

    return this.buildBootstrapState(processedState);
  }

  async getBootstrapState(): Promise<AppBootstrapState> {
    this.passwordConfigured = this.passwordAuthService
      ? await this.passwordAuthService.hasPassword()
      : false;
    const currentState = await this.repository.read();
    return this.buildBootstrapState(currentState);
  }

  async initializePasswordAuth(
    input: InitializePasswordAuthInput,
  ): Promise<AppBootstrapState> {
    await this.getPasswordAuthService().initialize(input.password);
    this.passwordConfigured = true;
    const currentState = await this.repository.read();

    return this.savePasswordSession({
      account: this.createPasswordAccount(currentState),
      rememberMe: input.rememberMe,
    });
  }

  async authenticateWithPassword(
    input: AuthenticateWithPasswordInput,
  ): Promise<AppBootstrapState> {
    const isValid = await this.getPasswordAuthService().verify(input.password);

    if (!isValid) {
      throw new Error('Das Passwort ist ungueltig.');
    }

    this.passwordConfigured = true;
    const currentState = await this.repository.read();

    return this.savePasswordSession({
      account: this.createPasswordAccount(currentState),
      rememberMe: input.rememberMe,
    });
  }

  async changePassword(input: ChangePasswordInput): Promise<AppBootstrapState> {
    await this.getPasswordAuthService().changePassword({
      currentPassword: input.currentPassword,
      nextPassword: input.nextPassword,
    });
    this.passwordConfigured = true;

    return this.getBootstrapState();
  }

  async authenticateWithGoogle(
    input: AuthenticateWithGoogleInput,
  ): Promise<AppBootstrapState> {
    const result = await this.getGoogleOAuthService().authorize();

    return this.saveGoogleSession({
      account: result.account,
      rememberMe: input.rememberMe,
    });
  }

  async connectGoogleDrive(): Promise<AppBootstrapState> {
    const currentState = await this.repository.read();
    this.assertAuthenticated(currentState);

    if (!this.driveScopes.length) {
      throw new Error('Google Drive Scopes sind nicht konfiguriert.');
    }

    const currentSession = this.getCurrentSession(currentState);

    if (!currentSession) {
      throw new Error('Google-Login fehlt fuer die Drive-Verbindung.');
    }

    const result = await this.getGoogleOAuthService().authorize({
      scopes: this.driveScopes,
      loginHint: currentSession.account.email,
    });
    await this.grantDriveScopes({
      account: result.account,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken ?? undefined,
      grantedScopes: result.grantedScopes,
    });
    const processedState = await this.tryProcessPendingBackup(
      await this.repository.read(),
    );

    return this.buildBootstrapState(processedState);
  }

  async uploadBackupToDrive(): Promise<DriveBackupFile> {
    const result = await this.executeDriveBackup();
    return result.file;
  }

  async listDriveBackups(): Promise<DriveBackupFile[]> {
    const currentState = await this.refreshDriveAccessState();
    const result = await this.getGoogleDriveService().listBackups(
      currentState.drive,
    );

    await this.persistDriveAccessState({
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    });

    return result.files;
  }

  async prepareDriveBackupImport(
    input: PrepareDriveBackupImportInput,
  ): Promise<DatabaseBackupImportPreview> {
    const currentState = await this.refreshDriveAccessState();
    const result = await this.getGoogleDriveService().downloadBackup({
      permissionState: currentState.drive,
      fileId: input.fileId,
    });

    await this.persistDriveAccessState({
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    });

    return this.prepareBackupImport(result.serializedBackup);
  }

  async savePasswordSession(
    input: SavePasswordSessionInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextSession = createPasswordSession(input, now);
    const previousSession = this.activeSession;
    this.activeSession = nextSession;

    const nextState = await this.repository.update((currentState) => {
      const configuredState = this.applyConfiguredDriveState(currentState);
      const currentSession =
        previousSession ?? configuredState.auth.persistedSession;
      const isSameAccount = this.hasSameAccount(currentSession, nextSession);

      return AppMetadataSchema.parse({
        ...configuredState,
        auth: {
          persistedSession: getPersistedGoogleSession(nextSession),
        },
        recovery: {
          ...configuredState.recovery,
          pendingBackupImport: isSameAccount
            ? configuredState.recovery.pendingBackupImport
            : null,
        },
        drive: isSameAccount
          ? configuredState.drive
          : this.createDisconnectedDriveState(configuredState),
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async saveGoogleSession(
    input: SaveGoogleSessionInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextSession = createGoogleSession(input, now);
    const grantedScopes = input.grantedScopes ?? [];
    const previousSession = this.activeSession;
    this.activeSession = nextSession;

    const nextState = await this.repository.update((currentState) => {
      const configuredState = this.applyConfiguredDriveState(currentState);
      const currentSession =
        previousSession ?? configuredState.auth.persistedSession;
      const isSameAccount = this.hasSameAccount(currentSession, nextSession);
      const baseDriveState = isSameAccount
        ? configuredState.drive
        : this.createDisconnectedDriveState(configuredState);
      const nextDriveState =
        input.accessToken || input.refreshToken || grantedScopes.length
          ? {
              ...baseDriveState,
              account: nextSession.account,
              accessToken: input.accessToken ?? baseDriveState.accessToken,
              refreshToken: input.refreshToken ?? baseDriveState.refreshToken,
              connectedAt: baseDriveState.connectedAt ?? now,
              lastValidatedAt: now,
              grantedScopes: Array.from(
                new Set([...baseDriveState.grantedScopes, ...grantedScopes]),
              ).sort((left, right) => left.localeCompare(right)),
              lastPromptedAt: null,
            }
          : baseDriveState;

      return AppMetadataSchema.parse({
        ...configuredState,
        auth: {
          persistedSession: getPersistedGoogleSession(nextSession),
        },
        recovery: {
          ...configuredState.recovery,
          pendingBackupImport: isSameAccount
            ? configuredState.recovery.pendingBackupImport
            : null,
        },
        drive: nextDriveState,
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async clearGoogleSession(): Promise<AppBootstrapState> {
    this.activeSession = null;

    const nextState = await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...this.applyConfiguredDriveState(currentState),
        auth: {
          persistedSession: null,
        },
        recovery: {
          ...currentState.recovery,
          pendingBackupImport: null,
        },
        drive: this.createDisconnectedDriveState(currentState),
      }),
    );

    return this.buildBootstrapState(nextState);
  }

  async setDriveScopes(input: SetDriveScopesInput): Promise<AppBootstrapState> {
    const nextState = await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        drive: {
          ...currentState.drive,
          requiredScopes: input.requiredScopes,
          explanation: input.explanation ?? currentState.drive.explanation,
        },
      }),
    );

    return this.buildBootstrapState(nextState);
  }

  async grantDriveScopes(
    input: GrantDriveScopesInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.assertAuthenticated(currentState);

      return AppMetadataSchema.parse({
        ...this.applyConfiguredDriveState(currentState),
        drive: {
          ...currentState.drive,
          requiredScopes: this.driveScopes,
          account: input.account,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken ?? currentState.drive.refreshToken,
          connectedAt: currentState.drive.connectedAt ?? now,
          lastValidatedAt: now,
          grantedScopes: Array.from(
            new Set([
              ...currentState.drive.grantedScopes,
              ...input.grantedScopes,
            ]),
          ).sort((left, right) => left.localeCompare(right)),
          lastPromptedAt: now,
          explanation: this.driveExplanation,
        },
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async requestManualBackup(): Promise<AppBootstrapState> {
    const nextState = await this.repository.update((currentState) => {
      this.assertDatabaseUnlocked(currentState);

      return AppMetadataSchema.parse({
        ...currentState,
        backup: requestManualBackup(currentState.backup),
      });
    });
    const processedState = await this.tryProcessPendingBackup(nextState);

    return this.buildBootstrapState(processedState);
  }

  async recordDailyReport(): Promise<AppBootstrapState> {
    const nextState = await this.repository.update((currentState) => {
      this.assertDatabaseUnlocked(currentState);

      return AppMetadataSchema.parse({
        ...currentState,
        backup: registerDailyReportForBackup(currentState.backup),
      });
    });
    const processedState = await this.tryProcessPendingBackup(nextState);

    return this.buildBootstrapState(processedState);
  }

  async registerBackupSuccess(): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.assertDatabaseUnlocked(currentState);

      return AppMetadataSchema.parse({
        ...currentState,
        backup: registerBackupSuccess(currentState.backup, now),
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async handleAppClose(): Promise<void> {
    const nextState = await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        backup: registerCloseBackupCheck(currentState.backup),
      }),
    );

    await this.tryProcessPendingBackup(nextState);
  }

  async exportSettings(): Promise<SettingsExportEnvelope> {
    const exportedAt = this.now();
    let envelope: SettingsExportEnvelope | null = null;

    await this.repository.update((currentState) => {
      this.assertDatabaseUnlocked(currentState);
      envelope = createSettingsExportEnvelope(
        currentState.settings.current,
        exportedAt,
      );

      return AppMetadataSchema.parse({
        ...currentState,
        settings: {
          ...currentState.settings,
          lastExportedAt: exportedAt,
        },
      });
    });

    if (!envelope) {
      throw new Error('Settings export could not be created.');
    }

    return envelope;
  }

  async prepareSettingsImport(
    serialized: string,
  ): Promise<SettingsImportPreview> {
    const importedEnvelope = parseSettingsImportEnvelope(serialized);
    const normalizedIncomingSnapshot = createSettingsSnapshot({
      id: importedEnvelope.snapshot.id,
      schemaVersion: importedEnvelope.snapshot.schemaVersion,
      capturedAt: importedEnvelope.snapshot.capturedAt,
      values: this.parseSettingsValues(importedEnvelope.snapshot.values),
    });
    let preview: SettingsImportPreview | null = null;

    await this.repository.update((currentState) => {
      this.assertDatabaseUnlocked(currentState);
      preview = createSettingsImportPreview({
        id: this.createImportPreviewId(this.now(), 'settings'),
        createdAt: this.now(),
        current: currentState.settings.current,
        incoming: normalizedIncomingSnapshot,
      });

      return AppMetadataSchema.parse({
        ...currentState,
        settings: {
          ...currentState.settings,
          pendingImport: preview,
        },
      });
    });

    if (!preview) {
      throw new Error('Settings import preview could not be created.');
    }

    return preview;
  }

  async cancelSettingsImport(): Promise<AppBootstrapState> {
    const nextState = await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        settings: {
          ...currentState.settings,
          pendingImport: null,
        },
      }),
    );

    return this.buildBootstrapState(nextState);
  }

  async applySettingsImport(
    input: ApplySettingsImportInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.assertDatabaseUnlocked(currentState);
      const pendingImport = currentState.settings.pendingImport;

      if (!pendingImport || pendingImport.id !== input.previewId) {
        throw new Error('Unknown settings import preview.');
      }

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        settings: {
          ...currentState.settings,
          current: createSettingsSnapshot({
            id: this.getSettingsSnapshotId(currentState),
            schemaVersion: pendingImport.incoming.schemaVersion,
            capturedAt: now,
            values: pendingImport.incoming.values,
          }),
          pendingImport: null,
        },
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async exportBackupArchive(): Promise<DatabaseBackupEnvelope> {
    const currentState = await this.repository.read();
    this.assertDatabaseUnlocked(currentState);

    return createDatabaseBackupEnvelope(
      this.applyConfiguredDriveState(currentState),
      this.now(),
    );
  }

  async prepareBackupImport(
    serialized: string,
  ): Promise<DatabaseBackupImportPreview> {
    const currentState = await this.repository.read();
    this.assertDatabaseUnlocked(currentState);

    const envelope = parseDatabaseBackupEnvelope(serialized);
    const now = this.now();
    const preview = createDatabaseBackupImportPreview({
      id: this.createImportPreviewId(now, 'backup'),
      createdAt: now,
      current: this.applyConfiguredDriveState(currentState),
      incoming: this.applyConfiguredDriveState(envelope.snapshot),
    });

    await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        recovery: {
          ...currentState.recovery,
          pendingBackupImport: {
            id: preview.id,
            createdAt: preview.createdAt,
            serializedEnvelope: serialized,
          },
        },
      }),
    );

    return preview;
  }

  async cancelBackupImport(): Promise<AppBootstrapState> {
    const nextState = await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        recovery: {
          ...currentState.recovery,
          pendingBackupImport: null,
        },
      }),
    );

    return this.buildBootstrapState(nextState);
  }

  async applyBackupImport(
    input: ApplyBackupImportInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const recoverySnapshotId = this.createRecoverySnapshotId(now);
    const nextState = await this.repository.update(async (currentState) => {
      this.assertDatabaseUnlocked(currentState);
      const pendingBackupImport = currentState.recovery.pendingBackupImport;

      if (!pendingBackupImport || pendingBackupImport.id !== input.previewId) {
        throw new Error('Unknown backup import preview.');
      }

      const pendingEnvelope = parseDatabaseBackupEnvelope(
        pendingBackupImport.serializedEnvelope,
      );
      const recoverySnapshotPath = await this.repository.writeRecoverySnapshot(
        recoverySnapshotId,
        currentState,
      );
      const importedSnapshot = this.applyConfiguredDriveState(
        pendingEnvelope.snapshot,
      );
      const mergedReports = mergeReportsState({
        currentState: currentState.reports,
        incomingState: importedSnapshot.reports,
        strategy: input.conflictStrategy,
      });

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        recovery: {
          pendingBackupImport: null,
          lastRecoverySnapshotPath: recoverySnapshotPath,
          lastRestoredAt: now,
        },
        reports: mergedReports,
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async setSettingsValues(values: JsonObject): Promise<AppBootstrapState> {
    const now = this.now();
    const parsedValues = this.parseSettingsValues(values);
    const nextState = await this.repository.update((currentState) => {
      this.assertDatabaseUnlocked(currentState);

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        settings: {
          ...currentState.settings,
          current: createSettingsSnapshot({
            id: this.getSettingsSnapshotId(currentState),
            schemaVersion: this.settingsSchemaVersion,
            capturedAt: now,
            values: parsedValues,
          }),
        },
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async saveOnboardingDraft(
    input: SaveOnboardingDraftInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.assertDatabaseUnlocked(currentState);
      this.assertOnboardingStepIsKnown(input.stepId);
      const onboarding = this.onboardingSteps.length
        ? saveValidatedOnboardingStepDraft(
            this.onboardingSteps,
            currentState.onboarding,
            input.stepId,
            input.values,
            now,
          )
        : AppMetadataSchema.shape.onboarding.parse({
            ...currentState.onboarding,
            drafts: {
              ...currentState.onboarding.drafts,
              [input.stepId]: JsonObjectSchema.parse(input.values),
            },
            lastActiveStepId: input.stepId,
            updatedAt: now,
          });
      const draftValues =
        onboarding.drafts[input.stepId] ?? JsonObjectSchema.parse(input.values);
      const nextSettingsValues = this.mergeOnboardingDraftIntoSettings(
        currentState.settings.current.values,
        input.stepId,
        draftValues,
      );

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        onboarding,
        settings: {
          ...currentState.settings,
          current: createSettingsSnapshot({
            id: this.getSettingsSnapshotId(currentState),
            schemaVersion: currentState.settings.current.schemaVersion,
            capturedAt: now,
            values: nextSettingsValues,
          }),
        },
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async completeOnboardingStep(stepId: string): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.assertDatabaseUnlocked(currentState);
      this.assertOnboardingStepIsKnown(stepId);
      const onboarding = this.onboardingSteps.length
        ? completeValidatedOnboardingStep(
            this.onboardingSteps,
            currentState.onboarding,
            stepId,
            now,
          )
        : AppMetadataSchema.shape.onboarding.parse({
            ...currentState.onboarding,
            completedStepIds: Array.from(
              new Set([...currentState.onboarding.completedStepIds, stepId]),
            ),
            lastActiveStepId: stepId,
            updatedAt: now,
          });

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        onboarding,
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async skipOnboardingStep(stepId: string): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.assertDatabaseUnlocked(currentState);
      this.assertOnboardingStepIsKnown(stepId);
      const onboarding = this.onboardingSteps.length
        ? skipValidatedOnboardingStep(
            this.onboardingSteps,
            currentState.onboarding,
            stepId,
            now,
          )
        : (() => {
            throw new Error(
              'Optional onboarding steps require explicit definitions.',
            );
          })();

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        onboarding,
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async registerWeeklyReportHash(
    input: RegisterWeeklyReportHashInput,
  ): Promise<WeeklyReportHashRecord> {
    const now = this.now();
    const record = this.weeklyReportHashService.createRecord(
      input.weeklyReportId,
      input.payload,
      now,
    );

    await this.repository.update((currentState) => {
      this.assertDatabaseUnlocked(currentState);

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        reports: {
          ...currentState.reports,
          weeklyHashes: {
            ...currentState.reports.weeklyHashes,
            [record.weeklyReportId]: record,
          },
        },
      });
    });

    return record;
  }
}
