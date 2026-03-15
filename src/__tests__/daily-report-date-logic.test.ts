import {
  resolveInitialDailyReportDate,
  resolveWeekRangeForDate,
} from '@/renderer/pages/DailyReportPage/components/date-logic';
import { ReportsState } from '@/shared/reports/models';

function createReportsState(dates: string[]): ReportsState {
  return {
    weeklyHashes: {},
    weeklyReports: {},
    dailyReports: dates.reduce<ReportsState['dailyReports']>(
      (result, date, index) => {
        const id = `daily-${index + 1}`;
        result[id] = {
          id,
          weeklyReportId: 'week-1',
          date,
          values: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        };
        return result;
      },
      {},
    ),
  };
}

describe('daily report date logic', () => {
  it('uses reportsSince as baseline for missing report detection', () => {
    const reportsState = createReportsState([
      '2026-02-10',
      '2026-02-11',
      '2026-02-13',
    ]);

    const selected = resolveInitialDailyReportDate({
      reportsState,
      trainingStart: '2026-01-01',
      trainingEnd: '2026-12-31',
      reportsSince: '2026-02-10',
      now: new Date('2026-02-20T12:00:00.000Z'),
    });

    expect(selected).toBe('2026-02-12');
  });

  it('falls back to trainingStart when reportsSince is missing', () => {
    const reportsState = createReportsState(['2026-03-01']);

    const selected = resolveInitialDailyReportDate({
      reportsState,
      trainingStart: '2026-03-01',
      trainingEnd: '2026-12-31',
      reportsSince: null,
      now: new Date('2026-03-05T12:00:00.000Z'),
    });

    expect(selected).toBe('2026-03-02');
  });

  it('prefers reportsSince over trainingStart when both are set', () => {
    const reportsState = createReportsState([]);

    const selected = resolveInitialDailyReportDate({
      reportsState,
      trainingStart: '2026-01-01',
      trainingEnd: '2026-12-31',
      reportsSince: '2026-04-15',
      now: new Date('2026-04-20T12:00:00.000Z'),
    });

    expect(selected).toBe('2026-04-15');
  });

  it('returns the next day when all dates through today are already filled', () => {
    const reportsState = createReportsState([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
    ]);

    const selected = resolveInitialDailyReportDate({
      reportsState,
      trainingStart: '2026-03-01',
      trainingEnd: '2026-12-31',
      reportsSince: null,
      now: new Date('2026-03-03T12:00:00.000Z'),
    });

    expect(selected).toBe('2026-03-04');
  });

  it('derives monday and sunday from a report date', () => {
    const weekRange = resolveWeekRangeForDate('2026-03-12');

    expect(weekRange).toEqual({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-15',
    });
  });
});
