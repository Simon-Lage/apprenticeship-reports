import { z } from 'zod';

import {
  DatabaseBackupEnvelope,
  DatabaseBackupImportPreview,
} from '@/shared/app/backup-archive';
import { AppBootstrapState } from '@/shared/app/bootstrap';
import { JsonObject, JsonObjectSchema } from '@/shared/common/json';
import { DriveBackupFile } from '@/shared/drive/backups';
import {
  BackupConflictStrategy,
  BackupConflictStrategySchema,
} from '@/shared/reports/models';
import { WeeklyReportHashRecord } from '@/shared/reports/stable';
import {
  SettingsExportEnvelope,
  SettingsImportPreview,
} from '@/shared/settings/schema';

export const AppIpcChannel = {
  getBootstrapState: 'app:get-bootstrap-state',
  initializePasswordAuth: 'app:initialize-password-auth',
  authenticateWithPassword: 'app:authenticate-with-password',
  changePassword: 'app:change-password',
  savePasswordSession: 'app:save-password-session',
  saveGoogleSession: 'app:save-google-session',
  authenticateWithGoogle: 'app:authenticate-with-google',
  clearGoogleSession: 'app:clear-google-session',
  setDriveScopes: 'app:set-drive-scopes',
  grantDriveScopes: 'app:grant-drive-scopes',
  connectGoogleDrive: 'app:connect-google-drive',
  uploadBackupToDrive: 'app:upload-backup-to-drive',
  listDriveBackups: 'app:list-drive-backups',
  prepareDriveBackupImport: 'app:prepare-drive-backup-import',
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
  setSettingsValues: 'app:set-settings-values',
  saveOnboardingDraft: 'app:save-onboarding-draft',
  completeOnboardingStep: 'app:complete-onboarding-step',
  skipOnboardingStep: 'app:skip-onboarding-step',
  registerWeeklyReportHash: 'app:register-weekly-report-hash',
} as const;

const PasswordSecretSchema = z.string().min(8).max(128);

export const InitializePasswordAuthInputSchema = z.object({
  password: PasswordSecretSchema,
  rememberMe: z.boolean(),
});

export const AuthenticateWithPasswordInputSchema = z.object({
  password: PasswordSecretSchema,
  rememberMe: z.boolean(),
});

export const ChangePasswordInputSchema = z.object({
  currentPassword: PasswordSecretSchema,
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
});

export const PrepareDriveBackupImportInputSchema = z.object({
  fileId: z.string().min(1),
});

export const RegisterWeeklyReportHashInputSchema = z.object({
  weeklyReportId: z.string().min(1),
  payload: JsonObjectSchema,
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
export type RegisterWeeklyReportHashInput = z.infer<
  typeof RegisterWeeklyReportHashInputSchema
>;

export type AppApi = {
  getBootstrapState: () => Promise<AppBootstrapState>;
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
  clearGoogleSession: () => Promise<AppBootstrapState>;
  setDriveScopes: (input: SetDriveScopesInput) => Promise<AppBootstrapState>;
  grantDriveScopes: (
    input: GrantDriveScopesInput,
  ) => Promise<AppBootstrapState>;
  connectGoogleDrive: () => Promise<AppBootstrapState>;
  uploadBackupToDrive: () => Promise<DriveBackupFile>;
  listDriveBackups: () => Promise<DriveBackupFile[]>;
  prepareDriveBackupImport: (
    input: PrepareDriveBackupImportInput,
  ) => Promise<DatabaseBackupImportPreview>;
  requestManualBackup: () => Promise<AppBootstrapState>;
  recordDailyReport: () => Promise<AppBootstrapState>;
  registerBackupSuccess: () => Promise<AppBootstrapState>;
  exportSettings: () => Promise<SettingsExportEnvelope>;
  prepareSettingsImport: (serialized: string) => Promise<SettingsImportPreview>;
  cancelSettingsImport: () => Promise<AppBootstrapState>;
  applySettingsImport: (
    input: ApplySettingsImportInput,
  ) => Promise<AppBootstrapState>;
  exportBackupArchive: () => Promise<DatabaseBackupEnvelope>;
  prepareBackupImport: (
    serialized: string,
  ) => Promise<DatabaseBackupImportPreview>;
  cancelBackupImport: () => Promise<AppBootstrapState>;
  applyBackupImport: (
    input: ApplyBackupImportInput,
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
};

export type BackupImportConflictStrategy = BackupConflictStrategy;
