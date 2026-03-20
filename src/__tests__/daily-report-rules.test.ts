import {
  buildWeeklyAggregates,
  buildWeeklySectionDayGroups,
} from '@/renderer/lib/report-values';
import { resolveAutoDayTypeFromBase } from '@/renderer/pages/DailyReportPage/components/day-type-defaults';
import { parseAbsenceSettings } from '@/shared/absence/settings';

describe('daily report rules', () => {
  it('keeps exact free-day reasons in weekly work and school blocks', () => {
    const dailyReports = [
      {
        id: 'day-work',
        weeklyReportId: 'week-1',
        date: '2026-03-09',
        values: {
          dayType: 'free',
          freeReason: 'Urlaub',
          freeDayCategory: 'work',
        },
        createdAt: '2026-03-09T08:00:00.000Z',
        updatedAt: '2026-03-09T08:00:00.000Z',
      },
      {
        id: 'day-school',
        weeklyReportId: 'week-1',
        date: '2026-03-10',
        values: {
          dayType: 'free',
          freeReason: 'Osterferien',
          freeDayCategory: 'school',
        },
        createdAt: '2026-03-10T08:00:00.000Z',
        updatedAt: '2026-03-10T08:00:00.000Z',
      },
    ];

    expect(buildWeeklyAggregates(dailyReports)).toEqual({
      workActivities: ['(Urlaub)'],
      trainings: [],
      schoolTopics: ['(Osterferien)'],
    });
    expect(buildWeeklySectionDayGroups(dailyReports)).toEqual({
      work: [
        {
          date: '2026-03-09',
          items: ['(Urlaub)'],
        },
      ],
      trainings: [],
      school: [
        {
          date: '2026-03-10',
          items: ['(Osterferien)'],
        },
      ],
    });
  });

  it('treats weekends and school holidays as free days with a concrete reason', () => {
    const weekend = resolveAutoDayTypeFromBase({
      date: '2026-03-14',
      baseDayType: 'work',
      absenceSettings: parseAbsenceSettings({}),
      currentYear: 2026,
    });
    const schoolHoliday = resolveAutoDayTypeFromBase({
      date: '2026-03-10',
      baseDayType: 'school',
      absenceSettings: parseAbsenceSettings({
        absence: {
          catalogsByYear: {
            '2026': {
              year: 2026,
              subdivisionCode: 'DE-NW',
              fetchedAt: '2026-03-10T08:00:00.000Z',
              publicHolidays: [],
              schoolHolidays: [
                {
                  id: 'holiday-1',
                  name: 'Osterferien',
                  startDate: '2026-03-10',
                  endDate: '2026-03-10',
                  nationwide: false,
                  subdivisionCodes: ['DE-NW'],
                },
              ],
            },
          },
        },
      }),
      currentYear: 2026,
    });

    expect(weekend).toEqual({
      dayType: 'free',
      freeReason: 'Wochenende',
      reason: {
        kind: 'weekend',
      },
    });
    expect(schoolHoliday).toEqual({
      dayType: 'free',
      freeReason: 'Osterferien',
      reason: {
        kind: 'school-holiday',
        name: 'Osterferien',
      },
    });
  });
});
