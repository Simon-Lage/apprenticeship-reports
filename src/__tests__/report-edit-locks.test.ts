import {
  isDateRangeLockedBySubmittedReports,
  isWeeklyReportSubmitted,
  resolveFirstEditableDateAfterSubmittedReports,
  resolveLatestSubmittedWeeklyReportEndDate,
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
});
