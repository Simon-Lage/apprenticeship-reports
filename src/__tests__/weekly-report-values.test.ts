import {
  buildWeeklySectionDayGroups,
  parseWeeklyReportValues,
} from '@/renderer/lib/report-values';
import { DailyReportRecord } from '@/shared/reports/models';

describe('parseWeeklyReportValues', () => {
  it('accepts nullable week area values from persisted weekly reports', () => {
    expect(
      parseWeeklyReportValues({
        area: null,
      }).area,
    ).toBe('');
  });
});

describe('buildWeeklySectionDayGroups', () => {
  it('groups school lesson topics by subject and teacher without lesson numbers', () => {
    const dailyReport: DailyReportRecord = {
      id: 'day-1',
      weeklyReportId: 'week-1',
      date: '2026-01-23',
      createdAt: '2026-01-23T08:00:00.000Z',
      updatedAt: '2026-01-23T08:00:00.000Z',
      values: {
        dayType: 'school',
        lessons: [
          {
            lesson: 1,
            subject: 'IT 11',
            teacher: 'Zillinski',
            topics: ['Vorträge zu Algorithmen vorbereiten'],
          },
          {
            lesson: 3,
            subject: 'IT 10',
            teacher: 'Zillinski',
            topics: [
              'Vorträge zu Algorithmen vorbereiten',
              'Moodle Kurs über Design',
            ],
          },
          {
            lesson: 5,
            subject: 'Politik/Deutsch',
            teacher: 'Tattermusch',
            topics: ['Klausur'],
          },
        ],
      },
    };

    expect(buildWeeklySectionDayGroups([dailyReport]).school[0].items).toEqual([
      'IT 11 (Zillinski): Vorträge zu Algorithmen vorbereiten',
      'IT 10 (Zillinski):\n    ◦ Vorträge zu Algorithmen vorbereiten\n    ◦ Moodle Kurs über Design',
      'Politik/Deutsch (Tattermusch): Klausur',
    ]);
  });
});
