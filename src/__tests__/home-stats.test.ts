import {
  buildHomeStatsSnapshot,
  buildHomeWeeklyReportStatsSnapshot,
  resolveDailyReportEntryMode,
} from '@/renderer/lib/home-stats';
import { JsonObject } from '@/shared/common/json';
import { DailyReportRecord, WeeklyReportRecord } from '@/shared/reports/models';

function createDailyReport(input: {
  id: string;
  date: string;
  createdAt: string;
  values: JsonObject;
}): DailyReportRecord {
  return {
    id: input.id,
    weeklyReportId: 'week-1',
    date: input.date,
    values: input.values,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

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
    values: { submitted: input.submitted },
    dailyReportIds: [],
    createdAt: `${input.weekStart}T08:00:00.000Z`,
    updatedAt: `${input.weekStart}T08:00:00.000Z`,
  };
}

describe('home stats', () => {
  it('recognizes explicit and legacy automatic entry modes', () => {
    expect(resolveDailyReportEntryMode({ entryMode: 'automatic' })).toBe(
      'automatic',
    );
    expect(resolveDailyReportEntryMode({ type: 'free' })).toBe('automatic');
    expect(resolveDailyReportEntryMode({ dayType: 'free' })).toBe('manual');
  });

  it('builds backlog, same-day, batch-size and mode stats', () => {
    const stats = buildHomeStatsSnapshot({
      dailyReports: [
        createDailyReport({
          id: 'day-1',
          date: '2026-03-10',
          createdAt: '2026-03-10T08:00:00.000Z',
          values: { entryMode: 'manual', dayType: 'work' },
        }),
        createDailyReport({
          id: 'day-2',
          date: '2026-03-11',
          createdAt: '2026-03-13T08:00:00.000Z',
          values: { entryMode: 'manual', dayType: 'school' },
        }),
        createDailyReport({
          id: 'day-3',
          date: '2026-03-12',
          createdAt: '2026-03-13T08:05:00.000Z',
          values: { entryMode: 'automatic', dayType: 'free' },
        }),
      ],
      reportStartDate: '2026-03-10',
      reportEndDate: '2026-03-15',
      today: '2026-03-15',
    });

    expect(stats).toEqual({
      backlogDays: 1,
      sameDayRate: 1 / 3,
      averageReportsPerEntryDay: 1.5,
      manualCount: 2,
      automaticCount: 1,
      entryDayCount: 2,
    });
  });

  it('does not count weekends or today as daily report backlog', () => {
    const stats = buildHomeStatsSnapshot({
      dailyReports: [
        createDailyReport({
          id: 'day-1',
          date: '2026-03-13',
          createdAt: '2026-03-13T08:00:00.000Z',
          values: { entryMode: 'manual', dayType: 'work' },
        }),
      ],
      reportStartDate: '2026-03-13',
      reportEndDate: null,
      today: '2026-03-16',
    });

    expect(stats.backlogDays).toBe(0);
  });

  it('counts due weekly reports from the reporting start instead of only complete stored weeks', () => {
    const stats = buildHomeWeeklyReportStatsSnapshot({
      weeklyReports: [
        createWeeklyReport({
          id: 'week-1',
          weekStart: '2026-03-02',
          weekEnd: '2026-03-08',
          submitted: true,
        }),
      ],
      reportStartDate: '2026-03-02',
      reportEndDate: null,
      today: '2026-03-22',
    });

    expect(stats).toEqual({
      totalCount: 3,
      submittedCount: 1,
      toSendCount: 2,
    });
  });
});
