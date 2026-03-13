import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { z } from 'zod';

import { AppKernel } from '@/main/services/AppKernel';
import { AppMetadataRepository } from '@/main/services/AppMetadataRepository';
import { WeeklyReportHashService } from '@/main/services/WeeklyReportHashService';
import { PasswordAuthService } from '@/main/services/PasswordAuthService';
import { createDatabaseBackupEnvelope } from '@/shared/app/backup-archive';
import { createDefaultAppMetadata } from '@/shared/app/state';
import { JsonObject, ensureJsonObject } from '@/shared/common/json';

describe('app kernel', () => {
  let rootDirectory: string;
  let currentTime = '2026-03-13T10:00:00.000Z';

  beforeEach(async () => {
    rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'apprenticeship-reports-'));
  });

  afterEach(async () => {
    await fs.rm(rootDirectory, { recursive: true, force: true });
  });

  function createKernel(options?: {
    googleDriveService?: unknown;
    googleOAuthService?: unknown;
  }) {
    const repository = new AppMetadataRepository(
      path.join(rootDirectory, 'app-metadata.json'),
      () => currentTime,
    );

    const passwordAuthService = new PasswordAuthService(repository);
    const kernel = new AppKernel(repository, new WeeklyReportHashService(), {
      now: () => currentTime,
      driveScopes: ['scope:drive'],
      driveExplanation: 'Backups',
      settingsSchemaVersion: 1,
      onboardingSteps: [
        {
          id: 'profile',
          schema: z.object({
            firstName: z.string().min(1),
          }),
        },
        {
          id: 'notes',
          optional: true,
          schema: z.object({
            comment: z.string().min(1).optional(),
          }),
        },
      ],
      normalizeSettingsValues: (values) =>
        ensureJsonObject(
          z
            .object({
              backup: z
                .object({
                  enabled: z.boolean(),
                })
                .partial()
                .optional(),
            })
            .passthrough()
            .parse(values),
        ),
      passwordAuthService,
      googleDriveService: (options?.googleDriveService ?? null) as any,
      googleOAuthService: (options?.googleOAuthService ?? null) as any,
    });

    return {
      kernel,
      repository,
    };
  }

  async function signIn(kernel: AppKernel, grantedScopes: string[] = ['scope:drive']) {
    return kernel.saveGoogleSession({
      account: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User Example',
      },
      accessToken: 'drive-token',
      grantedScopes,
      rememberMe: true,
    });
  }

  async function writeReportsFixture(
    repository: AppMetadataRepository,
    input: {
      weeklyReports: Array<{
        id: string;
        weekStart: string;
        weekEnd: string;
        updatedAt: string;
        values?: JsonObject;
        dailyReports: Array<{
          id: string;
          date: string;
          updatedAt: string;
          values?: JsonObject;
        }>;
      }>;
    },
  ) {
    const persistedState = await repository.read().catch(() => createDefaultAppMetadata(currentTime));
    const state = createDefaultAppMetadata(currentTime);

    state.auth = persistedState.auth;
    state.drive = persistedState.drive;
    state.backup = persistedState.backup;
    state.recovery = persistedState.recovery;
    state.onboarding = persistedState.onboarding;
    state.settings = persistedState.settings;

    input.weeklyReports.forEach((weeklyReport) => {
      state.reports.weeklyReports[weeklyReport.id] = {
        id: weeklyReport.id,
        weekStart: weeklyReport.weekStart,
        weekEnd: weeklyReport.weekEnd,
        values: weeklyReport.values ?? {},
        dailyReportIds: weeklyReport.dailyReports.map((dailyReport) => dailyReport.id),
        createdAt: weeklyReport.updatedAt,
        updatedAt: weeklyReport.updatedAt,
      };

      weeklyReport.dailyReports.forEach((dailyReport) => {
        state.reports.dailyReports[dailyReport.id] = {
          id: dailyReport.id,
          weeklyReportId: weeklyReport.id,
          date: dailyReport.date,
          values: dailyReport.values ?? {},
          createdAt: dailyReport.updatedAt,
          updatedAt: dailyReport.updatedAt,
        };
      });
    });

    await repository.write(state);
    return state;
  }

  it('boots into a locked state before authentication', async () => {
    const { kernel } = createKernel();
    const bootstrap = await kernel.boot();

    expect(bootstrap.app.isLocked).toBe(true);
    expect(bootstrap.app.lockReasons).toContain('authentication');
    expect(bootstrap.database.status).toBe('locked');
  });

  it('creates a sqlite database and migrates legacy json metadata', async () => {
    const legacyFilePath = path.join(rootDirectory, 'app-metadata.json');
    const repository = new AppMetadataRepository(legacyFilePath, () => currentTime);
    const legacyState = createDefaultAppMetadata(currentTime);

    legacyState.settings.current.values = {
      backup: {
        enabled: true,
      },
    };

    await fs.writeFile(legacyFilePath, JSON.stringify(legacyState, null, 2), 'utf-8');

    const migratedState = await repository.read();
    const databaseStats = await fs.stat(repository.getDatabasePath());

    expect(databaseStats.isFile()).toBe(true);
    expect(migratedState.settings.current.values).toEqual({
      backup: {
        enabled: true,
      },
    });
  });

  it('persists a remembered session and drive consent', async () => {
    const { kernel } = createKernel();
    await kernel.boot();

    const bootstrap = await signIn(kernel);

    expect(bootstrap.auth.status).toBe('active');
    expect(bootstrap.drive.status).toBe('granted');
    expect(bootstrap.database.status).toBe('ready');
  });

  it('blocks local data writes until the user is authenticated', async () => {
    const { kernel } = createKernel();
    await kernel.boot();

    await expect(
      kernel.setSettingsValues({
        backup: {
          enabled: true,
        },
      }),
    ).rejects.toThrow('Google-Login abgeschlossen');
  });

  it('blocks local data writes until drive access is granted', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await kernel.savePasswordSession({
      account: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User Example',
      },
      rememberMe: true,
    });

    await expect(
      kernel.setSettingsValues({
        backup: {
          enabled: true,
        },
      }),
    ).rejects.toThrow('Google-Drive-Berechtigungen fehlen');
  });

  it('clears stale drive consent when another account signs in', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel, ['scope:drive']);
    await kernel.clearGoogleSession();

    const bootstrap = await kernel.saveGoogleSession({
      account: {
        id: 'user-2',
        email: 'second@example.com',
        displayName: 'Second User',
      },
      rememberMe: true,
    });

    expect(bootstrap.drive.status).toBe('missing');
    expect(bootstrap.drive.missingScopes).toEqual(['scope:drive']);
  });

  it('stores a settings import preview and can cancel it', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    await kernel.prepareSettingsImport(
      JSON.stringify({
        exportedAt: '2026-03-13T11:00:00.000Z',
        snapshot: {
          id: 'incoming',
          schemaVersion: 1,
          capturedAt: '2026-03-13T11:00:00.000Z',
          values: {
            backup: {
              enabled: true,
            },
          },
        },
      }),
    );

    const bootstrap = await kernel.cancelSettingsImport();

    expect(bootstrap.settings.pendingImport).toBe(false);
    expect(bootstrap.settings.pendingImportDifferenceCount).toBe(0);
  });

  it('stores a settings import preview and applies it', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    const preview = await kernel.prepareSettingsImport(
      JSON.stringify({
        exportedAt: '2026-03-13T11:00:00.000Z',
        snapshot: {
          id: 'incoming',
          schemaVersion: 1,
          capturedAt: '2026-03-13T11:00:00.000Z',
          values: {
            backup: {
              enabled: true,
            },
          },
        },
      }),
    );

    const bootstrap = await kernel.applySettingsImport({
      previewId: preview.id,
    });

    expect(preview.differences).toHaveLength(1);
    expect(bootstrap.settings.pendingImport).toBe(false);
    expect(bootstrap.backup.hasUnsavedChanges).toBe(true);
  });

  it('supports skipping an optional onboarding step', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await kernel.saveOnboardingDraft({
      stepId: 'profile',
      values: {
        firstName: 'Ada',
      },
    });
    await kernel.completeOnboardingStep('profile');

    const bootstrap = await kernel.skipOnboardingStep('notes');

    expect(bootstrap.onboarding.skippedStepIds).toEqual(['notes']);
    expect(bootstrap.onboarding.isComplete).toBe(true);
  });

  it('validates onboarding drafts before saving them', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    await expect(
      kernel.saveOnboardingDraft({
        stepId: 'profile',
        values: {},
      }),
    ).rejects.toThrow();
  });

  it('mirrors onboarding drafts into settings values for later settings editing', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    await kernel.saveOnboardingDraft({
      stepId: 'profile',
      values: {
        firstName: 'Ada',
      },
    });

    const persistedState = await repository.read();

    expect(persistedState.settings.current.values).toEqual({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
    });
  });

  it('registers an app-close backup trigger when unsaved changes exist', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await kernel.setSettingsValues({
      backup: {
        enabled: true,
      },
    });

    await kernel.handleAppClose();

    const persistedState = await repository.read();

    expect(persistedState.backup.pendingReasons).toContain('app-close');
  });

  it('stores a backup import preview with available conflict strategies', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    await writeReportsFixture(repository, {
      weeklyReports: [
        {
          id: 'local-week-1',
          weekStart: '2026-03-09',
          weekEnd: '2026-03-13',
          updatedAt: '2026-03-13T10:00:00.000Z',
          dailyReports: [
            {
              id: 'local-day-1',
              date: '2026-03-09',
              updatedAt: '2026-03-13T10:00:00.000Z',
            },
          ],
        },
      ],
    });

    const incomingState = createDefaultAppMetadata('2026-03-13T11:00:00.000Z');
    incomingState.reports.weeklyReports['backup-week-1'] = {
      id: 'backup-week-1',
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: {},
      dailyReportIds: ['backup-day-1'],
      createdAt: '2026-03-13T11:00:00.000Z',
      updatedAt: '2026-03-13T11:00:00.000Z',
    };
    incomingState.reports.dailyReports['backup-day-1'] = {
      id: 'backup-day-1',
      weeklyReportId: 'backup-week-1',
      date: '2026-03-09',
      values: {},
      createdAt: '2026-03-13T11:00:00.000Z',
      updatedAt: '2026-03-13T11:00:00.000Z',
    };

    const preview = await kernel.prepareBackupImport(
      JSON.stringify(
        createDatabaseBackupEnvelope(incomingState, '2026-03-13T11:30:00.000Z'),
      ),
    );

    expect(preview.defaultConflictStrategy).toBe('latest-timestamp');
    expect(preview.availableConflictStrategies).toEqual([
      'latest-timestamp',
      'local',
      'backup',
    ]);
    expect(preview.conflictSummary.conflictingWeekCount).toBe(1);
    expect(preview.conflictSummary.conflictingDailyReportCount).toBe(1);
  });

  it('keeps local report data for conflicting weeks when local is selected', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    await writeReportsFixture(repository, {
      weeklyReports: [
        {
          id: 'local-week-1',
          weekStart: '2026-03-09',
          weekEnd: '2026-03-13',
          updatedAt: '2026-03-13T10:00:00.000Z',
          values: { source: 'local' },
          dailyReports: [
            {
              id: 'local-day-1',
              date: '2026-03-09',
              updatedAt: '2026-03-13T10:00:00.000Z',
              values: { source: 'local' },
            },
          ],
        },
      ],
    });

    const incomingState = createDefaultAppMetadata('2026-03-13T11:00:00.000Z');
    incomingState.reports.weeklyReports['backup-week-1'] = {
      id: 'backup-week-1',
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: { source: 'backup' },
      dailyReportIds: ['backup-day-1'],
      createdAt: '2026-03-13T11:00:00.000Z',
      updatedAt: '2026-03-13T11:00:00.000Z',
    };
    incomingState.reports.dailyReports['backup-day-1'] = {
      id: 'backup-day-1',
      weeklyReportId: 'backup-week-1',
      date: '2026-03-09',
      values: { source: 'backup' },
      createdAt: '2026-03-13T11:00:00.000Z',
      updatedAt: '2026-03-13T11:00:00.000Z',
    };
    incomingState.reports.weeklyReports['backup-week-2'] = {
      id: 'backup-week-2',
      weekStart: '2026-03-16',
      weekEnd: '2026-03-20',
      values: { source: 'backup' },
      dailyReportIds: ['backup-day-2'],
      createdAt: '2026-03-13T11:00:00.000Z',
      updatedAt: '2026-03-13T11:00:00.000Z',
    };
    incomingState.reports.dailyReports['backup-day-2'] = {
      id: 'backup-day-2',
      weeklyReportId: 'backup-week-2',
      date: '2026-03-16',
      values: { source: 'backup' },
      createdAt: '2026-03-13T11:00:00.000Z',
      updatedAt: '2026-03-13T11:00:00.000Z',
    };

    const preview = await kernel.prepareBackupImport(
      JSON.stringify(
        createDatabaseBackupEnvelope(incomingState, '2026-03-13T11:30:00.000Z'),
      ),
    );

    await kernel.applyBackupImport({
      previewId: preview.id,
      conflictStrategy: 'local',
    });

    const persistedState = await repository.read();

    expect(persistedState.reports.weeklyReports['local-week-1'].values).toEqual({
      source: 'local',
    });
    expect(persistedState.reports.dailyReports['local-day-1'].values).toEqual({
      source: 'local',
    });
    expect(persistedState.reports.weeklyReports['backup-week-2'].values).toEqual({
      source: 'backup',
    });
  });

  it('uses backup report data for conflicting weeks when backup is selected', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    await writeReportsFixture(repository, {
      weeklyReports: [
        {
          id: 'local-week-1',
          weekStart: '2026-03-09',
          weekEnd: '2026-03-13',
          updatedAt: '2026-03-13T10:00:00.000Z',
          values: { source: 'local' },
          dailyReports: [
            {
              id: 'local-day-1',
              date: '2026-03-09',
              updatedAt: '2026-03-13T10:00:00.000Z',
              values: { source: 'local' },
            },
          ],
        },
      ],
    });

    const incomingState = createDefaultAppMetadata('2026-03-13T11:00:00.000Z');
    incomingState.reports.weeklyReports['backup-week-1'] = {
      id: 'backup-week-1',
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: { source: 'backup' },
      dailyReportIds: ['backup-day-1'],
      createdAt: '2026-03-13T11:00:00.000Z',
      updatedAt: '2026-03-13T11:00:00.000Z',
    };
    incomingState.reports.dailyReports['backup-day-1'] = {
      id: 'backup-day-1',
      weeklyReportId: 'backup-week-1',
      date: '2026-03-09',
      values: { source: 'backup' },
      createdAt: '2026-03-13T11:00:00.000Z',
      updatedAt: '2026-03-13T11:00:00.000Z',
    };

    const preview = await kernel.prepareBackupImport(
      JSON.stringify(
        createDatabaseBackupEnvelope(incomingState, '2026-03-13T11:30:00.000Z'),
      ),
    );

    await kernel.applyBackupImport({
      previewId: preview.id,
      conflictStrategy: 'backup',
    });

    const persistedState = await repository.read();

    expect(persistedState.reports.weeklyReports['backup-week-1'].values).toEqual({
      source: 'backup',
    });
    expect(persistedState.reports.dailyReports['backup-day-1'].values).toEqual({
      source: 'backup',
    });
    expect(persistedState.reports.weeklyReports['local-week-1']).toBeUndefined();
  });

  it('uses the newest timestamp by default for conflicting daily reports after a restart', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    await writeReportsFixture(repository, {
      weeklyReports: [
        {
          id: 'local-week-1',
          weekStart: '2026-03-09',
          weekEnd: '2026-03-13',
          updatedAt: '2026-03-13T10:00:00.000Z',
          values: { source: 'local' },
          dailyReports: [
            {
              id: 'local-day-1',
              date: '2026-03-09',
              updatedAt: '2026-03-13T10:00:00.000Z',
              values: { source: 'local-old' },
            },
            {
              id: 'local-day-2',
              date: '2026-03-10',
              updatedAt: '2026-03-13T12:00:00.000Z',
              values: { source: 'local-newer' },
            },
          ],
        },
      ],
    });
    await kernel.setSettingsValues({
      backup: {
        enabled: true,
      },
    });

    const incomingState = createDefaultAppMetadata('2026-03-13T11:00:00.000Z');
    incomingState.reports.weeklyReports['backup-week-1'] = {
      id: 'backup-week-1',
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: { source: 'backup' },
      dailyReportIds: ['backup-day-1', 'backup-day-2'],
      createdAt: '2026-03-13T11:00:00.000Z',
      updatedAt: '2026-03-13T11:00:00.000Z',
    };
    incomingState.reports.dailyReports['backup-day-1'] = {
      id: 'backup-day-1',
      weeklyReportId: 'backup-week-1',
      date: '2026-03-09',
      values: { source: 'backup-newer' },
      createdAt: '2026-03-13T11:00:00.000Z',
      updatedAt: '2026-03-13T11:00:00.000Z',
    };
    incomingState.reports.dailyReports['backup-day-2'] = {
      id: 'backup-day-2',
      weeklyReportId: 'backup-week-1',
      date: '2026-03-10',
      values: { source: 'backup-older' },
      createdAt: '2026-03-13T09:00:00.000Z',
      updatedAt: '2026-03-13T09:00:00.000Z',
    };

    currentTime = '2026-03-13T12:30:00.000Z';

    const preview = await kernel.prepareBackupImport(
      JSON.stringify(
        createDatabaseBackupEnvelope(incomingState, '2026-03-13T12:30:00.000Z'),
      ),
    );
    const { kernel: restartedKernel } = createKernel();
    await restartedKernel.boot();
    const bootstrap = await restartedKernel.applyBackupImport({
      previewId: preview.id,
    });
    const recoveryDirectory = path.join(rootDirectory, 'recovery');
    const recoveryFiles = await fs.readdir(recoveryDirectory);
    const restoredState = await repository.read();

    expect(recoveryFiles).toHaveLength(1);
    expect(bootstrap.backup.lastRecoverySnapshotPath).toContain('recovery');
    expect(bootstrap.backup.lastRestoredAt).toBe('2026-03-13T12:30:00.000Z');
    expect(bootstrap.auth.status).toBe('active');
    expect(restoredState.recovery.pendingBackupImport).toBeNull();
    expect(restoredState.settings.current.values).toEqual({
      backup: {
        enabled: true,
      },
    });
    expect(restoredState.reports.dailyReports['backup-day-1'].values).toEqual({
      source: 'backup-newer',
    });
    expect(restoredState.reports.dailyReports['local-day-2'].values).toEqual({
      source: 'local-newer',
    });
    expect(restoredState.reports.weeklyReports['backup-week-1'].dailyReportIds).toEqual([
      'backup-day-1',
      'local-day-2',
    ]);
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
    const { kernel } = createKernel({ googleDriveService: driveService });
    await kernel.boot();
    await signIn(kernel);
    await kernel.setSettingsValues({
      backup: {
        enabled: true,
      },
    });

    currentTime = '2026-03-13T10:30:00.000Z';

    const { kernel: restartedKernel, repository } = createKernel({ googleDriveService: driveService });
    const bootstrap = await restartedKernel.boot();
    const persistedState = await repository.read();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(1);
    expect(bootstrap.backup.hasUnsavedChanges).toBe(false);
    expect(bootstrap.backup.pendingReasons).toEqual([]);
    expect(bootstrap.backup.lastSuccessfulBackupAt).toBe('2026-03-13T10:30:00.000Z');
    expect(persistedState.backup.lastSuccessfulBackupAt).toBe('2026-03-13T10:30:00.000Z');
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
    const { kernel, repository } = createKernel({ googleDriveService: driveService });
    await kernel.boot();
    await signIn(kernel);
    await kernel.setSettingsValues({
      backup: {
        enabled: true,
      },
    });

    currentTime = '2026-03-13T10:45:00.000Z';

    await kernel.handleAppClose();

    const persistedState = await repository.read();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(1);
    expect(persistedState.backup.hasUnsavedChanges).toBe(false);
    expect(persistedState.backup.pendingReasons).toEqual([]);
    expect(persistedState.backup.lastSuccessfulBackupAt).toBe('2026-03-13T10:45:00.000Z');
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
    const { kernel, repository } = createKernel({ googleDriveService: driveService });
    await kernel.boot();
    await signIn(kernel);

    for (let index = 0; index < 9; index += 1) {
      await kernel.recordDailyReport();
    }

    let persistedState = await repository.read();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(0);
    expect(persistedState.backup.dailyReportsSinceLastBackup).toBe(9);
    expect(persistedState.backup.hasUnsavedChanges).toBe(true);

    currentTime = '2026-03-13T11:00:00.000Z';

    const bootstrap = await kernel.recordDailyReport();
    persistedState = await repository.read();

    expect(driveService.uploadBackup).toHaveBeenCalledTimes(1);
    expect(bootstrap.backup.dailyReportsSinceLastBackup).toBe(0);
    expect(bootstrap.backup.hasUnsavedChanges).toBe(false);
    expect(persistedState.backup.pendingReasons).toEqual([]);
    expect(persistedState.backup.lastSuccessfulBackupAt).toBe('2026-03-13T11:00:00.000Z');
  });


  it('initializes a local password and allows password login after a restart', async () => {
    const { kernel } = createKernel();
    await kernel.boot();

    const setupBootstrap = await kernel.initializePasswordAuth({
      password: 'CorrectHorse1',
      rememberMe: true,
    });

    expect(setupBootstrap.auth.passwordConfigured).toBe(true);
    expect(setupBootstrap.auth.provider).toBe('password');

    await kernel.clearGoogleSession();

    const { kernel: restartedKernel } = createKernel();
    await restartedKernel.boot();
    const bootstrap = await restartedKernel.authenticateWithPassword({
      password: 'CorrectHorse1',
      rememberMe: true,
    });

    expect(bootstrap.auth.status).toBe('active');
    expect(bootstrap.auth.passwordConfigured).toBe(true);
    expect(bootstrap.auth.provider).toBe('password');
  });

  it('rejects password login with an invalid secret', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await kernel.initializePasswordAuth({
      password: 'CorrectHorse1',
      rememberMe: true,
    });
    await kernel.clearGoogleSession();

    const { kernel: restartedKernel } = createKernel();
    await restartedKernel.boot();

    await expect(
      restartedKernel.authenticateWithPassword({
        password: 'WrongHorse1',
        rememberMe: true,
      }),
    ).rejects.toThrow('ungueltig');
  });

  it('changes the stored password and invalidates the previous secret', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await kernel.initializePasswordAuth({
      password: 'CorrectHorse1',
      rememberMe: true,
    });

    const bootstrap = await kernel.changePassword({
      currentPassword: 'CorrectHorse1',
      nextPassword: 'CorrectHorse2',
    });

    expect(bootstrap.auth.passwordConfigured).toBe(true);

    await kernel.clearGoogleSession();

    const { kernel: restartedKernel } = createKernel();
    await restartedKernel.boot();

    await expect(
      restartedKernel.authenticateWithPassword({
        password: 'CorrectHorse1',
        rememberMe: true,
      }),
    ).rejects.toThrow('ungueltig');

    const reloginBootstrap = await restartedKernel.authenticateWithPassword({
      password: 'CorrectHorse2',
      rememberMe: true,
    });

    expect(reloginBootstrap.auth.provider).toBe('password');
  });
});