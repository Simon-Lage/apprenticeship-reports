import { EncryptedBackupEnvelopeSchema } from '@/shared/app/backup-encryption';
import { useAppKernelTestHarness } from '@/src/test-utils/app-kernel-test-harness';

jest.setTimeout(15_000);

describe('app kernel encrypted backup archives', () => {
  const {
    createKernel,
    signIn,
    completeRequiredOnboarding,
    writeReportsFixture,
  } = useAppKernelTestHarness();

  function createBackupKernel(
    options?: Parameters<typeof createKernel>[0],
  ): ReturnType<typeof createKernel> {
    return createKernel({
      ...options,
      repositoryKind: 'memory',
    });
  }

  async function seedReport(
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
              values: {
                activity: 'encrypted-report',
              },
            },
          ],
        },
      ],
    });
  }

  function createDriveServiceMock() {
    const uploadedBackups: Record<string, string> = {};
    let recoveryKey = '';
    let uploadIndex = 0;
    const service = {
      authorizeConnection: jest.fn(async (permissionState) => ({
        accessToken: permissionState.accessToken ?? 'drive-token',
        grantedScopes: permissionState.grantedScopes,
      })),
      ensureBackupRecoveryKey: jest.fn(async ({ serializedKey }) => {
        recoveryKey = serializedKey;

        return {
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
        };
      }),
      uploadBackup: jest.fn(
        async ({
          serializedBackup,
          exportedAt,
          kind = 'reports',
          encrypted = false,
        }) => {
          uploadIndex += 1;
          const fileId = `${kind}-drive-backup-file-${uploadIndex}`;
          uploadedBackups[fileId] = serializedBackup;

          return {
            file: {
              id: fileId,
              name: `apprep-${kind}-${encrypted ? 'encrypted' : 'plain'}-${exportedAt}.json`,
              mimeType: 'application/json',
              createdAt: exportedAt,
              modifiedAt: exportedAt,
              size: String(serializedBackup.length),
            },
            accessToken: 'drive-token',
            grantedScopes: ['scope:drive'],
          };
        },
      ),
      downloadBackup: jest.fn(async ({ fileId }) => ({
        serializedBackup: uploadedBackups[fileId],
        accessToken: 'drive-token',
        grantedScopes: ['scope:drive'],
      })),
      downloadBackupRecoveryKey: jest.fn(async () => ({
        serializedKey: recoveryKey,
        accessToken: 'drive-token',
        grantedScopes: ['scope:drive'],
      })),
    };

    return {
      service,
      getUploadedBackup: (fileId: string) => uploadedBackups[fileId],
    };
  }

  it('exports reports encrypted by default and imports them with the password without local encryption state', async () => {
    const { kernel, repository } = createBackupKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedReport(repository);

    const envelope = await kernel.exportBackupArchive();
    const encrypted = EncryptedBackupEnvelopeSchema.parse(envelope);

    expect(encrypted.source).toBe('apprep-encrypted-backup');
    expect(encrypted.kind).toBe('reports');
    expect(JSON.stringify(encrypted)).not.toContain('encrypted-report');

    await repository.update((currentState) => ({
      ...currentState,
      backupEncryption: {
        version: 1,
        masterKey: null,
        passwordKeyWrap: null,
      },
    }));

    const preview = await kernel.prepareBackupImport(
      JSON.stringify(encrypted),
      {
        method: 'password',
        password: 'CorrectHorse1',
      },
    );

    expect(preview.incoming.weeklyReportCount).toBe(1);
  });

  it('imports a local encrypted report backup without requesting Google or the password again', async () => {
    const { kernel, repository } = createBackupKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedReport(repository);

    const envelope = await kernel.exportBackupArchive();
    const preview = await kernel.prepareBackupImport(JSON.stringify(envelope));

    expect(preview.incoming.weeklyReportCount).toBe(1);
  });

  it('rejects encrypted report imports with a wrong password', async () => {
    const { kernel, repository } = createBackupKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedReport(repository);

    const envelope = await kernel.exportBackupArchive();

    await expect(
      kernel.prepareBackupImport(JSON.stringify(envelope), {
        method: 'password',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(
      'Backup konnte mit diesem Passwort nicht entschlüsselt werden.',
    );
  });

  it('keeps plain report backups importable when explicitly selected', async () => {
    const { kernel, repository } = createBackupKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedReport(repository);

    const envelope = await kernel.exportBackupArchive({
      encryptionMode: 'plain',
    });
    const serialized = JSON.stringify(envelope);

    expect(serialized).toContain('encrypted-report');

    const preview = await kernel.prepareBackupImport(serialized);

    expect(preview.incoming.weeklyReportCount).toBe(1);
  });

  it('exports and imports encrypted settings with the password', async () => {
    const { kernel } = createBackupKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await kernel.setSettingsValues({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
    });

    const envelope = await kernel.exportSettings();
    const encrypted = EncryptedBackupEnvelopeSchema.parse(envelope);

    expect(encrypted.kind).toBe('settings');
    expect(JSON.stringify(encrypted)).not.toContain('Ada');

    const preview = await kernel.prepareSettingsImport(
      JSON.stringify(encrypted),
      {
        method: 'password',
        password: 'CorrectHorse1',
      },
    );

    expect(preview.affectedKeys).toContain('onboarding');
  });

  it('keeps plain settings backups importable when explicitly selected', async () => {
    const { kernel } = createBackupKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await kernel.setSettingsValues({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
    });

    const envelope = await kernel.exportSettings({
      encryptionMode: 'plain',
    });
    const serialized = JSON.stringify(envelope);

    expect(serialized).toContain('Ada');

    const preview = await kernel.prepareSettingsImport(serialized);

    expect(preview.affectedKeys).toContain('onboarding');
  });

  it('uploads encrypted reports to Drive and imports them through Google recovery', async () => {
    const driveService = createDriveServiceMock();
    const { kernel, repository } = createBackupKernel({
      googleDriveService: driveService.service,
    });
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedReport(repository);

    const file = await kernel.uploadBackupToDrive();

    const encrypted = EncryptedBackupEnvelopeSchema.parse(
      JSON.parse(driveService.getUploadedBackup(file.id)) as unknown,
    );

    expect(encrypted.googleRecipient?.recoveryFileId).toBe('recovery-key-file');

    const preview = await kernel.prepareDriveBackupImport({
      fileId: file.id,
      decryption: {
        method: 'google',
      },
    });

    expect(preview.incoming.weeklyReportCount).toBe(1);
  });

  it('keeps local encrypted reports exportable when Google recovery cannot be written', async () => {
    const driveService = createDriveServiceMock();
    driveService.service.ensureBackupRecoveryKey.mockRejectedValueOnce(
      new Error('Drive unavailable'),
    );
    const { kernel, repository } = createBackupKernel({
      googleDriveService: driveService.service,
    });
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedReport(repository);

    const envelope = await kernel.exportBackupArchive();
    const encrypted = EncryptedBackupEnvelopeSchema.parse(envelope);

    expect(encrypted.googleRecipient).toBeNull();

    const preview = await kernel.prepareBackupImport(
      JSON.stringify(encrypted),
      {
        method: 'password',
        password: 'CorrectHorse1',
      },
    );

    expect(preview.incoming.weeklyReportCount).toBe(1);
  });

  it('uploads plain reports to Drive and imports them without decryption', async () => {
    const driveService = createDriveServiceMock();
    const { kernel, repository } = createBackupKernel({
      googleDriveService: driveService.service,
    });
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await seedReport(repository);

    const file = await kernel.uploadBackupToDrive({
      encryptionMode: 'plain',
    });
    const serialized = driveService.getUploadedBackup(file.id);

    expect(serialized).toContain('encrypted-report');
    expect(driveService.service.ensureBackupRecoveryKey).not.toHaveBeenCalled();

    const preview = await kernel.prepareDriveBackupImport({
      fileId: file.id,
    });

    expect(preview.incoming.weeklyReportCount).toBe(1);
  });

  it('uploads encrypted settings to Drive and imports them through Google recovery', async () => {
    const driveService = createDriveServiceMock();
    const { kernel } = createBackupKernel({
      googleDriveService: driveService.service,
    });
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await kernel.setSettingsValues({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
    });

    const file = await kernel.uploadSettingsBackupToDrive();
    const encrypted = EncryptedBackupEnvelopeSchema.parse(
      JSON.parse(driveService.getUploadedBackup(file.id)) as unknown,
    );

    expect(encrypted.kind).toBe('settings');
    expect(encrypted.googleRecipient?.recoveryFileId).toBe('recovery-key-file');
    expect(JSON.stringify(encrypted)).not.toContain('Ada');

    const preview = await kernel.prepareDriveSettingsImport({
      fileId: file.id,
      decryption: {
        method: 'google',
      },
    });

    expect(preview.affectedKeys).toContain('onboarding');
  });

  it('uploads plain settings to Drive and imports them without decryption', async () => {
    const driveService = createDriveServiceMock();
    const { kernel } = createBackupKernel({
      googleDriveService: driveService.service,
    });
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await kernel.setSettingsValues({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
    });

    const file = await kernel.uploadSettingsBackupToDrive({
      encryptionMode: 'plain',
    });
    const serialized = driveService.getUploadedBackup(file.id);

    expect(serialized).toContain('Ada');
    expect(driveService.service.ensureBackupRecoveryKey).not.toHaveBeenCalled();

    const preview = await kernel.prepareDriveSettingsImport({
      fileId: file.id,
    });

    expect(preview.affectedKeys).toContain('onboarding');
  });
});
