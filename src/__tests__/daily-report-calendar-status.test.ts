import {
  buildDailyReportCalendarStatusMap,
  isDateWithinDailyReportCalendarRange,
  resolveDailyReportCalendarRange,
} from '@/renderer/pages/DailyReportPage/components/calendar-status';
import { createDefaultReportsState } from '@/shared/reports/models';

describe('daily report calendar status', () => {
  it('maps saved days to submitted and draft states', () => {
    const reportsState = createDefaultReportsState();

    reportsState.weeklyReports['week-submitted'] = {
      id: 'week-submitted',
      weekStart: '2026-03-09',
      weekEnd: '2026-03-15',
      values: {
        submitted: true,
      },
      dailyReportIds: ['day-submitted'],
      createdAt: '2026-03-15T18:00:00.000Z',
      updatedAt: '2026-03-15T18:00:00.000Z',
    };
    reportsState.dailyReports['day-submitted'] = {
      id: 'day-submitted',
      weeklyReportId: 'week-submitted',
      date: '2026-03-10',
      values: {
        dayType: 'work',
        activities: ['Deployment'],
      },
      createdAt: '2026-03-10T08:00:00.000Z',
      updatedAt: '2026-03-10T08:00:00.000Z',
    };
    reportsState.weeklyReports['week-draft'] = {
      id: 'week-draft',
      weekStart: '2026-03-16',
      weekEnd: '2026-03-22',
      values: {
        submitted: false,
      },
      dailyReportIds: ['day-draft'],
      createdAt: '2026-03-18T18:00:00.000Z',
      updatedAt: '2026-03-18T18:00:00.000Z',
    };
    reportsState.dailyReports['day-draft'] = {
      id: 'day-draft',
      weeklyReportId: 'week-draft',
      date: '2026-03-18',
      values: {
        dayType: 'school',
        lessons: [],
      },
      createdAt: '2026-03-18T08:00:00.000Z',
      updatedAt: '2026-03-18T08:00:00.000Z',
    };

    const statusMap = buildDailyReportCalendarStatusMap(reportsState);

    expect(statusMap.get('2026-03-10')).toBe('submitted');
    expect(statusMap.get('2026-03-18')).toBe('draft');
  });

  it('limits empty-day highlighting to the configured reporting range', () => {
    const range = resolveDailyReportCalendarRange({
      reportsSince: '2026-03-10',
      trainingStart: '2026-03-01',
      trainingEnd: '2026-03-31',
    });

    expect(isDateWithinDailyReportCalendarRange('2026-03-09', range)).toBe(
      false,
    );
    expect(isDateWithinDailyReportCalendarRange('2026-03-10', range)).toBe(
      true,
    );
    expect(isDateWithinDailyReportCalendarRange('2026-04-01', range)).toBe(
      false,
    );
  });
});
