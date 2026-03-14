import { createDatabaseBackupEnvelope } from '@/shared/app/backup-archive';
import { createDefaultAppMetadata } from '@/shared/app/state';
import { useAppKernelTestHarness } from '@/src/test-utils/app-kernel-test-harness';

describe('app kernel backup import resolution', () => {
  const { createKernel, signIn, completeRequiredOnboarding, writeReportsFixture } =
    useAppKernelTestHarness();

  it('applies week-specific conflict resolutions over the global strategy', async () => {
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
      weekConflictResolutions: [
        {
          weekStart: '2026-03-09',
          weekEnd: '2026-03-13',
          strategy: 'local',
        },
      ],
    });

    const persistedState = await repository.read();
    const mergedWeek = Object.values(persistedState.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );

    expect(mergedWeek?.values).toMatchObject({
      source: 'local',
    });
  });
});
