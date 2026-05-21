import { contextBridge, ipcRenderer } from 'electron';

import { AppApi, AppIpcChannel } from '@/shared/ipc/app-api';

const appApi: AppApi = {
  getBootstrapState: () => ipcRenderer.invoke(AppIpcChannel.getBootstrapState),
  getSettingsSnapshot: () =>
    ipcRenderer.invoke(AppIpcChannel.getSettingsSnapshot),
  getReportsState: () => ipcRenderer.invoke(AppIpcChannel.getReportsState),
  getAppBuildInfo: () => ipcRenderer.invoke(AppIpcChannel.getAppBuildInfo),
  checkForUpdates: () => ipcRenderer.invoke(AppIpcChannel.checkForUpdates),
  getWindowFullscreen: () =>
    ipcRenderer.invoke(AppIpcChannel.getWindowFullscreen),
  toggleWindowFullscreen: () =>
    ipcRenderer.invoke(AppIpcChannel.toggleWindowFullscreen),
  openJsonFileDialog: () =>
    ipcRenderer.invoke(AppIpcChannel.openJsonFileDialog),
  saveJsonFileDialog: (input) =>
    ipcRenderer.invoke(AppIpcChannel.saveJsonFileDialog, input),
  exportWeeklyReportPdf: (input) =>
    ipcRenderer.invoke(AppIpcChannel.exportWeeklyReportPdf, input),
  initializePasswordAuth: (input) =>
    ipcRenderer.invoke(AppIpcChannel.initializePasswordAuth, input),
  authenticateWithPassword: (input) =>
    ipcRenderer.invoke(AppIpcChannel.authenticateWithPassword, input),
  verifyPassword: (input) =>
    ipcRenderer.invoke(AppIpcChannel.verifyPassword, input),
  changePassword: (input) =>
    ipcRenderer.invoke(AppIpcChannel.changePassword, input),
  savePasswordSession: (input) =>
    ipcRenderer.invoke(AppIpcChannel.savePasswordSession, input),
  saveGoogleSession: (input) =>
    ipcRenderer.invoke(AppIpcChannel.saveGoogleSession, input),
  authenticateWithGoogle: (input) =>
    ipcRenderer.invoke(AppIpcChannel.authenticateWithGoogle, input),
  getPendingGoogleAuthorizationUrl: () =>
    ipcRenderer.invoke(AppIpcChannel.getPendingGoogleAuthorizationUrl),
  cancelPendingGoogleAuthorization: () =>
    ipcRenderer.invoke(AppIpcChannel.cancelPendingGoogleAuthorization),
  signOut: () => ipcRenderer.invoke(AppIpcChannel.signOut),
  clearGoogleSession: () =>
    ipcRenderer.invoke(AppIpcChannel.clearGoogleSession),
  setDriveScopes: (input) =>
    ipcRenderer.invoke(AppIpcChannel.setDriveScopes, input),
  grantDriveScopes: (input) =>
    ipcRenderer.invoke(AppIpcChannel.grantDriveScopes, input),
  connectGoogleDrive: () =>
    ipcRenderer.invoke(AppIpcChannel.connectGoogleDrive),
  uploadBackupToDrive: (input) =>
    ipcRenderer.invoke(AppIpcChannel.uploadBackupToDrive, input),
  uploadSettingsBackupToDrive: (input) =>
    ipcRenderer.invoke(AppIpcChannel.uploadSettingsBackupToDrive, input),
  listDriveBackups: () => ipcRenderer.invoke(AppIpcChannel.listDriveBackups),
  listDriveSettingsBackups: () =>
    ipcRenderer.invoke(AppIpcChannel.listDriveSettingsBackups),
  getDriveBackupFolder: (input) =>
    ipcRenderer.invoke(AppIpcChannel.getDriveBackupFolder, input),
  prepareDriveBackupImport: (input) =>
    ipcRenderer.invoke(AppIpcChannel.prepareDriveBackupImport, input),
  prepareDriveSettingsImport: (input) =>
    ipcRenderer.invoke(AppIpcChannel.prepareDriveSettingsImport, input),
  syncAbsenceCatalog: () =>
    ipcRenderer.invoke(AppIpcChannel.syncAbsenceCatalog),
  dismissAbsenceSync: () =>
    ipcRenderer.invoke(AppIpcChannel.dismissAbsenceSync),
  triggerAbsenceSyncPrompt: () =>
    ipcRenderer.invoke(AppIpcChannel.triggerAbsenceSyncPrompt),
  requestManualBackup: () =>
    ipcRenderer.invoke(AppIpcChannel.requestManualBackup),
  recordDailyReport: () => ipcRenderer.invoke(AppIpcChannel.recordDailyReport),
  registerBackupSuccess: () =>
    ipcRenderer.invoke(AppIpcChannel.registerBackupSuccess),
  exportSettings: (input) =>
    ipcRenderer.invoke(AppIpcChannel.exportSettings, input),
  prepareSettingsImport: (serialized, decryption) =>
    ipcRenderer.invoke(
      AppIpcChannel.prepareSettingsImport,
      serialized,
      decryption,
    ),
  cancelSettingsImport: () =>
    ipcRenderer.invoke(AppIpcChannel.cancelSettingsImport),
  applySettingsImport: (input) =>
    ipcRenderer.invoke(AppIpcChannel.applySettingsImport, input),
  exportBackupArchive: (input) =>
    ipcRenderer.invoke(AppIpcChannel.exportBackupArchive, input),
  prepareBackupImport: (serialized, decryption) =>
    ipcRenderer.invoke(
      AppIpcChannel.prepareBackupImport,
      serialized,
      decryption,
    ),
  cancelBackupImport: () =>
    ipcRenderer.invoke(AppIpcChannel.cancelBackupImport),
  applyBackupImport: (input) =>
    ipcRenderer.invoke(AppIpcChannel.applyBackupImport, input),
  upsertWeeklyReport: (input) =>
    ipcRenderer.invoke(AppIpcChannel.upsertWeeklyReport, input),
  deleteWeeklyReport: (input) =>
    ipcRenderer.invoke(AppIpcChannel.deleteWeeklyReport, input),
  upsertDailyReport: (input) =>
    ipcRenderer.invoke(AppIpcChannel.upsertDailyReport, input),
  deleteDailyReport: (input) =>
    ipcRenderer.invoke(AppIpcChannel.deleteDailyReport, input),
  setSettingsValues: (values) =>
    ipcRenderer.invoke(AppIpcChannel.setSettingsValues, values),
  saveOnboardingDraft: (input) =>
    ipcRenderer.invoke(AppIpcChannel.saveOnboardingDraft, input),
  completeOnboardingStep: (stepId) =>
    ipcRenderer.invoke(AppIpcChannel.completeOnboardingStep, stepId),
  skipOnboardingStep: (stepId) =>
    ipcRenderer.invoke(AppIpcChannel.skipOnboardingStep, stepId),
  registerWeeklyReportHash: (input) =>
    ipcRenderer.invoke(AppIpcChannel.registerWeeklyReportHash, input),
  setAppDirtyState: (isDirty) =>
    ipcRenderer.invoke(AppIpcChannel.setAppDirtyState, isDirty),
  handleRendererError: (input) =>
    ipcRenderer.invoke(AppIpcChannel.handleRendererError, input),
};

const electronHandler = {
  app: appApi,
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
