import { z } from 'zod';

import { AppSessionSchema } from '@/shared/auth/session';
import { BackupStateSchema, createBackupState } from '@/shared/backup/policy';
import { DrivePermissionStateSchema } from '@/shared/drive/permissions';
import {
  OnboardingProgressSchema,
  createOnboardingProgress,
} from '@/shared/onboarding/progress';
import {
  ReportsStateSchema,
  createDefaultReportsState,
} from '@/shared/reports/models';
import {
  SettingsImportPreviewSchema,
  SettingsSnapshotSchema,
  createSettingsSnapshot,
} from '@/shared/settings/schema';

export const PendingBackupImportStateSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  serializedEnvelope: z.string().min(1),
});

export const AppUiStateSchema = z.object({
  isFullScreen: z.boolean().default(false),
});

export const AppMetadataSchema = z.object({
  version: z.literal(1),
  auth: z.object({
    persistedSession: AppSessionSchema.nullable().default(null),
  }),
  drive: DrivePermissionStateSchema,
  backup: BackupStateSchema,
  recovery: z.object({
    pendingBackupImport:
      PendingBackupImportStateSchema.nullable().default(null),
    lastRecoverySnapshotPath: z.string().min(1).nullable().default(null),
    lastRestoredAt: z.string().datetime().nullable().default(null),
  }),
  onboarding: OnboardingProgressSchema,
  settings: z.object({
    current: SettingsSnapshotSchema,
    lastExportedAt: z.string().datetime().nullable().default(null),
    pendingImport: SettingsImportPreviewSchema.nullable().default(null),
  }),
  reports: ReportsStateSchema,
  ui: AppUiStateSchema.default({
    isFullScreen: false,
  }),
});

export type AppMetadata = z.infer<typeof AppMetadataSchema>;
export type PendingBackupImportState = z.infer<
  typeof PendingBackupImportStateSchema
>;
export type AppUiState = z.infer<typeof AppUiStateSchema>;

export function createDefaultAppMetadata(now: string): AppMetadata {
  return AppMetadataSchema.parse({
    version: 1,
    auth: {
      persistedSession: null,
    },
    drive: {
      requiredScopes: [],
      grantedScopes: [],
      account: null,
      accessToken: null,
      refreshToken: null,
      connectedAt: null,
      lastValidatedAt: null,
      lastPromptedAt: null,
      explanation: null,
    },
    backup: createBackupState(),
    recovery: {
      pendingBackupImport: null,
      lastRecoverySnapshotPath: null,
      lastRestoredAt: null,
    },
    onboarding: createOnboardingProgress(now),
    settings: {
      current: createSettingsSnapshot({
        id: 'settings-current',
        schemaVersion: 1,
        capturedAt: now,
        values: {},
      }),
      lastExportedAt: null,
      pendingImport: null,
    },
    reports: createDefaultReportsState(),
    ui: {
      isFullScreen: false,
    },
  });
}
