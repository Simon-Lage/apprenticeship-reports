import { AppSession, deriveSessionState } from '@/shared/auth/session';
import { BackupState, deriveBackupStatus } from '@/shared/backup/policy';
import {
  DrivePermissionState,
  deriveDriveAccessState,
} from '@/shared/drive/permissions';
import { OnboardingProgress } from '@/shared/onboarding/progress';
import { SettingsImportPreview } from '@/shared/settings/schema';

export type AppLockReason =
  | 'authentication'
  | 'password-setup'
  | 'drive-permissions'
  | 'onboarding';

export type AppBootstrapState = {
  timestamp: string;
  auth: ReturnType<typeof deriveSessionState> & {
    passwordConfigured: boolean;
  };
  drive: ReturnType<typeof deriveDriveAccessState>;
  database: {
    isLocked: boolean;
    status: 'locked' | 'ready';
    reason: 'auth-required' | null;
  };
  backup: ReturnType<typeof deriveBackupStatus> & {
    pendingImport: boolean;
    pendingImportCreatedAt: string | null;
    lastRecoverySnapshotPath: string | null;
    lastRestoredAt: string | null;
  };
  onboarding: {
    isConfigured: boolean;
    isComplete: boolean;
    nextStepId: string | null;
    remainingStepIds: string[];
    skippedStepIds: string[];
  };
  settings: {
    lastExportedAt: string | null;
    pendingImport: boolean;
    pendingImportDifferenceCount: number;
  };
  reports: {
    weeklyHashCount: number;
    weeklyReportCount: number;
    dailyReportCount: number;
  };
  app: {
    status: 'ready' | 'blocked';
    isLocked: boolean;
    lockReasons: AppLockReason[];
  };
};

type ResolvedOnboardingState = {
  isConfigured: boolean;
  isComplete: boolean;
  nextStepId: string | null;
  remainingStepIds: string[];
  skippedStepIds: string[];
};

export function deriveAppBootstrapState(input: {
  now: string;
  session: AppSession | null;
  passwordConfigured: boolean;
  drive: DrivePermissionState;
  backup: BackupState;
  pendingBackupImportId: string | null;
  pendingBackupImportCreatedAt: string | null;
  lastRecoverySnapshotPath: string | null;
  lastRestoredAt: string | null;
  onboardingState: OnboardingProgress;
  onboardingStepIds?: string[];
  resolvedOnboarding?: ResolvedOnboardingState;
  pendingImport: SettingsImportPreview | null;
  lastExportedAt: string | null;
  weeklyHashCount: number;
  weeklyReportCount: number;
  dailyReportCount: number;
}): AppBootstrapState {
  const auth = deriveSessionState(input.session, input.now);
  const drive = deriveDriveAccessState(input.drive, auth.isAuthenticated);
  const backup = deriveBackupStatus(input.backup);
  const onboardingStepIds = input.onboardingStepIds ?? [];
  const fallbackCompletedStepIdSet = new Set(
    input.onboardingState.completedStepIds,
  );
  const fallbackRemainingStepIds = onboardingStepIds.filter(
    (stepId) => !fallbackCompletedStepIdSet.has(stepId),
  );
  const onboarding = input.resolvedOnboarding ?? {
    isConfigured: onboardingStepIds.length > 0,
    isComplete:
      onboardingStepIds.length > 0
        ? fallbackRemainingStepIds.length === 0
        : false,
    nextStepId: fallbackRemainingStepIds[0] ?? null,
    remainingStepIds: fallbackRemainingStepIds,
    skippedStepIds: input.onboardingState.skippedStepIds ?? [],
  };
  const lockReasons: AppLockReason[] = [];

  if (!auth.isAuthenticated) {
    lockReasons.push('authentication');
  }

  if (!input.passwordConfigured) {
    lockReasons.push('password-setup');
  }

  if (drive.isLocked) {
    lockReasons.push('drive-permissions');
  }

  if (onboarding.isConfigured && !onboarding.isComplete) {
    lockReasons.push('onboarding');
  }

  return {
    timestamp: input.now,
    auth: {
      ...auth,
      passwordConfigured: input.passwordConfigured,
    },
    drive,
    database: {
      isLocked: !auth.isAuthenticated,
      status: auth.isAuthenticated ? 'ready' : 'locked',
      reason: auth.isAuthenticated ? null : 'auth-required',
    },
    backup: {
      ...backup,
      pendingImport: Boolean(input.pendingBackupImportId),
      pendingImportCreatedAt: input.pendingBackupImportCreatedAt,
      lastRecoverySnapshotPath: input.lastRecoverySnapshotPath,
      lastRestoredAt: input.lastRestoredAt,
    },
    onboarding,
    settings: {
      lastExportedAt: input.lastExportedAt,
      pendingImport: Boolean(input.pendingImport),
      pendingImportDifferenceCount:
        input.pendingImport?.differences.length ?? 0,
    },
    reports: {
      weeklyHashCount: input.weeklyHashCount,
      weeklyReportCount: input.weeklyReportCount,
      dailyReportCount: input.dailyReportCount,
    },
    app: {
      status: lockReasons.length ? 'blocked' : 'ready',
      isLocked: lockReasons.length > 0,
      lockReasons,
    },
  };
}
