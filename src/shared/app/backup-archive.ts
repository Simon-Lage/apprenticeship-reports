import { z } from 'zod';

import { AppMetadata, AppMetadataSchema } from '@/shared/app/state';
import {
  BackupConflictStrategySchema,
  summarizeReportConflicts,
} from '@/shared/reports/models';

export const DatabaseBackupEnvelopeSchema = z.object({
  exportedAt: z.string().datetime(),
  source: z.literal('local-database'),
  snapshot: AppMetadataSchema,
});

export const DatabaseBackupSummarySchema = z.object({
  lastSuccessfulBackupAt: z.string().datetime().nullable(),
  dailyReportsSinceLastBackup: z.number().int().nonnegative(),
  hasUnsavedChanges: z.boolean(),
  settingsCapturedAt: z.string().datetime(),
  onboardingCompletedStepCount: z.number().int().nonnegative(),
  weeklyHashCount: z.number().int().nonnegative(),
  weeklyReportCount: z.number().int().nonnegative(),
  dailyReportCount: z.number().int().nonnegative(),
});

export const BackupImportConflictSummarySchema = z.object({
  weeklyReportCount: z.number().int().nonnegative(),
  dailyReportCount: z.number().int().nonnegative(),
  conflictingWeekCount: z.number().int().nonnegative(),
  conflictingDailyReportCount: z.number().int().nonnegative(),
});

export const DatabaseBackupImportPreviewSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  current: DatabaseBackupSummarySchema,
  incoming: DatabaseBackupSummarySchema,
  conflictSummary: BackupImportConflictSummarySchema,
  defaultConflictStrategy: BackupConflictStrategySchema,
  availableConflictStrategies: z.array(BackupConflictStrategySchema),
  warning: z.string().min(1),
});

export type DatabaseBackupEnvelope = z.infer<typeof DatabaseBackupEnvelopeSchema>;
export type DatabaseBackupSummary = z.infer<typeof DatabaseBackupSummarySchema>;
export type DatabaseBackupImportPreview = z.infer<typeof DatabaseBackupImportPreviewSchema>;

export function sanitizeMetadataForBackup(snapshot: AppMetadata): AppMetadata {
  return AppMetadataSchema.parse({
    ...snapshot,
    auth: {
      persistedSession: null,
    },
    drive: {
      ...snapshot.drive,
      grantedScopes: [],
      lastPromptedAt: null,
      accessToken: null,
      refreshToken: null,
    },
  });
}

export function createDatabaseBackupEnvelope(
  snapshot: AppMetadata,
  exportedAt: string,
): DatabaseBackupEnvelope {
  return DatabaseBackupEnvelopeSchema.parse({
    exportedAt,
    source: 'local-database',
    snapshot: sanitizeMetadataForBackup(snapshot),
  });
}

export function parseDatabaseBackupEnvelope(
  serialized: string,
): DatabaseBackupEnvelope {
  const parsedValue = JSON.parse(serialized) as unknown;
  return DatabaseBackupEnvelopeSchema.parse(parsedValue);
}

export function summarizeDatabaseBackup(snapshot: AppMetadata): DatabaseBackupSummary {
  return DatabaseBackupSummarySchema.parse({
    lastSuccessfulBackupAt: snapshot.backup.lastSuccessfulBackupAt,
    dailyReportsSinceLastBackup: snapshot.backup.dailyReportsSinceLastBackup,
    hasUnsavedChanges: snapshot.backup.hasUnsavedChanges,
    settingsCapturedAt: snapshot.settings.current.capturedAt,
    onboardingCompletedStepCount: snapshot.onboarding.completedStepIds.length,
    weeklyHashCount: Object.keys(snapshot.reports.weeklyHashes).length,
    weeklyReportCount: Object.keys(snapshot.reports.weeklyReports).length,
    dailyReportCount: Object.keys(snapshot.reports.dailyReports).length,
  });
}

export function createDatabaseBackupImportPreview(input: {
  id: string;
  createdAt: string;
  current: AppMetadata;
  incoming: AppMetadata;
  warning?: string;
}): DatabaseBackupImportPreview {
  const conflictSummary = summarizeReportConflicts(
    input.current.reports,
    input.incoming.reports,
  );

  return DatabaseBackupImportPreviewSchema.parse({
    id: input.id,
    createdAt: input.createdAt,
    current: summarizeDatabaseBackup(input.current),
    incoming: summarizeDatabaseBackup(input.incoming),
    conflictSummary,
    defaultConflictStrategy: 'latest-timestamp',
    availableConflictStrategies: ['latest-timestamp', 'local', 'backup'],
    warning:
      input.warning ??
      'Vor dem Import wird automatisch ein lokaler Recovery-Snapshot erstellt. Bei Konflikten ist latest-timestamp die Standardstrategie.',
  });
}