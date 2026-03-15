import { contextBridge, ipcRenderer } from 'electron';

import { AppApi, AppIpcChannel } from '@/shared/ipc/app-api';

const appApi: AppApi = {
  getBootstrapState: () => ipcRenderer.invoke(AppIpcChannel.getBootstrapState),
  getSettingsSnapshot: () =>
    ipcRenderer.invoke(AppIpcChannel.getSettingsSnapshot),
  getReportsState: () => ipcRenderer.invoke(AppIpcChannel.getReportsState),
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
  changePassword: (input) =>
    ipcRenderer.invoke(AppIpcChannel.changePassword, input),
  savePasswordSession: (input) =>
    ipcRenderer.invoke(AppIpcChannel.savePasswordSession, input),
  saveGoogleSession: (input) =>
    ipcRenderer.invoke(AppIpcChannel.saveGoogleSession, input),
  authenticateWithGoogle: (input) =>
    ipcRenderer.invoke(AppIpcChannel.authenticateWithGoogle, input),
  clearGoogleSession: () =>
    ipcRenderer.invoke(AppIpcChannel.clearGoogleSession),
  setDriveScopes: (input) =>
    ipcRenderer.invoke(AppIpcChannel.setDriveScopes, input),
  grantDriveScopes: (input) =>
    ipcRenderer.invoke(AppIpcChannel.grantDriveScopes, input),
  connectGoogleDrive: () =>
    ipcRenderer.invoke(AppIpcChannel.connectGoogleDrive),
  uploadBackupToDrive: () =>
    ipcRenderer.invoke(AppIpcChannel.uploadBackupToDrive),
  listDriveBackups: () => ipcRenderer.invoke(AppIpcChannel.listDriveBackups),
  prepareDriveBackupImport: (input) =>
    ipcRenderer.invoke(AppIpcChannel.prepareDriveBackupImport, input),
  syncAbsenceCatalog: () =>
    ipcRenderer.invoke(AppIpcChannel.syncAbsenceCatalog),
  requestManualBackup: () =>
    ipcRenderer.invoke(AppIpcChannel.requestManualBackup),
  recordDailyReport: () => ipcRenderer.invoke(AppIpcChannel.recordDailyReport),
  registerBackupSuccess: () =>
    ipcRenderer.invoke(AppIpcChannel.registerBackupSuccess),
  exportSettings: () => ipcRenderer.invoke(AppIpcChannel.exportSettings),
  prepareSettingsImport: (serialized) =>
    ipcRenderer.invoke(AppIpcChannel.prepareSettingsImport, serialized),
  cancelSettingsImport: () =>
    ipcRenderer.invoke(AppIpcChannel.cancelSettingsImport),
  applySettingsImport: (input) =>
    ipcRenderer.invoke(AppIpcChannel.applySettingsImport, input),
  exportBackupArchive: () =>
    ipcRenderer.invoke(AppIpcChannel.exportBackupArchive),
  prepareBackupImport: (serialized) =>
    ipcRenderer.invoke(AppIpcChannel.prepareBackupImport, serialized),
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
};

const electronHandler = {
  app: appApi,
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
