import { useAppKernelTestHarness } from '@/src/test-utils/app-kernel-test-harness';

jest.setTimeout(15_000);

describe('app kernel backup lifecycle', () => {
  const {
    createKernel,
    signIn,
    completeRequiredOnboarding,
    setCurrentTime,
    writeReportsFixture,
  } = useAppKernelTestHarness();

  function createBackupLifecycleKernel(
    options?: Parameters<typeof createKernel>[0],
  ): ReturnType<typeof createKernel> {
    return createKernel({
      ...options,
      repositoryKind: 'memory',
    });
  }

  async function seedWeeklyReport(
    repository: Awaited<ReturnType<typeof createKernel>>['repository'],
  ) {
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

  function createDriveServiceMock(fileId: string, size: string) {
    return {
      authorizeConnection: jest.fn(async (permissionState) => ({
        accessToken: permissionState.accessToken ?? 'drive-token',
        grantedScopes: permissionState.grantedScopes,
      })),
      ensureBackupRecoveryKey: jest.fn(async ({ serializedKey }) => ({
        file: {
          id: 'recovery-key-file',
          name: 'apprep-backup-recovery-key.json',
          mimeType: 'application/json',
          createdAt: '2026-03-13T10:00:00.000Z',
          modifiedAt: '2026-03-13T10:00:00.000Z',
          size: String(serializedKey.length),
        },
        accessToken: 'drive-token',
        grantedScopes: ['scope:drive'],
      })),
      uploadBackup: jest.fn(async ({ exportedAt }) => ({
        file: {
          id: fileId,
          name: `apprep-backup-encrypted-${exportedAt}.json`,
          mimeType: 'application/json',
          createdAt: exportedAt,
          modifiedAt: exportedAt,
          size,
        },
        accessToken: 'drive-token',
        grantedScopes: ['scope:drive'],
      })),
    };
  }

  it('registers an app-close backup trigger when unsaved changes exist', async () => {
    const { kernel, repository } = createBackupLifecycleKernel();
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

  it('keeps app start non-blocking and processes launch backup afterwards', async () => {
    const driveService = createDriveServiceMock('drive-file-1', '128');
    const { kernel, repository } = createBackupLifecycleKernel({
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
      createBackupLifecycleKernel({
        googleDriveService: driveService,
      });
    const bootstrap = await restartedKernel.boot();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(0);
    expect(bootstrap.backup.pendingReasons).toContain('app-start-dirty');

    const processedBootstrap =
      await restartedKernel.processPendingLaunchBackup();
    const persistedState = await restartedRepository.read();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(1);
    expect(processedBootstrap.backup.hasUnsavedChanges).toBe(false);
    expect(processedBootstrap.backup.pendingReasons).toEqual([]);
    expect(processedBootstrap.backup.lastSuccessfulBackupAt).toBe(
      '2026-03-13T10:30:00.000Z',
    );
    expect(persistedState.backup.lastSuccessfulBackupAt).toBe(
      '2026-03-13T10:30:00.000Z',
    );
  });

  it('processes a pending startup backup after a later password login', async () => {
    const driveService = createDriveServiceMock('drive-file-login-1', '384');
    const { kernel, repository } = createBackupLifecycleKernel({
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
    await kernel.signOut();

    const { kernel: restartedKernel, repository: restartedRepository } =
      createBackupLifecycleKernel({
        googleDriveService: driveService,
      });
    const stateAfterBoot = await restartedKernel.boot();

    expect(stateAfterBoot.database.status).toBe('locked');
    expect(driveService.uploadBackup).toHaveBeenCalledTimes(0);

    setCurrentTime('2026-03-13T12:00:00.000Z');

    const stateAfterLogin = await restartedKernel.authenticateWithPassword({
      password: 'CorrectHorse1',
      rememberMe: true,
    });
    const persistedState = await restartedRepository.read();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(1);
    expect(stateAfterLogin.backup.pendingReasons).toEqual([]);
    expect(stateAfterLogin.backup.hasUnsavedChanges).toBe(false);
    expect(persistedState.backup.lastSuccessfulBackupAt).toBe(
      '2026-03-13T12:00:00.000Z',
    );
  });

  it('uploads a pending backup on app close when drive access is already available', async () => {
    const driveService = createDriveServiceMock('drive-file-2', '256');
    const { kernel, repository } = createBackupLifecycleKernel({
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
    const driveService = createDriveServiceMock('drive-file-3', '512');
    const { kernel, repository } = createBackupLifecycleKernel({
      googleDriveService: driveService,
    });
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedWeeklyReport(repository);

    await Array.from({ length: 9 }).reduce<Promise<void>>(async (previous) => {
      await previous;
      await kernel.recordDailyReport();
    }, Promise.resolve());

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

  it('uploads a manual backup immediately when drive access is available', async () => {
    const driveService = createDriveServiceMock('drive-file-manual-1', '640');
    const { kernel, repository } = createBackupLifecycleKernel({
      googleDriveService: driveService,
    });
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedWeeklyReport(repository);
    setCurrentTime('2026-03-13T12:10:00.000Z');

    const bootstrap = await kernel.requestManualBackup();
    const persistedState = await repository.read();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(1);
    expect(bootstrap.backup.pendingReasons).toEqual([]);
    expect(bootstrap.backup.hasUnsavedChanges).toBe(false);
    expect(persistedState.backup.lastSuccessfulBackupAt).toBe(
      '2026-03-13T12:10:00.000Z',
    );
  });
});
