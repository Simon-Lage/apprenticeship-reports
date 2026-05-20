import { useAppKernelTestHarness } from '@/src/test-utils/app-kernel-test-harness';
import {
  buildWeeklyAggregates,
  parseDailyReportValues,
} from '@/renderer/lib/report-values';
import {
  mergeAbsenceSettings,
  parseAbsenceSettings,
} from '@/shared/absence/settings';

describe('app kernel report mutations', () => {
  const { createKernel, signIn, completeRequiredOnboarding, setCurrentTime } =
    useAppKernelTestHarness();

  it('creates or updates a weekly report by week range', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    setCurrentTime('2026-03-13T10:00:00.000Z');

    await kernel.upsertWeeklyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: {
        area: 'Backend',
      },
    });

    const stateAfterCreate = await repository.read();
    const createdWeek = Object.values(
      stateAfterCreate.reports.weeklyReports,
    ).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );

    expect(createdWeek?.values).toEqual({
      area: 'Backend',
    });
    const initialHash =
      stateAfterCreate.reports.weeklyHashes[createdWeek!.id]?.hash;

    setCurrentTime('2026-03-13T10:30:00.000Z');
    await kernel.upsertWeeklyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: {
        area: 'Backend',
      },
    });
    const stateAfterNoChange = await repository.read();
    const unchangedWeek = Object.values(
      stateAfterNoChange.reports.weeklyReports,
    ).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );

    expect(unchangedWeek?.updatedAt).toBe('2026-03-13T10:00:00.000Z');
    setCurrentTime('2026-03-13T11:00:00.000Z');

    await kernel.upsertWeeklyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: {
        area: 'Frontend',
      },
    });

    const stateAfterUpdate = await repository.read();
    const updatedWeek = Object.values(
      stateAfterUpdate.reports.weeklyReports,
    ).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );

    expect(updatedWeek?.values).toEqual({
      area: 'Frontend',
    });
    expect(updatedWeek?.updatedAt).toBe('2026-03-13T11:00:00.000Z');
    expect(
      stateAfterUpdate.reports.weeklyHashes[updatedWeek!.id]?.hash,
    ).not.toBe(initialHash);
    expect(Object.keys(stateAfterUpdate.reports.weeklyReports)).toHaveLength(1);
  });

  it('upserts and deletes daily reports by date within a week', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    setCurrentTime('2026-03-13T10:00:00.000Z');

    await kernel.upsertDailyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      date: '2026-03-09',
      values: {
        tasks: 'Setup project',
      },
    });

    let state = await repository.read();
    let week = Object.values(state.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    let day = Object.values(state.reports.dailyReports).find(
      (dailyReport) => dailyReport.date === '2026-03-09',
    );

    expect(week).toBeDefined();
    expect(day?.values).toEqual({
      tasks: 'Setup project',
    });
    expect(week?.updatedAt).toBe('2026-03-13T10:00:00.000Z');
    const hashAfterFirstUpsert = state.reports.weeklyHashes[week!.id]?.hash;
    expect(state.backup.dailyReportsSinceLastBackup).toBe(1);
    setCurrentTime('2026-03-13T10:30:00.000Z');
    await kernel.upsertDailyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      date: '2026-03-09',
      values: {
        tasks: 'Setup project',
      },
    });

    state = await repository.read();
    week = Object.values(state.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    expect(week?.updatedAt).toBe('2026-03-13T10:00:00.000Z');
    expect(state.backup.dailyReportsSinceLastBackup).toBe(1);
    setCurrentTime('2026-03-13T11:00:00.000Z');

    await kernel.upsertDailyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      date: '2026-03-09',
      values: {
        tasks: 'Fix lint issues',
      },
    });

    state = await repository.read();
    week = Object.values(state.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    day = Object.values(state.reports.dailyReports).find(
      (dailyReport) => dailyReport.date === '2026-03-09',
    );

    expect(day?.values).toEqual({
      tasks: 'Fix lint issues',
    });
    expect(week?.updatedAt).toBe('2026-03-13T11:00:00.000Z');
    expect(state.reports.weeklyHashes[week!.id]?.hash).not.toBe(
      hashAfterFirstUpsert,
    );
    expect(state.backup.dailyReportsSinceLastBackup).toBe(2);
    expect(Object.keys(state.reports.dailyReports)).toHaveLength(1);
    setCurrentTime('2026-03-13T11:30:00.000Z');

    await kernel.deleteDailyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      date: '2026-03-09',
    });

    state = await repository.read();
    week = Object.values(state.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    day = Object.values(state.reports.dailyReports).find(
      (dailyReport) => dailyReport.date === '2026-03-09',
    );

    expect(day).toBeUndefined();
    expect(week?.dailyReportIds).toEqual([]);
    expect(week?.updatedAt).toBe('2026-03-13T11:30:00.000Z');
  });

  it('deletes a weekly report together with its days', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    setCurrentTime('2026-03-13T10:00:00.000Z');

    await kernel.upsertDailyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      date: '2026-03-09',
      values: {
        tasks: 'Setup project',
      },
    });
    await kernel.upsertDailyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      date: '2026-03-10',
      values: {
        tasks: 'Implement auth',
      },
    });

    await kernel.deleteWeeklyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
    });

    const state = await repository.read();
    const week = Object.values(state.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    const day = Object.values(state.reports.dailyReports).find(
      (dailyReport) =>
        dailyReport.date === '2026-03-09' || dailyReport.date === '2026-03-10',
    );

    expect(week).toBeUndefined();
    expect(day).toBeUndefined();
    expect(Object.keys(state.reports.weeklyHashes)).toHaveLength(0);
  });

  it('rejects invalid week ranges for report mutations', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

    await expect(
      kernel.upsertWeeklyReport({
        weekStart: '2026-03-13',
        weekEnd: '2026-03-09',
        values: {},
      }),
    ).rejects.toThrow('Invalid week range');
  });

  it('rejects daily report dates outside the selected week range', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

    await expect(
      kernel.upsertDailyReport({
        weekStart: '2026-03-09',
        weekEnd: '2026-03-13',
        date: '2026-03-14',
        values: {
          tasks: 'Out of range',
        },
      }),
    ).rejects.toThrow('within the selected week range');
  });

  it('keeps stored school-day data unchanged when the timetable settings change later', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    setCurrentTime('2026-03-13T10:00:00.000Z');

    await kernel.upsertDailyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      date: '2026-03-09',
      values: {
        dayType: 'school',
        lessons: [
          {
            lesson: 1,
            subject: 'Mathematik',
            teacher: 'Herr Alt',
            topics: ['Lineare Funktionen'],
          },
        ],
      },
    });

    const stateBeforeSettingsChange = await repository.read();
    const weekBeforeSettingsChange = Object.values(
      stateBeforeSettingsChange.reports.weeklyReports,
    ).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    const dayBeforeSettingsChange = Object.values(
      stateBeforeSettingsChange.reports.dailyReports,
    ).find((dailyReport) => dailyReport.date === '2026-03-09');

    expect(weekBeforeSettingsChange).toBeDefined();
    expect(dayBeforeSettingsChange).toBeDefined();

    const initialWeeklyHash =
      stateBeforeSettingsChange.reports.weeklyHashes[
        weekBeforeSettingsChange!.id
      ]?.hash;

    setCurrentTime('2026-03-13T11:00:00.000Z');
    await kernel.setSettingsValues({
      appUi: {
        teachers: ['Herr Neu'],
        subjects: ['Physik'],
        timetable: {
          monday: [
            {
              lesson: 1,
              teacher: 'Herr Neu',
              subject: 'Physik',
            },
          ],
        },
      },
      onboarding: {
        identity: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          apprenticeIdentifier: '12345',
          profession: 'Fachinformatikerin',
        },
        'training-period': {
          trainingStart: '2026-03-01',
          trainingEnd: '2026-12-31',
          reportsSince: '2026-03-01',
        },
        region: {
          subdivisionCode: 'DE-NW',
        },
        workplace: {
          department: 'Entwicklung',
          trainerEmail: 'trainer@example.com',
          ihkLink: null,
        },
      },
    });

    const stateAfterSettingsChange = await repository.read();
    const weekAfterSettingsChange = Object.values(
      stateAfterSettingsChange.reports.weeklyReports,
    ).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    const dayAfterSettingsChange = Object.values(
      stateAfterSettingsChange.reports.dailyReports,
    ).find((dailyReport) => dailyReport.date === '2026-03-09');

    expect(weekAfterSettingsChange?.updatedAt).toBe(
      weekBeforeSettingsChange?.updatedAt,
    );
    expect(
      stateAfterSettingsChange.reports.weeklyHashes[weekAfterSettingsChange!.id]
        ?.hash,
    ).toBe(initialWeeklyHash);
    expect(parseDailyReportValues(dayAfterSettingsChange?.values)).toEqual({
      dayType: 'school',
      freeReason: '',
      freeDayCategory: null,
      activities: [],
      schoolTopics: [],
      trainings: [],
      lessons: [
        {
          lesson: 1,
          subject: 'Mathematik',
          teacher: 'Herr Alt',
          topics: ['Lineare Funktionen'],
        },
      ],
    });
    expect(
      buildWeeklyAggregates([dayAfterSettingsChange!]).schoolTopics,
    ).toEqual(['Mathematik: Lineare Funktionen']);
  });

  it('keeps sent weekly reports unchanged when absences are added later', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    setCurrentTime('2026-03-13T10:00:00.000Z');

    await kernel.upsertDailyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      date: '2026-03-10',
      values: {
        dayType: 'work',
        activities: ['Code Review'],
      },
    });

    setCurrentTime('2026-03-13T10:30:00.000Z');
    await kernel.upsertWeeklyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: {
        submitted: true,
        submittedToEmail: 'trainer@example.com',
      },
    });

    const stateBeforeAbsenceChange = await repository.read();
    const weekBeforeAbsenceChange = Object.values(
      stateBeforeAbsenceChange.reports.weeklyReports,
    ).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    const dayBeforeAbsenceChange = Object.values(
      stateBeforeAbsenceChange.reports.dailyReports,
    ).find((dailyReport) => dailyReport.date === '2026-03-10');
    const absenceSettingsBefore = parseAbsenceSettings(
      stateBeforeAbsenceChange.settings.current.values,
    );

    setCurrentTime('2026-03-13T11:00:00.000Z');
    await kernel.setSettingsValues(
      mergeAbsenceSettings(stateBeforeAbsenceChange.settings.current.values, {
        ...absenceSettingsBefore,
        manualAbsences: [
          {
            id: 'absence-1',
            type: 'sick',
            startDate: '2026-03-10',
            endDate: '2026-03-10',
            label: 'Krank',
            note: null,
            createdAt: '2026-03-13T11:00:00.000Z',
            updatedAt: '2026-03-13T11:00:00.000Z',
          },
        ],
      }),
    );

    const stateAfterAbsenceChange = await repository.read();
    const weekAfterAbsenceChange = Object.values(
      stateAfterAbsenceChange.reports.weeklyReports,
    ).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );
    const dayAfterAbsenceChange = Object.values(
      stateAfterAbsenceChange.reports.dailyReports,
    ).find((dailyReport) => dailyReport.date === '2026-03-10');

    expect(dayAfterAbsenceChange?.values).toEqual(
      dayBeforeAbsenceChange?.values,
    );
    expect(weekAfterAbsenceChange?.values).toEqual(
      weekBeforeAbsenceChange?.values,
    );
    expect(weekAfterAbsenceChange?.updatedAt).toBe(
      weekBeforeAbsenceChange?.updatedAt,
    );
    expect(
      stateAfterAbsenceChange.reports.weeklyHashes[weekAfterAbsenceChange!.id]
        ?.hash,
    ).toBe(
      stateBeforeAbsenceChange.reports.weeklyHashes[weekBeforeAbsenceChange!.id]
        ?.hash,
    );
  });
});
