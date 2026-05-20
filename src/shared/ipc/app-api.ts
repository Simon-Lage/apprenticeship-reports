import { z } from 'zod';

import {
  DatabaseBackupEnvelope,
  DatabaseBackupImportPreview,
} from '@/shared/app/backup-archive';
import {
  BackupEncryptionModeSchema,
  EncryptedBackupEnvelope,
} from '@/shared/app/backup-encryption';
import { AppBootstrapState } from '@/shared/app/bootstrap';
import { JsonObject, JsonObjectSchema } from '@/shared/common/json';
import { DriveBackupFile } from '@/shared/drive/backups';
import { SettingsBackupScopeSchema } from '@/shared/backup/settings';
import {
  BackupConflictStrategy,
  BackupConflictStrategySchema,
  ReportsState,
} from '@/shared/reports/models';
import { WeeklyReportHashRecord } from '@/shared/reports/stable';
import {
  SettingsExportEnvelope,
  SettingsImportPreview,
  SettingsSnapshot,
} from '@/shared/settings/schema';

export const AppIpcChannel = {
  getBootstrapState: 'app:get-bootstrap-state',
  getSettingsSnapshot: 'app:get-settings-snapshot',
  getReportsState: 'app:get-reports-state',
  getAppBuildInfo: 'app:get-app-build-info',
  checkForUpdates: 'app:check-for-updates',
  getWindowFullscreen: 'app:get-window-fullscreen',
  toggleWindowFullscreen: 'app:toggle-window-fullscreen',
  openJsonFileDialog: 'app:open-json-file-dialog',
  saveJsonFileDialog: 'app:save-json-file-dialog',
  exportWeeklyReportPdf: 'app:export-weekly-report-pdf',
  initializePasswordAuth: 'app:initialize-password-auth',
  authenticateWithPassword: 'app:authenticate-with-password',
  changePassword: 'app:change-password',
  savePasswordSession: 'app:save-password-session',
  saveGoogleSession: 'app:save-google-session',
  authenticateWithGoogle: 'app:authenticate-with-google',
  getPendingGoogleAuthorizationUrl: 'app:get-pending-google-authorization-url',
  cancelPendingGoogleAuthorization: 'app:cancel-pending-google-authorization',
  signOut: 'app:sign-out',
  clearGoogleSession: 'app:clear-google-session',
  setDriveScopes: 'app:set-drive-scopes',
  grantDriveScopes: 'app:grant-drive-scopes',
  connectGoogleDrive: 'app:connect-google-drive',
  uploadBackupToDrive: 'app:upload-backup-to-drive',
  uploadSettingsBackupToDrive: 'app:upload-settings-backup-to-drive',
  listDriveBackups: 'app:list-drive-backups',
  listDriveSettingsBackups: 'app:list-drive-settings-backups',
  prepareDriveBackupImport: 'app:prepare-drive-backup-import',
  prepareDriveSettingsImport: 'app:prepare-drive-settings-import',
  syncAbsenceCatalog: 'app:sync-absence-catalog',
  dismissAbsenceSync: 'app:dismiss-absence-sync',
  triggerAbsenceSyncPrompt: 'app:trigger-absence-sync-prompt',
  requestManualBackup: 'app:request-manual-backup',
  recordDailyReport: 'app:record-daily-report',
  registerBackupSuccess: 'app:register-backup-success',
  exportSettings: 'app:export-settings',
  prepareSettingsImport: 'app:prepare-settings-import',
  cancelSettingsImport: 'app:cancel-settings-import',
  applySettingsImport: 'app:apply-settings-import',
  exportBackupArchive: 'app:export-backup-archive',
  prepareBackupImport: 'app:prepare-backup-import',
  cancelBackupImport: 'app:cancel-backup-import',
  applyBackupImport: 'app:apply-backup-import',
  upsertWeeklyReport: 'app:upsert-weekly-report',
  deleteWeeklyReport: 'app:delete-weekly-report',
  upsertDailyReport: 'app:upsert-daily-report',
  deleteDailyReport: 'app:delete-daily-report',
  setSettingsValues: 'app:set-settings-values',
  saveOnboardingDraft: 'app:save-onboarding-draft',
  completeOnboardingStep: 'app:complete-onboarding-step',
  skipOnboardingStep: 'app:skip-onboarding-step',
  registerWeeklyReportHash: 'app:register-weekly-report-hash',
  setAppDirtyState: 'app:set-app-dirty-state',
  handleRendererError: 'app:handle-renderer-error',
} as const;

const PasswordSecretSchema = z.string().min(8).max(128);
const PasswordLoginSchema = z.string().min(1).max(128);

export const InitializePasswordAuthInputSchema = z.object({
  password: PasswordSecretSchema,
  rememberMe: z.boolean(),
});

export const AuthenticateWithPasswordInputSchema = z.object({
  password: PasswordLoginSchema,
  rememberMe: z.boolean(),
});

export const ChangePasswordInputSchema = z.object({
  nextPassword: PasswordSecretSchema,
});

export const AuthenticateWithGoogleInputSchema = z.object({
  rememberMe: z.boolean(),
});

export const SavePasswordSessionInputSchema = z.object({
  account: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    displayName: z.string().min(1),
    avatarUrl: z.string().url().optional(),
  }),
  rememberMe: z.boolean(),
});

export const SaveGoogleSessionInputSchema = z.object({
  account: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    displayName: z.string().min(1),
    avatarUrl: z.string().url().optional(),
  }),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().min(1).optional(),
  grantedScopes: z.array(z.string().min(1)).optional().default([]),
  rememberMe: z.boolean(),
});

export const SetDriveScopesInputSchema = z.object({
  requiredScopes: z.array(z.string().min(1)),
  explanation: z.string().min(1).nullable().optional(),
});

export const GrantDriveScopesInputSchema = z.object({
  account: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    displayName: z.string().min(1),
    avatarUrl: z.string().url().optional(),
  }),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  grantedScopes: z.array(z.string().min(1)),
});

export const SaveOnboardingDraftInputSchema = z.object({
  stepId: z.string().min(1),
  values: JsonObjectSchema,
});

export const ApplySettingsImportInputSchema = z.object({
  previewId: z.string().min(1),
});

export const ApplyBackupImportInputSchema = z.object({
  previewId: z.string().min(1),
  conflictStrategy:
    BackupConflictStrategySchema.optional().default('latest-timestamp'),
  weekConflictResolutions: z
    .array(
      z.object({
        weekStart: z.string().date(),
        weekEnd: z.string().date(),
        strategy: BackupConflictStrategySchema,
      }),
    )
    .optional()
    .default([]),
});

export const BackupImportDecryptionInputSchema = z
  .discriminatedUnion('method', [
    z.object({
      method: z.literal('password'),
      password: z.string().min(1).max(128),
    }),
    z.object({
      method: z.literal('google'),
    }),
  ])
  .optional();

export const PrepareDriveBackupImportInputSchema = z.object({
  fileId: z.string().min(1),
  decryption: BackupImportDecryptionInputSchema,
});

export const ExportSettingsInputSchema = z
  .object({
    scope: SettingsBackupScopeSchema.optional(),
    encryptionMode: BackupEncryptionModeSchema.optional().default('encrypted'),
  })
  .optional()
  .default({ encryptionMode: 'encrypted' });

export const ExportBackupArchiveInputSchema = z
  .object({
    encryptionMode: BackupEncryptionModeSchema.optional().default('encrypted'),
  })
  .optional()
  .default({ encryptionMode: 'encrypted' });

export const UpsertWeeklyReportInputSchema = z.object({
  weekStart: z.string().date(),
  weekEnd: z.string().date(),
  values: JsonObjectSchema.optional().default({}),
});

export const DeleteWeeklyReportInputSchema = z.object({
  weekStart: z.string().date(),
  weekEnd: z.string().date(),
});

export const UpsertDailyReportInputSchema = z.object({
  weekStart: z.string().date(),
  weekEnd: z.string().date(),
  date: z.string().date(),
  values: JsonObjectSchema,
});

export const DeleteDailyReportInputSchema = z.object({
  weekStart: z.string().date(),
  weekEnd: z.string().date(),
  date: z.string().date(),
});

export const RegisterWeeklyReportHashInputSchema = z.object({
  weeklyReportId: z.string().min(1),
});

export const SaveJsonFileDialogInputSchema = z.object({
  defaultFileName: z.string().trim().min(1),
  serialized: z.string().min(1),
});

export const ExportWeeklyReportPdfInputSchema = z.object({
  defaultFileName: z.string().trim().min(1),
  html: z.string().min(1),
});

export const RendererErrorInputSchema = z.object({
  source: z.enum(['react', 'window-error', 'unhandled-rejection']),
  message: z.string().trim().min(1).max(4000),
  stack: z.string().max(20000).nullable().optional(),
  componentStack: z.string().max(20000).nullable().optional(),
  route: z.string().max(1000),
  url: z.string().max(2000),
  restartApp: z.boolean(),
});

export type InitializePasswordAuthInput = z.input<
  typeof InitializePasswordAuthInputSchema
>;
export type AuthenticateWithPasswordInput = z.input<
  typeof AuthenticateWithPasswordInputSchema
>;
export type ChangePasswordInput = z.input<typeof ChangePasswordInputSchema>;
export type AuthenticateWithGoogleInput = z.input<
  typeof AuthenticateWithGoogleInputSchema
>;
export type SavePasswordSessionInput = z.input<
  typeof SavePasswordSessionInputSchema
>;
export type SaveGoogleSessionInput = z.input<
  typeof SaveGoogleSessionInputSchema
>;
export type SetDriveScopesInput = z.infer<typeof SetDriveScopesInputSchema>;
export type GrantDriveScopesInput = z.infer<typeof GrantDriveScopesInputSchema>;
export type SaveOnboardingDraftInput = z.infer<
  typeof SaveOnboardingDraftInputSchema
>;
export type ApplySettingsImportInput = z.infer<
  typeof ApplySettingsImportInputSchema
>;
export type ApplyBackupImportInput = z.input<
  typeof ApplyBackupImportInputSchema
>;
export type PrepareDriveBackupImportInput = z.infer<
  typeof PrepareDriveBackupImportInputSchema
>;
export type BackupImportDecryptionInput = z.infer<
  typeof BackupImportDecryptionInputSchema
>;
export type ExportSettingsInput = z.infer<typeof ExportSettingsInputSchema>;
export type ExportBackupArchiveInput = z.infer<
  typeof ExportBackupArchiveInputSchema
>;
export type UpsertWeeklyReportInput = z.infer<
  typeof UpsertWeeklyReportInputSchema
>;
export type DeleteWeeklyReportInput = z.infer<
  typeof DeleteWeeklyReportInputSchema
>;
export type UpsertDailyReportInput = z.infer<
  typeof UpsertDailyReportInputSchema
>;
export type DeleteDailyReportInput = z.infer<
  typeof DeleteDailyReportInputSchema
>;
export type RegisterWeeklyReportHashInput = z.infer<
  typeof RegisterWeeklyReportHashInputSchema
>;
export type SaveJsonFileDialogInput = z.infer<
  typeof SaveJsonFileDialogInputSchema
>;
export type ExportWeeklyReportPdfInput = z.infer<
  typeof ExportWeeklyReportPdfInputSchema
>;
export type RendererErrorInput = z.infer<typeof RendererErrorInputSchema>;

export type AppBuildInfo = {
  version: string;
  updatedAt: string | null;
};

export type AppUpdateUnavailableReason = 'not-packaged' | 'updater-not-ready';

export type AppUpdateCheckResult =
  | {
      started: true;
    }
  | {
      started: false;
      unavailableReason: AppUpdateUnavailableReason;
    };

export type AppApi = {
  getBootstrapState: () => Promise<AppBootstrapState>;
  getSettingsSnapshot: () => Promise<SettingsSnapshot>;
  getReportsState: () => Promise<ReportsState>;
  getAppBuildInfo: () => Promise<AppBuildInfo>;
  checkForUpdates: () => Promise<AppUpdateCheckResult>;
  getWindowFullscreen: () => Promise<boolean>;
  toggleWindowFullscreen: () => Promise<boolean>;
  openJsonFileDialog: () => Promise<string | null>;
  saveJsonFileDialog: (
    input: SaveJsonFileDialogInput,
  ) => Promise<string | null>;
  exportWeeklyReportPdf: (
    input: ExportWeeklyReportPdfInput,
  ) => Promise<string | null>;
  initializePasswordAuth: (
    input: InitializePasswordAuthInput,
  ) => Promise<AppBootstrapState>;
  authenticateWithPassword: (
    input: AuthenticateWithPasswordInput,
  ) => Promise<AppBootstrapState>;
  changePassword: (input: ChangePasswordInput) => Promise<AppBootstrapState>;
  savePasswordSession: (
    input: SavePasswordSessionInput,
  ) => Promise<AppBootstrapState>;
  saveGoogleSession: (
    input: SaveGoogleSessionInput,
  ) => Promise<AppBootstrapState>;
  authenticateWithGoogle: (
    input: AuthenticateWithGoogleInput,
  ) => Promise<AppBootstrapState>;
  getPendingGoogleAuthorizationUrl: () => Promise<string | null>;
  cancelPendingGoogleAuthorization: () => Promise<void>;
  signOut: () => Promise<AppBootstrapState>;
  clearGoogleSession: () => Promise<AppBootstrapState>;
  setDriveScopes: (input: SetDriveScopesInput) => Promise<AppBootstrapState>;
  grantDriveScopes: (
    input: GrantDriveScopesInput,
  ) => Promise<AppBootstrapState>;
  connectGoogleDrive: () => Promise<AppBootstrapState>;
  uploadBackupToDrive: (
    input?: ExportBackupArchiveInput,
  ) => Promise<DriveBackupFile>;
  uploadSettingsBackupToDrive: (
    input?: ExportSettingsInput,
  ) => Promise<DriveBackupFile>;
  listDriveBackups: () => Promise<DriveBackupFile[]>;
  listDriveSettingsBackups: () => Promise<DriveBackupFile[]>;
  prepareDriveBackupImport: (
    input: PrepareDriveBackupImportInput,
  ) => Promise<DatabaseBackupImportPreview>;
  prepareDriveSettingsImport: (
    input: PrepareDriveBackupImportInput,
  ) => Promise<SettingsImportPreview>;
  syncAbsenceCatalog: () => Promise<AppBootstrapState>;
  dismissAbsenceSync: () => Promise<AppBootstrapState>;
  triggerAbsenceSyncPrompt: () => Promise<AppBootstrapState>;
  requestManualBackup: () => Promise<AppBootstrapState>;
  recordDailyReport: () => Promise<AppBootstrapState>;
  registerBackupSuccess: () => Promise<AppBootstrapState>;
  exportSettings: (
    input?: ExportSettingsInput,
  ) => Promise<SettingsExportEnvelope | EncryptedBackupEnvelope>;
  prepareSettingsImport: (
    serialized: string,
    decryption?: BackupImportDecryptionInput,
  ) => Promise<SettingsImportPreview>;
  cancelSettingsImport: () => Promise<AppBootstrapState>;
  applySettingsImport: (
    input: ApplySettingsImportInput,
  ) => Promise<AppBootstrapState>;
  exportBackupArchive: (
    input?: ExportBackupArchiveInput,
  ) => Promise<DatabaseBackupEnvelope | EncryptedBackupEnvelope>;
  prepareBackupImport: (
    serialized: string,
    decryption?: BackupImportDecryptionInput,
  ) => Promise<DatabaseBackupImportPreview>;
  cancelBackupImport: () => Promise<AppBootstrapState>;
  applyBackupImport: (
    input: ApplyBackupImportInput,
  ) => Promise<AppBootstrapState>;
  upsertWeeklyReport: (
    input: UpsertWeeklyReportInput,
  ) => Promise<AppBootstrapState>;
  deleteWeeklyReport: (
    input: DeleteWeeklyReportInput,
  ) => Promise<AppBootstrapState>;
  upsertDailyReport: (
    input: UpsertDailyReportInput,
  ) => Promise<AppBootstrapState>;
  deleteDailyReport: (
    input: DeleteDailyReportInput,
  ) => Promise<AppBootstrapState>;
  setSettingsValues: (values: JsonObject) => Promise<AppBootstrapState>;
  saveOnboardingDraft: (
    input: SaveOnboardingDraftInput,
  ) => Promise<AppBootstrapState>;
  completeOnboardingStep: (stepId: string) => Promise<AppBootstrapState>;
  skipOnboardingStep: (stepId: string) => Promise<AppBootstrapState>;
  registerWeeklyReportHash: (
    input: RegisterWeeklyReportHashInput,
  ) => Promise<WeeklyReportHashRecord>;
  setAppDirtyState: (isDirty: boolean) => Promise<void>;
  handleRendererError: (input: RendererErrorInput) => Promise<void>;
};

export type BackupImportConflictStrategy = BackupConflictStrategy;
