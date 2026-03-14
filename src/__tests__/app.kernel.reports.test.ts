import { useAppKernelTestHarness } from '@/src/test-utils/app-kernel-test-harness';

describe('app kernel report mutations', () => {
  const { createKernel, signIn, completeRequiredOnboarding } =
    useAppKernelTestHarness();

  it('creates or updates a weekly report by week range', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

    await kernel.upsertWeeklyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: {
        area: 'Backend',
      },
    });

    const stateAfterCreate = await repository.read();
    const createdWeek = Object.values(stateAfterCreate.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );

    expect(createdWeek?.values).toEqual({
      area: 'Backend',
    });

    await kernel.upsertWeeklyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: {
        area: 'Frontend',
      },
    });

    const stateAfterUpdate = await repository.read();
    const updatedWeek = Object.values(stateAfterUpdate.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );

    expect(updatedWeek?.values).toEqual({
      area: 'Frontend',
    });
    expect(Object.keys(stateAfterUpdate.reports.weeklyReports)).toHaveLength(1);
  });

  it('upserts and deletes daily reports by date within a week', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

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

    await kernel.upsertDailyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      date: '2026-03-09',
      values: {
        tasks: 'Fix lint issues',
      },
    });

    state = await repository.read();
    day = Object.values(state.reports.dailyReports).find(
      (dailyReport) => dailyReport.date === '2026-03-09',
    );

    expect(day?.values).toEqual({
      tasks: 'Fix lint issues',
    });
    expect(Object.keys(state.reports.dailyReports)).toHaveLength(1);

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
  });

  it('deletes a weekly report together with its days', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

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
  });
});
