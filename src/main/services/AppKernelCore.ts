import {
  AppBootstrapState,
  deriveAppBootstrapState,
} from '@/shared/app/bootstrap';
import { AppMetadata, AppMetadataSchema } from '@/shared/app/state';
import {
  createCatalogYearKey,
  getMissingAbsenceCatalogYears,
  mergeAbsenceSettings,
  parseAbsenceSettings,
  resolveOnboardingSubdivisionCode,
  resolveRequiredAbsenceCatalogYears,
} from '@/shared/absence/settings';
import { isGermanSubdivisionCode } from '@/shared/absence/german-subdivisions';
import { deriveGoogleSessionState, GoogleSession } from '@/shared/auth/session';
import {
  BackupPasswordKeyWrap,
  EncryptedBackupEnvelope,
  EncryptedBackupEnvelopeSchema,
} from '@/shared/app/backup-encryption';
import { markBackupDirty } from '@/shared/backup/policy';
import {
  ensureJsonObject,
  isJsonObject,
  JsonObject,
  JsonObjectSchema,
} from '@/shared/common/json';
import { deriveDriveAccessState } from '@/shared/drive/permissions';
import { OnboardingStepDefinition } from '@/shared/onboarding/progress';
import { AppMetadataRepository } from '@/main/services/AppMetadataRepository';
import { GoogleDriveService } from '@/main/services/GoogleDriveService';
import { GoogleOAuthService } from '@/main/services/GoogleOAuthService';
import { WeeklyReportHashService } from '@/main/services/WeeklyReportHashService';
import { PasswordAuthService } from '@/main/services/PasswordAuthService';
import { OnboardingResolver } from '@/main/services/OnboardingResolver';
import { AppAccessGuard } from '@/main/services/AppAccessGuard';
import OpenHolidaysService from '@/main/services/OpenHolidaysService';
import { BackupEncryptionService } from '@/main/services/BackupEncryptionService';

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
  openHolidaysService?: OpenHolidaysService | null;
};

export class AppKernelCore {
  protected readonly repository: AppMetadataRepository;

  protected readonly weeklyReportHashService: WeeklyReportHashService;

  protected readonly now: () => string;

  protected readonly driveScopes: string[];

  protected readonly driveExplanation: string | null;

  protected readonly onboardingSteps: OnboardingStepDefinition[];

  protected readonly onboardingStepIds: string[];

  protected readonly onboardingResolver: OnboardingResolver;

  protected readonly accessGuard: AppAccessGuard;

  protected readonly settingsSchemaVersion: number;

  protected readonly normalizeSettingsValues: (
    values: JsonObject,
  ) => JsonObject;

  protected readonly passwordAuthService: PasswordAuthService | null;

  protected readonly googleOAuthService: GoogleOAuthService | null;

  protected readonly googleDriveService: GoogleDriveService | null;

  protected readonly openHolidaysService: OpenHolidaysService | null;

  protected readonly backupEncryptionService: BackupEncryptionService;

  protected activeSession: GoogleSession | null = null;

  protected passwordConfigured = false;

  protected absenceSyncPending = false;

  protected launchBackupCheckPending = false;

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
    this.onboardingResolver = new OnboardingResolver(
      this.onboardingSteps,
      options.onboardingStepIds,
    );
    this.onboardingStepIds = this.onboardingResolver.getStepIds();
    this.settingsSchemaVersion = options.settingsSchemaVersion ?? 1;
    this.normalizeSettingsValues =
      options.normalizeSettingsValues ??
      ((values) => JsonObjectSchema.parse(values));
    this.passwordAuthService = options.passwordAuthService ?? null;
    this.googleOAuthService = options.googleOAuthService ?? null;
    this.googleDriveService = options.googleDriveService ?? null;
    this.openHolidaysService = options.openHolidaysService ?? null;
    this.backupEncryptionService = new BackupEncryptionService();
    this.accessGuard = new AppAccessGuard({
      now: this.now,
      getCurrentSession: (currentState) => this.getCurrentSession(currentState),
      getPasswordConfigured: () => this.passwordConfigured,
      onboardingResolver: this.onboardingResolver,
    });
  }

  protected getSettingsSnapshotId(currentState: AppMetadata): string {
    return currentState.settings.current.id || 'settings-current';
  }

  protected createImportPreviewId(
    now: string,
    scope: 'settings' | 'backup',
  ): string {
    return `${scope}-import-${now.replace(/[^0-9]/g, '')}`;
  }

  protected createRecoverySnapshotId(now: string): string {
    return `pre-restore-${now.replace(/[^0-9]/g, '')}`;
  }

  protected getCurrentSession(currentState: AppMetadata): GoogleSession | null {
    return this.activeSession ?? currentState.auth.persistedSession;
  }

  protected hasSameAccount(
    currentSession: GoogleSession | null,
    nextSession: GoogleSession,
  ): boolean {
    if (!currentSession) {
      return false;
    }

    return this.hasSameUserAccount(currentSession.account, nextSession.account);
  }

  protected hasSameUserAccount(
    currentAccount: GoogleSession['account'] | null,
    nextAccount: GoogleSession['account'],
  ): boolean {
    if (!currentAccount) {
      return false;
    }

    return (
      currentAccount.id === nextAccount.id &&
      currentAccount.email === nextAccount.email
    );
  }

  protected parseSettingsValues(values: JsonObject): JsonObject {
    const normalized = this.normalizeSettingsValues(
      JsonObjectSchema.parse(values),
    );
    const appUi = ensureJsonObject(normalized.appUi ?? {});

    if (
      !Object.prototype.hasOwnProperty.call(appUi, 'supervisorEmailSecondary')
    ) {
      return normalized;
    }

    const nextAppUi = { ...appUi };

    delete nextAppUi.supervisorEmailSecondary;

    return ensureJsonObject({
      ...normalized,
      appUi: nextAppUi,
    });
  }

  protected mergeOnboardingDraftIntoSettings(
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

  protected createDisconnectedDriveState(currentState: AppMetadata) {
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

  protected getPasswordAuthService(): PasswordAuthService {
    if (!this.passwordAuthService) {
      throw new Error('Die Passwort-Authentifizierung ist nicht konfiguriert.');
    }

    return this.passwordAuthService;
  }

  protected createBackupEncryptionState(input: {
    password: string;
    masterKey?: string | null;
  }) {
    const masterKey =
      input.masterKey ?? this.backupEncryptionService.createMasterKey();

    return {
      version: 1 as const,
      masterKey,
      passwordKeyWrap: this.backupEncryptionService.createPasswordKeyWrap({
        masterKey,
        password: input.password,
      }),
    };
  }

  protected getBackupEncryptionMaterial(currentState: AppMetadata): {
    masterKey: string;
    passwordKeyWrap: BackupPasswordKeyWrap;
  } {
    const { masterKey, passwordKeyWrap } = currentState.backupEncryption;

    if (!masterKey || !passwordKeyWrap) {
      throw new Error('Backup-Verschlüsselung ist nicht eingerichtet.');
    }

    return {
      masterKey,
      passwordKeyWrap,
    };
  }

  protected parseEncryptedBackupEnvelope(
    serialized: string,
  ): EncryptedBackupEnvelope | null {
    try {
      const parsedValue = JSON.parse(serialized) as unknown;
      const parsedEnvelope =
        EncryptedBackupEnvelopeSchema.safeParse(parsedValue);

      return parsedEnvelope.success ? parsedEnvelope.data : null;
    } catch {
      return null;
    }
  }

  protected getGoogleOAuthService(): GoogleOAuthService {
    if (!this.googleOAuthService || !this.googleOAuthService.isConfigured()) {
      throw new Error('Google OAuth ist nicht konfiguriert.');
    }

    return this.googleOAuthService;
  }

  getPendingGoogleAuthorizationUrl(): string | null {
    return this.googleOAuthService?.getPendingAuthorizationUrl() ?? null;
  }

  cancelPendingGoogleAuthorization(): void {
    this.googleOAuthService?.cancelPendingAuthorization();
  }

  protected getGoogleDriveService(): GoogleDriveService {
    if (!this.googleDriveService) {
      throw new Error('Google Drive ist noch nicht konfiguriert.');
    }

    return this.googleDriveService;
  }

  protected canAttemptDriveBackup(currentState: AppMetadata): boolean {
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

  protected shouldSyncAbsenceCatalog(currentState: AppMetadata): boolean {
    if (!this.openHolidaysService) {
      return false;
    }

    const subdivisionCode =
      this.resolveRequiredOnboardingSubdivisionCode(currentState).value;

    if (!subdivisionCode) {
      return false;
    }

    const nowIso = this.now();
    const nowDate = new Date(nowIso);
    const year = nowDate.getUTCFullYear();
    const parsedAbsenceSettings = parseAbsenceSettings(
      currentState.settings.current.values,
    );
    const syncYears = this.resolveAbsenceCatalogSyncYears(currentState, year);
    const missingYears = this.resolveMissingAbsenceCatalogYears({
      absenceSettings: parsedAbsenceSettings,
      subdivisionCode,
      years: syncYears,
    });
    const shouldRefreshOnNewYear =
      nowDate.getUTCMonth() === 0 &&
      nowDate.getUTCDate() === 1 &&
      parsedAbsenceSettings.lastSyncYear !== year;

    return (
      missingYears.length > 0 ||
      shouldRefreshOnNewYear ||
      parsedAbsenceSettings.subdivisionCode !== subdivisionCode
    );
  }

  protected markAbsenceSyncPending(currentState: AppMetadata): AppMetadata {
    const parsedAbsenceSettings = parseAbsenceSettings(
      currentState.settings.current.values,
    );

    if (!parsedAbsenceSettings.autoSyncHolidays) {
      return currentState;
    }

    if (this.shouldSyncAbsenceCatalog(currentState)) {
      this.absenceSyncPending = true;
    }

    return currentState;
  }

  dismissAbsenceSyncPending(): void {
    this.absenceSyncPending = false;
  }

  protected triggerAbsenceSyncPending(): void {
    this.absenceSyncPending = true;
  }

  protected async executeAbsenceCatalogSync(
    currentState: AppMetadata,
  ): Promise<AppMetadata> {
    const { openHolidaysService } = this;

    if (!openHolidaysService) {
      return currentState;
    }

    const subdivisionResult =
      this.resolveRequiredOnboardingSubdivisionCode(currentState);
    const { value: subdivisionCode, missingStepId } = subdivisionResult;

    if (!subdivisionCode) {
      if (missingStepId) {
        return this.markOnboardingStepActive(currentState, missingStepId);
      }

      return currentState;
    }

    const nowIso = this.now();
    const nowDate = new Date(nowIso);
    const year = nowDate.getUTCFullYear();
    const parsedAbsenceSettings = parseAbsenceSettings(
      currentState.settings.current.values,
    );

    try {
      const syncYears = this.resolveAbsenceCatalogSyncYears(currentState, year);
      const yearsToSync = Array.from(
        new Set([
          ...this.resolveMissingAbsenceCatalogYears({
            absenceSettings: parsedAbsenceSettings,
            subdivisionCode,
            years: syncYears,
          }),
          year,
        ]),
      ).sort((left, right) => left - right);
      const fetchedCatalogs = await Promise.all(
        yearsToSync.map(async (targetYear) => ({
          year: targetYear,
          catalog: await openHolidaysService.fetchYearCatalog({
            subdivisionCode,
            year: targetYear,
          }),
        })),
      );
      const catalogsByYear = {
        ...parsedAbsenceSettings.catalogsByYear,
      };

      fetchedCatalogs.forEach((entry) => {
        catalogsByYear[createCatalogYearKey(entry.year)] = {
          year: entry.year,
          subdivisionCode,
          fetchedAt: nowIso,
          publicHolidays: entry.catalog.publicHolidays,
          schoolHolidays: entry.catalog.schoolHolidays,
        };
      });
      const nextAbsenceSettings = parseAbsenceSettings(
        mergeAbsenceSettings(currentState.settings.current.values, {
          ...parsedAbsenceSettings,
          subdivisionCode,
          lastSyncYear: yearsToSync[yearsToSync.length - 1] ?? year,
          lastSyncedAt: nowIso,
          lastSyncError: null,
          catalogsByYear,
        }),
      );
      const nextValues = mergeAbsenceSettings(
        currentState.settings.current.values,
        nextAbsenceSettings,
      );

      this.absenceSyncPending = false;

      return this.repository.update((storedState) =>
        AppMetadataSchema.parse({
          ...storedState,
          backup: markBackupDirty(storedState.backup),
          settings: {
            ...storedState.settings,
            current: {
              ...storedState.settings.current,
              capturedAt: nowIso,
              values: nextValues,
            },
          },
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'OpenHolidays sync failed.';
      const nextAbsenceSettings = parseAbsenceSettings(
        mergeAbsenceSettings(currentState.settings.current.values, {
          ...parsedAbsenceSettings,
          subdivisionCode,
          lastSyncError: message,
        }),
      );
      const nextValues = mergeAbsenceSettings(
        currentState.settings.current.values,
        nextAbsenceSettings,
      );

      this.absenceSyncPending = false;

      return this.repository.update((storedState) =>
        AppMetadataSchema.parse({
          ...storedState,
          settings: {
            ...storedState.settings,
            current: {
              ...storedState.settings.current,
              capturedAt: nowIso,
              values: nextValues,
            },
          },
        }),
      );
    }
  }

  protected createPasswordAccount(currentState: AppMetadata) {
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

  protected buildBootstrapState(currentState: AppMetadata): AppBootstrapState {
    const currentSession = this.getCurrentSession(currentState);
    const onboardingState = this.onboardingResolver.derive(currentState);

    return deriveAppBootstrapState({
      now: this.now(),
      session: currentSession,
      passwordConfigured: this.passwordConfigured,
      googleAuthConfigured: Boolean(
        this.googleOAuthService && this.googleOAuthService.isConfigured(),
      ),
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
      resolvedOnboarding: {
        isConfigured: onboardingState.isConfigured,
        isComplete: onboardingState.isComplete,
        nextStepId: onboardingState.nextStepId,
        activeStepIds: onboardingState.activeStepIds,
        remainingStepIds: onboardingState.remainingStepIds,
        skippedStepIds: onboardingState.skippedStepIds,
      },
      pendingImport: currentState.settings.pendingImport,
      lastExportedAt: currentState.settings.lastExportedAt,
      absenceSyncPending: this.absenceSyncPending,
      weeklyHashCount: Object.keys(currentState.reports.weeklyHashes).length,
      weeklyReportCount: Object.keys(currentState.reports.weeklyReports).length,
      dailyReportCount: Object.keys(currentState.reports.dailyReports).length,
    });
  }

  protected applyConfiguredDriveState(currentState: AppMetadata): AppMetadata {
    return AppMetadataSchema.parse({
      ...currentState,
      drive: {
        ...currentState.drive,
        requiredScopes: this.driveScopes,
        explanation: this.driveExplanation,
      },
    });
  }

  private resolveAbsenceCatalogSyncYears(
    currentState: AppMetadata,
    currentYear: number,
  ): number[] {
    const earliestDailyReportDate = Object.values(
      currentState.reports.dailyReports,
    )
      .map((dailyReport) => dailyReport.date)
      .sort((left, right) => left.localeCompare(right))[0];
    const fallbackStartYear = earliestDailyReportDate
      ? Number(earliestDailyReportDate.slice(0, 4))
      : null;

    return resolveRequiredAbsenceCatalogYears({
      values: ensureJsonObject(currentState.settings.current.values),
      currentYear,
      fallbackStartYear,
    });
  }

  private resolveMissingAbsenceCatalogYears(input: {
    absenceSettings: ReturnType<typeof parseAbsenceSettings>;
    subdivisionCode: string;
    years: number[];
  }): number[] {
    return getMissingAbsenceCatalogYears({
      absence: input.absenceSettings,
      subdivisionCode: input.subdivisionCode,
      requiredYears: input.years,
    });
  }

  private resolveRequiredOnboardingSubdivisionCode(currentState: AppMetadata): {
    value: string | null;
    missingStepId: string | null;
  } {
    if (!this.onboardingResolver.hasStep('region')) {
      return {
        value: resolveOnboardingSubdivisionCode(
          currentState.settings.current.values,
        ),
        missingStepId: null,
      };
    }

    const region = this.onboardingResolver.getStepValue(currentState, 'region');
    const rawSubdivisionCode =
      typeof region?.subdivisionCode === 'string'
        ? region.subdivisionCode.trim()
        : '';

    if (!rawSubdivisionCode) {
      return {
        value: null,
        missingStepId: 'region',
      };
    }

    if (!isGermanSubdivisionCode(rawSubdivisionCode)) {
      return {
        value: null,
        missingStepId: null,
      };
    }

    return {
      value: rawSubdivisionCode,
      missingStepId: null,
    };
  }

  private async markOnboardingStepActive(
    currentState: AppMetadata,
    stepId: string,
  ): Promise<AppMetadata> {
    const now = this.now();

    return this.repository.update((storedState) =>
      AppMetadataSchema.parse({
        ...storedState,
        onboarding: this.onboardingResolver.activateStep(
          storedState,
          stepId,
          now,
        ),
      }),
    );
  }
}
