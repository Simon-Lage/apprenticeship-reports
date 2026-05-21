import {
  buildWeeklyAggregates,
  buildWeeklySectionDayGroups,
} from '@/renderer/lib/report-values';
import { resolveAutoDayTypeFromBase } from '@/renderer/pages/DailyReportPage/utils/day-type-defaults';
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

  it('keeps vacation work entries and marks the vacation as half day', () => {
    const dailyReports = [
      {
        id: 'day-vacation-work',
        weeklyReportId: 'week-1',
        date: '2026-03-09',
        values: {
          dayType: 'free',
          freeReason: 'Urlaub',
          freeDayCategory: 'work',
          activities: ['Tickets bearbeitet'],
          trainings: ['Datenschutzunterweisung'],
          schoolTopics: [],
          lessons: [],
        },
        createdAt: '2026-03-09T08:00:00.000Z',
        updatedAt: '2026-03-09T08:00:00.000Z',
      },
    ];

    expect(buildWeeklyAggregates(dailyReports)).toEqual({
      workActivities: ['(Urlaub (halbtags))', 'Tickets bearbeitet'],
      trainings: ['Datenschutzunterweisung'],
      schoolTopics: [],
    });
    expect(buildWeeklySectionDayGroups(dailyReports)).toEqual({
      work: [
        {
          date: '2026-03-09',
          items: ['(Urlaub (halbtags))', 'Tickets bearbeitet'],
        },
      ],
      trainings: [
        {
          date: '2026-03-09',
          items: ['Datenschutzunterweisung'],
        },
      ],
      school: [],
    });
  });

  it('omits free weekend days from weekly report sections unless content exists', () => {
    const dailyReports = [
      {
        id: 'weekend-free',
        weeklyReportId: 'week-1',
        date: '2026-03-14',
        values: {
          dayType: 'free',
          freeReason: 'Wochenende',
          freeDayCategory: 'work',
          activities: [],
          trainings: [],
          schoolTopics: [],
          lessons: [],
        },
        createdAt: '2026-03-14T08:00:00.000Z',
        updatedAt: '2026-03-14T08:00:00.000Z',
      },
      {
        id: 'weekend-holiday',
        weeklyReportId: 'week-1',
        date: '2026-03-15',
        values: {
          dayType: 'free',
          freeReason: 'Feiertag',
          freeDayCategory: 'work',
          activities: [],
          trainings: [],
          schoolTopics: [],
          lessons: [],
        },
        createdAt: '2026-03-15T08:00:00.000Z',
        updatedAt: '2026-03-15T08:00:00.000Z',
      },
      {
        id: 'weekend-work',
        weeklyReportId: 'week-1',
        date: '2026-03-21',
        values: {
          dayType: 'work',
          freeReason: '',
          freeDayCategory: null,
          activities: ['Inventur'],
          trainings: [],
          schoolTopics: [],
          lessons: [],
        },
        createdAt: '2026-03-21T08:00:00.000Z',
        updatedAt: '2026-03-21T08:00:00.000Z',
      },
    ];

    expect(buildWeeklySectionDayGroups(dailyReports)).toEqual({
      work: [
        {
          date: '2026-03-21',
          items: ['Inventur'],
        },
      ],
      trainings: [],
      school: [],
    });
  });

  it('formats school lessons with subject and teacher in weekly sections', () => {
    const dailyReports = [
      {
        id: 'school-day',
        weeklyReportId: 'week-1',
        date: '2026-03-10',
        values: {
          dayType: 'school',
          activities: [],
          trainings: [],
          schoolTopics: [],
          lessons: [
            {
              lesson: 1,
              subject: 'Mathematik',
              teacher: 'Herr Alt',
              topics: ['Lineare Funktionen'],
            },
          ],
        },
        createdAt: '2026-03-10T08:00:00.000Z',
        updatedAt: '2026-03-10T08:00:00.000Z',
      },
    ];

    expect(buildWeeklyAggregates(dailyReports).schoolTopics).toEqual([
      'Mathematik (Herr Alt): Lineare Funktionen',
    ]);
    expect(buildWeeklySectionDayGroups(dailyReports).school).toEqual([
      {
        date: '2026-03-10',
        items: ['Mathematik (Herr Alt): Lineare Funktionen'],
      },
    ]);
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
