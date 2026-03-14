import { promises as fs } from 'fs';
import path from 'path';

import { createDatabaseBackupEnvelope } from '@/shared/app/backup-archive';
import { createDefaultAppMetadata } from '@/shared/app/state';
import { useAppKernelTestHarness } from '@/src/test-utils/app-kernel-test-harness';

describe('app kernel backup import', () => {
  const {
    createKernel,
    signIn,
    completeRequiredOnboarding,
    writeReportsFixture,
    setCurrentTime,
    getRootDirectory,
  } = useAppKernelTestHarness();

  it('stores a backup import preview with available conflict strategies', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

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
      values: { source: 'backup' },
      createdAt: '2026-03-13T11:00:00.000Z',
      updatedAt: '2026-03-13T11:00:00.000Z',
    };

    const preview = await kernel.prepareBackupImport(
      JSON.stringify(
        createDatabaseBackupEnvelope(
          incomingState.reports,
          '2026-03-13T11:30:00.000Z',
        ),
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
    expect(preview.conflictingWeeks).toHaveLength(1);
    expect(preview.conflictingWeeks[0]).toMatchObject({
      weekIdentity: '2026-03-09:2026-03-13',
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
    });
  });

  it('rejects backup import previews for non-json payloads', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

    await expect(kernel.prepareBackupImport('not-json')).rejects.toThrow(
      'valid JSON',
    );
  });

  it('rejects backup import previews with empty week arrays', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

    await expect(
      kernel.prepareBackupImport(
        JSON.stringify({
          exportedAt: '2026-03-13T12:00:00.000Z',
          source: 'reports-json',
          reports: {
            weeks: [],
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('treats same weekly content as non-conflicting even when ids and timestamps differ', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

    await writeReportsFixture(repository, {
      weeklyReports: [
        {
          id: 'local-week-1',
          weekStart: '2026-03-09',
          weekEnd: '2026-03-13',
          updatedAt: '2026-03-13T10:00:00.000Z',
          values: { source: 'same' },
          dailyReports: [
            {
              id: 'local-day-1',
              date: '2026-03-09',
              updatedAt: '2026-03-13T10:00:00.000Z',
              values: { source: 'same' },
            },
          ],
        },
      ],
    });

    const incomingState = createDefaultAppMetadata('2026-03-13T12:00:00.000Z');
    incomingState.reports.weeklyReports['backup-week-1'] = {
      id: 'backup-week-1',
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: { source: 'same' },
      dailyReportIds: ['backup-day-1'],
      createdAt: '2026-03-13T12:00:00.000Z',
      updatedAt: '2026-03-13T12:00:00.000Z',
    };
    incomingState.reports.dailyReports['backup-day-1'] = {
      id: 'backup-day-1',
      weeklyReportId: 'backup-week-1',
      date: '2026-03-09',
      values: { source: 'same' },
      createdAt: '2026-03-13T12:00:00.000Z',
      updatedAt: '2026-03-13T12:00:00.000Z',
    };

    const preview = await kernel.prepareBackupImport(
      JSON.stringify(
        createDatabaseBackupEnvelope(
          incomingState.reports,
          '2026-03-13T12:00:00.000Z',
        ),
      ),
    );

    expect(preview.conflictSummary.conflictingWeekCount).toBe(0);
    expect(preview.conflictSummary.conflictingDailyReportCount).toBe(0);
  });

  it('keeps local report data for conflicting weeks when local is selected', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

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
        createDatabaseBackupEnvelope(
          incomingState.reports,
          '2026-03-13T11:30:00.000Z',
        ),
      ),
    );

    await kernel.applyBackupImport({
      previewId: preview.id,
      conflictStrategy: 'local',
    });

    const persistedState = await repository.read();
    const firstWeek = Object.values(persistedState.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    const secondWeek = Object.values(persistedState.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-16' &&
        weeklyReport.weekEnd === '2026-03-20',
    );
    const firstWeekDay = Object.values(persistedState.reports.dailyReports).find(
      (dailyReport) => dailyReport.date === '2026-03-09',
    );

    expect(firstWeek?.values).toEqual({
      source: 'local',
    });
    expect(firstWeekDay?.values).toEqual({
      source: 'local',
    });
    expect(secondWeek?.values).toMatchObject({
      source: 'backup',
    });
  });

  it('uses backup report data for conflicting weeks when backup is selected', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

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
        createDatabaseBackupEnvelope(
          incomingState.reports,
          '2026-03-13T11:30:00.000Z',
        ),
      ),
    );

    await kernel.applyBackupImport({
      previewId: preview.id,
      conflictStrategy: 'backup',
    });

    const persistedState = await repository.read();
    const mergedWeek = Object.values(persistedState.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    const mergedDay = Object.values(persistedState.reports.dailyReports).find(
      (dailyReport) => dailyReport.date === '2026-03-09',
    );

    expect(mergedWeek?.values).toMatchObject({
      source: 'backup',
    });
    expect(mergedDay?.values).toEqual({
      source: 'backup',
    });
    expect(Object.keys(persistedState.reports.weeklyReports)).toHaveLength(1);
  });

  it('uses the newest timestamp by default for conflicting daily reports after a restart', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

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
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
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

    setCurrentTime('2026-03-13T12:30:00.000Z');

    const preview = await kernel.prepareBackupImport(
      JSON.stringify(
        createDatabaseBackupEnvelope(
          incomingState.reports,
          '2026-03-13T12:30:00.000Z',
        ),
      ),
    );
    const { kernel: restartedKernel } = createKernel();
    await restartedKernel.boot();
    const bootstrap = await restartedKernel.applyBackupImport({
      previewId: preview.id,
    });
    const recoveryDirectory = path.join(getRootDirectory(), 'recovery');
    const recoveryFiles = await fs.readdir(recoveryDirectory);
    const restoredState = await repository.read();

    expect(recoveryFiles).toHaveLength(1);
    expect(bootstrap.backup.lastRecoverySnapshotPath).toContain('recovery');
    expect(bootstrap.backup.lastRestoredAt).toBe('2026-03-13T12:30:00.000Z');
    expect(bootstrap.auth.status).toBe('active');
    expect(restoredState.recovery.pendingBackupImport).toBeNull();
    expect(restoredState.settings.current.values).toEqual({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
      backup: {
        enabled: true,
      },
    });
    const restoredWeek = Object.values(restoredState.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    const restoredDayOne = Object.values(restoredState.reports.dailyReports).find(
      (dailyReport) => dailyReport.date === '2026-03-09',
    );
    const restoredDayTwo = Object.values(restoredState.reports.dailyReports).find(
      (dailyReport) => dailyReport.date === '2026-03-10',
    );
    const restoredDayOneId = restoredDayOne?.id;
    const restoredDayTwoId = restoredDayTwo?.id;

    expect(restoredDayOne?.values).toEqual({
      source: 'backup-newer',
    });
    expect(restoredDayTwo?.values).toEqual({
      source: 'local-newer',
    });
    expect(restoredWeek?.dailyReportIds).toEqual([
      restoredDayOneId,
      restoredDayTwoId,
    ]);
  });
});
