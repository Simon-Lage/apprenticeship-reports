import { ipcMain } from 'electron';

import { AppKernel } from '@/main/services/AppKernel';
import { JsonObjectSchema } from '@/shared/common/json';
import {
  AppIpcChannel,
  ApplyBackupImportInputSchema,
  ApplySettingsImportInputSchema,
  AuthenticateWithGoogleInputSchema,
  AuthenticateWithPasswordInputSchema,
  ChangePasswordInputSchema,
  DeleteDailyReportInputSchema,
  DeleteWeeklyReportInputSchema,
  GrantDriveScopesInputSchema,
  InitializePasswordAuthInputSchema,
  PrepareDriveBackupImportInputSchema,
  RegisterWeeklyReportHashInputSchema,
  SaveGoogleSessionInputSchema,
  SaveOnboardingDraftInputSchema,
  SavePasswordSessionInputSchema,
  SetDriveScopesInputSchema,
  UpsertDailyReportInputSchema,
  UpsertWeeklyReportInputSchema,
} from '@/shared/ipc/app-api';

export function registerAppHandlers(appKernel: AppKernel): void {
  ipcMain.handle(AppIpcChannel.getBootstrapState, () =>
    appKernel.getBootstrapState(),
  );
  ipcMain.handle(AppIpcChannel.getSettingsSnapshot, () =>
    appKernel.getSettingsSnapshot(),
  );
  ipcMain.handle(AppIpcChannel.getReportsState, () => appKernel.getReportsState());

  ipcMain.handle(AppIpcChannel.initializePasswordAuth, (_event, input) =>
    appKernel.initializePasswordAuth(
      InitializePasswordAuthInputSchema.parse(input),
    ),
  );

  ipcMain.handle(AppIpcChannel.authenticateWithPassword, (_event, input) =>
    appKernel.authenticateWithPassword(
      AuthenticateWithPasswordInputSchema.parse(input),
    ),
  );

  ipcMain.handle(AppIpcChannel.changePassword, (_event, input) =>
    appKernel.changePassword(ChangePasswordInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.savePasswordSession, (_event, input) =>
    appKernel.savePasswordSession(SavePasswordSessionInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.saveGoogleSession, (_event, input) =>
    appKernel.saveGoogleSession(SaveGoogleSessionInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.authenticateWithGoogle, (_event, input) =>
    appKernel.authenticateWithGoogle(
      AuthenticateWithGoogleInputSchema.parse(input),
    ),
  );

  ipcMain.handle(AppIpcChannel.clearGoogleSession, () =>
    appKernel.clearGoogleSession(),
  );

  ipcMain.handle(AppIpcChannel.setDriveScopes, (_event, input) =>
    appKernel.setDriveScopes(SetDriveScopesInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.grantDriveScopes, (_event, input) =>
    appKernel.grantDriveScopes(GrantDriveScopesInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.connectGoogleDrive, () =>
    appKernel.connectGoogleDrive(),
  );

  ipcMain.handle(AppIpcChannel.uploadBackupToDrive, () =>
    appKernel.uploadBackupToDrive(),
  );

  ipcMain.handle(AppIpcChannel.listDriveBackups, () =>
    appKernel.listDriveBackups(),
  );

  ipcMain.handle(AppIpcChannel.prepareDriveBackupImport, (_event, input) =>
    appKernel.prepareDriveBackupImport(
      PrepareDriveBackupImportInputSchema.parse(input),
    ),
  );

  ipcMain.handle(AppIpcChannel.requestManualBackup, () =>
    appKernel.requestManualBackup(),
  );

  ipcMain.handle(AppIpcChannel.recordDailyReport, () =>
    appKernel.recordDailyReport(),
  );

  ipcMain.handle(AppIpcChannel.registerBackupSuccess, () =>
    appKernel.registerBackupSuccess(),
  );

  ipcMain.handle(AppIpcChannel.exportSettings, () =>
    appKernel.exportSettings(),
  );

  ipcMain.handle(AppIpcChannel.prepareSettingsImport, (_event, serialized) =>
    appKernel.prepareSettingsImport(String(serialized)),
  );

  ipcMain.handle(AppIpcChannel.cancelSettingsImport, () =>
    appKernel.cancelSettingsImport(),
  );

  ipcMain.handle(AppIpcChannel.applySettingsImport, (_event, input) =>
    appKernel.applySettingsImport(ApplySettingsImportInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.exportBackupArchive, () =>
    appKernel.exportBackupArchive(),
  );

  ipcMain.handle(AppIpcChannel.prepareBackupImport, (_event, serialized) =>
    appKernel.prepareBackupImport(String(serialized)),
  );

  ipcMain.handle(AppIpcChannel.cancelBackupImport, () =>
    appKernel.cancelBackupImport(),
  );

  ipcMain.handle(AppIpcChannel.applyBackupImport, (_event, input) =>
    appKernel.applyBackupImport(ApplyBackupImportInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.upsertWeeklyReport, (_event, input) =>
    appKernel.upsertWeeklyReport(UpsertWeeklyReportInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.deleteWeeklyReport, (_event, input) =>
    appKernel.deleteWeeklyReport(DeleteWeeklyReportInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.upsertDailyReport, (_event, input) =>
    appKernel.upsertDailyReport(UpsertDailyReportInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.deleteDailyReport, (_event, input) =>
    appKernel.deleteDailyReport(DeleteDailyReportInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.setSettingsValues, (_event, values) =>
    appKernel.setSettingsValues(JsonObjectSchema.parse(values)),
  );

  ipcMain.handle(AppIpcChannel.saveOnboardingDraft, (_event, input) =>
    appKernel.saveOnboardingDraft(SaveOnboardingDraftInputSchema.parse(input)),
  );

  ipcMain.handle(AppIpcChannel.completeOnboardingStep, (_event, stepId) =>
    appKernel.completeOnboardingStep(String(stepId)),
  );

  ipcMain.handle(AppIpcChannel.skipOnboardingStep, (_event, stepId) =>
    appKernel.skipOnboardingStep(String(stepId)),
  );

  ipcMain.handle(AppIpcChannel.registerWeeklyReportHash, (_event, input) =>
    appKernel.registerWeeklyReportHash(
      RegisterWeeklyReportHashInputSchema.parse(input),
    ),
  );
}
