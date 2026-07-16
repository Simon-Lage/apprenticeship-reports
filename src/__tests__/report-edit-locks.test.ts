import {
  isDateRangeLockedBySubmittedReports,
  isWeeklyReportSubmitted,
  resolveFirstEditableDateAfterSubmittedReports,
  resolveLatestSubmittedWeeklyReportEndDate,
  resolveWeeklyReportSubmissionBlock,
} from '@/shared/reports/edit-locks';
import { ReportsState, WeeklyReportRecord } from '@/shared/reports/models';

function createWeeklyReport(input: {
  id: string;
  weekStart: string;
  weekEnd: string;
  submitted: boolean;
}): WeeklyReportRecord {
  return {
    id: input.id,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    values: {
      submitted: input.submitted,
    },
    dailyReportIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createReportsState(weeklyReports: WeeklyReportRecord[]): ReportsState {
  return {
    weeklyHashes: {},
    weeklyReports: weeklyReports.reduce<ReportsState['weeklyReports']>(
      (result, report) => {
        result[report.id] = report;
        return result;
      },
      {},
    ),
    dailyReports: {},
  };
}

describe('report edit locks', () => {
  it('detects submitted weekly reports without parsing unrelated metadata', () => {
    const report = createWeeklyReport({
      id: 'week-1',
      weekStart: '2026-05-04',
      weekEnd: '2026-05-10',
      submitted: true,
    });

    expect(isWeeklyReportSubmitted(report)).toBe(true);
  });

  it('resolves the first editable day after the latest submitted week', () => {
    const reportsState = createReportsState([
      createWeeklyReport({
        id: 'week-1',
        weekStart: '2026-05-04',
        weekEnd: '2026-05-10',
        submitted: true,
      }),
      createWeeklyReport({
        id: 'week-2',
        weekStart: '2026-05-11',
        weekEnd: '2026-05-17',
        submitted: false,
      }),
      createWeeklyReport({
        id: 'week-3',
        weekStart: '2026-05-18',
        weekEnd: '2026-05-24',
        submitted: true,
      }),
    ]);

    expect(resolveLatestSubmittedWeeklyReportEndDate(reportsState)).toBe(
      '2026-05-24',
    );
    expect(resolveFirstEditableDateAfterSubmittedReports(reportsState)).toBe(
      '2026-05-25',
    );
  });

  it('locks manual date ranges that start inside submitted report history', () => {
    const reportsState = createReportsState([
      createWeeklyReport({
        id: 'week-1',
        weekStart: '2026-05-04',
        weekEnd: '2026-05-10',
        submitted: true,
      }),
    ]);

    expect(
      isDateRangeLockedBySubmittedReports({
        startDate: '2026-05-10',
        endDate: '2026-05-12',
        reportsState,
      }),
    ).toBe(true);
    expect(
      isDateRangeLockedBySubmittedReports({
        startDate: '2026-05-11',
        endDate: '2026-05-12',
        reportsState,
      }),
    ).toBe(false);
  });

  it('allows early submission only when every future day was created automatically', () => {
    const reportsState = createReportsState([
      {
        ...createWeeklyReport({
          id: 'week-1',
          weekStart: '2026-05-04',
          weekEnd: '2026-05-10',
          submitted: false,
        }),
        dailyReportIds: ['day-1', 'day-2', 'day-3', 'day-4', 'day-5'],
      },
    ]);
    reportsState.dailyReports = {
      'day-1': {
        id: 'day-1',
        weeklyReportId: 'week-1',
        date: '2026-05-04',
        values: {},
        createdAt: '2026-05-04T00:00:00.000Z',
        updatedAt: '2026-05-04T00:00:00.000Z',
      },
      'day-2': {
        id: 'day-2',
        weeklyReportId: 'week-1',
        date: '2026-05-05',
        values: {},
        createdAt: '2026-05-05T00:00:00.000Z',
        updatedAt: '2026-05-05T00:00:00.000Z',
      },
      'day-3': {
        id: 'day-3',
        weeklyReportId: 'week-1',
        date: '2026-05-06',
        values: {},
        createdAt: '2026-05-06T00:00:00.000Z',
        updatedAt: '2026-05-06T00:00:00.000Z',
      },
      'day-4': {
        id: 'day-4',
        weeklyReportId: 'week-1',
        date: '2026-05-07',
        values: {},
        createdAt: '2026-05-07T00:00:00.000Z',
        updatedAt: '2026-05-07T00:00:00.000Z',
      },
      'day-5': {
        id: 'day-5',
        weeklyReportId: 'week-1',
        date: '2026-05-08',
        values: { entryMode: 'automatic' },
        createdAt: '2026-05-08T00:00:00.000Z',
        updatedAt: '2026-05-08T00:00:00.000Z',
      },
    };

    expect(
      resolveWeeklyReportSubmissionBlock({
        reportsState,
        reportStartDate: '2026-05-04',
        weekStart: '2026-05-04',
        weekEnd: '2026-05-10',
        today: '2026-05-07',
        allowEarlySubmission: true,
      }),
    ).toEqual({ kind: 'future-week', blockingWeek: null });

    reportsState.dailyReports['day-5'].values.entryMode = 'automatic';
    reportsState.weeklyReports['week-1'].dailyReportIds.push('day-6', 'day-7');
    reportsState.dailyReports['day-6'] = {
      id: 'day-6',
      weeklyReportId: 'week-1',
      date: '2026-05-09',
      values: { entryMode: 'automatic' },
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z',
    };
    reportsState.dailyReports['day-7'] = {
      id: 'day-7',
      weeklyReportId: 'week-1',
      date: '2026-05-10',
      values: { entryMode: 'automatic' },
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-05-10T00:00:00.000Z',
    };

    expect(
      resolveWeeklyReportSubmissionBlock({
        reportsState,
        reportStartDate: '2026-05-04',
        weekStart: '2026-05-04',
        weekEnd: '2026-05-10',
        today: '2026-05-07',
        allowEarlySubmission: true,
      }),
    ).toBeNull();
  });
});
