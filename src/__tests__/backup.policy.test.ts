import {
  createBackupState,
  deriveBackupStatus,
  registerBackupSuccess,
  registerDailyReportForBackup,
  registerLaunchBackupCheck,
  requestManualBackup,
} from '@/shared/backup/policy';

describe('backup policy', () => {
  it('requests a backup after ten daily reports', () => {
    let state = createBackupState();

    for (let index = 0; index < 10; index += 1) {
      state = registerDailyReportForBackup(state);
    }

    const status = deriveBackupStatus(state);

    expect(status.isBackupRequired).toBe(true);
    expect(status.pendingReasons).toContain('daily-report-threshold');
    expect(status.dailyReportsSinceLastBackup).toBe(10);
  });

  it('keeps dirty changes for app-start backups and resets on success', () => {
    const dirtyState = requestManualBackup(createBackupState());
    const launchState = registerLaunchBackupCheck(dirtyState);
    const backupState = registerBackupSuccess(
      launchState,
      '2026-03-13T11:00:00.000Z',
    );

    expect(launchState.pendingReasons).toContain('manual');
    expect(launchState.pendingReasons).toContain('app-start-dirty');
    expect(backupState.pendingReasons).toHaveLength(0);
    expect(backupState.hasUnsavedChanges).toBe(false);
  });
});
