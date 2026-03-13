import { z } from 'zod';

export const DAILY_REPORT_BACKUP_THRESHOLD = 10;

export const BackupReasonSchema = z.enum([
  'manual',
  'app-close',
  'app-start-dirty',
  'daily-report-threshold',
]);

export type BackupReason = z.infer<typeof BackupReasonSchema>;

export const BackupStateSchema = z.object({
  lastSuccessfulBackupAt: z.string().datetime().nullable().default(null),
  lastAttemptedBackupAt: z.string().datetime().nullable().default(null),
  lastFailedBackupAt: z.string().datetime().nullable().default(null),
  pendingReasons: z.array(BackupReasonSchema).default([]),
  dailyReportsSinceLastBackup: z.number().int().nonnegative().default(0),
  hasUnsavedChanges: z.boolean().default(false),
});

export type BackupState = z.infer<typeof BackupStateSchema>;

export type BackupStatus = {
  hasUnsavedChanges: boolean;
  isBackupRequired: boolean;
  lastSuccessfulBackupAt: string | null;
  pendingReasons: BackupReason[];
  dailyReportsSinceLastBackup: number;
};

function withPendingReason(
  state: BackupState,
  reason: BackupReason,
): BackupState {
  const pendingReasonSet = new Set(state.pendingReasons);
  pendingReasonSet.add(reason);

  return BackupStateSchema.parse({
    ...state,
    pendingReasons: Array.from(pendingReasonSet),
  });
}

export function createBackupState(): BackupState {
  return BackupStateSchema.parse({});
}

export function markBackupDirty(state: BackupState): BackupState {
  return BackupStateSchema.parse({
    ...state,
    hasUnsavedChanges: true,
  });
}

export function requestManualBackup(state: BackupState): BackupState {
  return withPendingReason(markBackupDirty(state), 'manual');
}

export function registerDailyReportForBackup(
  state: BackupState,
): BackupState {
  const nextState = BackupStateSchema.parse({
    ...state,
    hasUnsavedChanges: true,
    dailyReportsSinceLastBackup: state.dailyReportsSinceLastBackup + 1,
  });

  if (nextState.dailyReportsSinceLastBackup < DAILY_REPORT_BACKUP_THRESHOLD) {
    return nextState;
  }

  return withPendingReason(nextState, 'daily-report-threshold');
}

export function registerLaunchBackupCheck(
  state: BackupState,
): BackupState {
  if (!state.hasUnsavedChanges) {
    return BackupStateSchema.parse(state);
  }

  return withPendingReason(state, 'app-start-dirty');
}

export function registerCloseBackupCheck(
  state: BackupState,
): BackupState {
  if (!state.hasUnsavedChanges) {
    return BackupStateSchema.parse(state);
  }

  return withPendingReason(state, 'app-close');
}

export function registerBackupAttempt(
  state: BackupState,
  now: string,
): BackupState {
  return BackupStateSchema.parse({
    ...state,
    lastAttemptedBackupAt: now,
  });
}

export function registerBackupSuccess(
  state: BackupState,
  now: string,
): BackupState {
  return BackupStateSchema.parse({
    ...state,
    hasUnsavedChanges: false,
    dailyReportsSinceLastBackup: 0,
    pendingReasons: [],
    lastAttemptedBackupAt: now,
    lastSuccessfulBackupAt: now,
  });
}

export function registerBackupFailure(
  state: BackupState,
  now: string,
): BackupState {
  return BackupStateSchema.parse({
    ...state,
    lastAttemptedBackupAt: now,
    lastFailedBackupAt: now,
  });
}

export function deriveBackupStatus(state: BackupState): BackupStatus {
  const parsedState = BackupStateSchema.parse(state);

  return {
    hasUnsavedChanges: parsedState.hasUnsavedChanges,
    isBackupRequired: parsedState.pendingReasons.length > 0,
    lastSuccessfulBackupAt: parsedState.lastSuccessfulBackupAt,
    pendingReasons: parsedState.pendingReasons,
    dailyReportsSinceLastBackup: parsedState.dailyReportsSinceLastBackup,
  };
}
