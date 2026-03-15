import {
  AppBootstrapState,
  deriveAppBootstrapState,
} from '@/shared/app/bootstrap';
import { AppMetadata, AppMetadataSchema } from '@/shared/app/state';
import {
  createCatalogYearKey,
  mergeAbsenceSettings,
  parseAbsenceSettings,
  resolveOnboardingSubdivisionCode,
} from '@/shared/absence/settings';
import { deriveGoogleSessionState, GoogleSession } from '@/shared/auth/session';
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

  protected activeSession: GoogleSession | null = null;

  protected passwordConfigured = false;

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

    return (
      currentSession.account.id === nextSession.account.id &&
      currentSession.account.email === nextSession.account.email
    );
  }

  protected parseSettingsValues(values: JsonObject): JsonObject {
    return this.normalizeSettingsValues(JsonObjectSchema.parse(values));
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

  protected getGoogleOAuthService(): GoogleOAuthService {
    if (!this.googleOAuthService || !this.googleOAuthService.isConfigured()) {
      throw new Error('Google OAuth ist nicht konfiguriert.');
    }

    return this.googleOAuthService;
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

  protected async trySyncAbsenceCatalog(
    currentState: AppMetadata,
    force = false,
  ): Promise<AppMetadata> {
    if (!this.openHolidaysService) {
      return currentState;
    }

    const subdivisionCode = resolveOnboardingSubdivisionCode(
      currentState.settings.current.values,
    );

    if (!subdivisionCode) {
      return currentState;
    }

    const nowIso = this.now();
    const nowDate = new Date(nowIso);
    const year = nowDate.getUTCFullYear();
    const yearKey = createCatalogYearKey(year);
    const parsedAbsenceSettings = parseAbsenceSettings(
      currentState.settings.current.values,
    );
    const hasCatalogForYear =
      Boolean(parsedAbsenceSettings.catalogsByYear[yearKey]) &&
      parsedAbsenceSettings.catalogsByYear[yearKey].subdivisionCode ===
        subdivisionCode;
    const shouldRefreshOnNewYear =
      nowDate.getUTCMonth() === 0 &&
      nowDate.getUTCDate() === 1 &&
      parsedAbsenceSettings.lastSyncYear !== year;
    const shouldSync =
      force ||
      !hasCatalogForYear ||
      shouldRefreshOnNewYear ||
      parsedAbsenceSettings.subdivisionCode !== subdivisionCode;

    if (!shouldSync) {
      return currentState;
    }

    try {
      const catalog = await this.openHolidaysService.fetchYearCatalog({
        subdivisionCode,
        year,
      });
      const nextAbsenceSettings = parseAbsenceSettings(
        mergeAbsenceSettings(currentState.settings.current.values, {
          ...parsedAbsenceSettings,
          subdivisionCode,
          lastSyncYear: year,
          lastSyncedAt: nowIso,
          lastSyncError: null,
          catalogsByYear: {
            ...parsedAbsenceSettings.catalogsByYear,
            [yearKey]: {
              year,
              subdivisionCode,
              fetchedAt: nowIso,
              publicHolidays: catalog.publicHolidays,
              schoolHolidays: catalog.schoolHolidays,
            },
          },
        }),
      );
      const nextValues = mergeAbsenceSettings(
        currentState.settings.current.values,
        nextAbsenceSettings,
      );

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
}
