import { useAppKernelTestHarness } from '@/src/test-utils/app-kernel-test-harness';

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
    const createdWeek = Object.values(stateAfterCreate.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );

    expect(createdWeek?.values).toEqual({
      area: 'Backend',
    });
    const initialHash = stateAfterCreate.reports.weeklyHashes[createdWeek!.id]?.hash;

    setCurrentTime('2026-03-13T10:30:00.000Z');
    await kernel.upsertWeeklyReport({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-13',
      values: {
        area: 'Backend',
      },
    });
    const stateAfterNoChange = await repository.read();
    const unchangedWeek = Object.values(stateAfterNoChange.reports.weeklyReports).find(
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
    const updatedWeek = Object.values(stateAfterUpdate.reports.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === '2026-03-09' &&
        weeklyReport.weekEnd === '2026-03-13',
    );

    expect(updatedWeek?.values).toEqual({
      area: 'Frontend',
    });
    expect(updatedWeek?.updatedAt).toBe('2026-03-13T11:00:00.000Z');
    expect(stateAfterUpdate.reports.weeklyHashes[updatedWeek!.id]?.hash).not.toBe(
      initialHash,
    );
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
});
