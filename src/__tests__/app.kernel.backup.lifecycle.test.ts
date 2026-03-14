import { useAppKernelTestHarness } from '@/src/test-utils/app-kernel-test-harness';

describe('app kernel backup lifecycle', () => {
  const {
    createKernel,
    signIn,
    completeRequiredOnboarding,
    setCurrentTime,
    writeReportsFixture,
  } = useAppKernelTestHarness();

  async function seedWeeklyReport(repository: Awaited<ReturnType<typeof createKernel>>['repository']) {
    await writeReportsFixture(repository, {
      weeklyReports: [
        {
          id: 'week-1',
          weekStart: '2026-03-09',
          weekEnd: '2026-03-13',
          updatedAt: '2026-03-13T10:00:00.000Z',
          dailyReports: [
            {
              id: 'day-1',
              date: '2026-03-09',
              updatedAt: '2026-03-13T10:00:00.000Z',
            },
          ],
        },
      ],
    });
  }

  it('registers an app-close backup trigger when unsaved changes exist', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await kernel.setSettingsValues({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
      backup: {
        enabled: true,
      },
    });

    await kernel.handleAppClose();

    const persistedState = await repository.read();

    expect(persistedState.backup.pendingReasons).toContain('app-close');
  });

  it('uploads a pending backup on app start when the persisted session and drive access are ready', async () => {
    const driveService = {
      authorizeConnection: jest.fn(async (permissionState) => ({
        accessToken: permissionState.accessToken ?? 'drive-token',
        grantedScopes: permissionState.grantedScopes,
      })),
      uploadBackup: jest.fn(async ({ exportedAt }) => ({
        file: {
          id: 'drive-file-1',
          name: `apprep-backup-${exportedAt}.json`,
          mimeType: 'application/json',
          createdAt: exportedAt,
          modifiedAt: exportedAt,
          size: '128',
        },
        accessToken: 'drive-token',
        grantedScopes: ['scope:drive'],
      })),
    };
    const { kernel, repository } = createKernel({
      googleDriveService: driveService,
    });
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedWeeklyReport(repository);
    await kernel.setSettingsValues({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
      backup: {
        enabled: true,
      },
    });

    setCurrentTime('2026-03-13T10:30:00.000Z');

    const { kernel: restartedKernel, repository: restartedRepository } =
      createKernel({
      googleDriveService: driveService,
    });
    const bootstrap = await restartedKernel.boot();
    const persistedState = await restartedRepository.read();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(1);
    expect(bootstrap.backup.hasUnsavedChanges).toBe(false);
    expect(bootstrap.backup.pendingReasons).toEqual([]);
    expect(bootstrap.backup.lastSuccessfulBackupAt).toBe(
      '2026-03-13T10:30:00.000Z',
    );
    expect(persistedState.backup.lastSuccessfulBackupAt).toBe(
      '2026-03-13T10:30:00.000Z',
    );
  });

  it('uploads a pending backup on app close when drive access is already available', async () => {
    const driveService = {
      authorizeConnection: jest.fn(async (permissionState) => ({
        accessToken: permissionState.accessToken ?? 'drive-token',
        grantedScopes: permissionState.grantedScopes,
      })),
      uploadBackup: jest.fn(async ({ exportedAt }) => ({
        file: {
          id: 'drive-file-2',
          name: `apprep-backup-${exportedAt}.json`,
          mimeType: 'application/json',
          createdAt: exportedAt,
          modifiedAt: exportedAt,
          size: '256',
        },
        accessToken: 'drive-token',
        grantedScopes: ['scope:drive'],
      })),
    };
    const { kernel, repository } = createKernel({
      googleDriveService: driveService,
    });
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedWeeklyReport(repository);
    await kernel.setSettingsValues({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
      backup: {
        enabled: true,
      },
    });

    setCurrentTime('2026-03-13T10:45:00.000Z');

    await kernel.handleAppClose();

    const persistedState = await repository.read();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(1);
    expect(persistedState.backup.hasUnsavedChanges).toBe(false);
    expect(persistedState.backup.pendingReasons).toEqual([]);
    expect(persistedState.backup.lastSuccessfulBackupAt).toBe(
      '2026-03-13T10:45:00.000Z',
    );
  });

  it('uploads a backup automatically after the tenth daily report since the last backup', async () => {
    const driveService = {
      authorizeConnection: jest.fn(async (permissionState) => ({
        accessToken: permissionState.accessToken ?? 'drive-token',
        grantedScopes: permissionState.grantedScopes,
      })),
      uploadBackup: jest.fn(async ({ exportedAt }) => ({
        file: {
          id: 'drive-file-3',
          name: `apprep-backup-${exportedAt}.json`,
          mimeType: 'application/json',
          createdAt: exportedAt,
          modifiedAt: exportedAt,
          size: '512',
        },
        accessToken: 'drive-token',
        grantedScopes: ['scope:drive'],
      })),
    };
    const { kernel, repository } = createKernel({
      googleDriveService: driveService,
    });
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedWeeklyReport(repository);

    for (let index = 0; index < 9; index += 1) {
      await kernel.recordDailyReport();
    }

    let persistedState = await repository.read();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(0);
    expect(persistedState.backup.dailyReportsSinceLastBackup).toBe(9);
    expect(persistedState.backup.hasUnsavedChanges).toBe(true);

    setCurrentTime('2026-03-13T11:00:00.000Z');

    const bootstrap = await kernel.recordDailyReport();
    persistedState = await repository.read();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(1);
    expect(bootstrap.backup.dailyReportsSinceLastBackup).toBe(0);
    expect(bootstrap.backup.hasUnsavedChanges).toBe(false);
    expect(persistedState.backup.pendingReasons).toEqual([]);
    expect(persistedState.backup.lastSuccessfulBackupAt).toBe(
      '2026-03-13T11:00:00.000Z',
    );
  });
});
