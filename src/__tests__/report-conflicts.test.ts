import { listDailyReportAbsenceConflicts } from '@/renderer/lib/report-conflicts';
import { parseAbsenceSettings } from '@/shared/absence/settings';

describe('report conflicts', () => {
  it('detects a later sick absence against a stored work day', () => {
    const conflicts = listDailyReportAbsenceConflicts({
      dailyReports: [
        {
          id: 'day-1',
          weeklyReportId: 'week-1',
          date: '2026-03-09',
          values: {
            dayType: 'work',
            activities: ['Deployment'],
          },
          createdAt: '2026-03-09T08:00:00.000Z',
          updatedAt: '2026-03-09T08:00:00.000Z',
        },
      ],
      absenceSettings: parseAbsenceSettings({
        absence: {
          manualAbsences: [
            {
              id: 'absence-1',
              type: 'sick',
              startDate: '2026-03-09',
              endDate: '2026-03-09',
              label: 'Krank',
              note: null,
              createdAt: '2026-03-10T09:00:00.000Z',
              updatedAt: '2026-03-10T09:00:00.000Z',
            },
          ],
        },
      }),
    });

    expect(conflicts).toEqual([
      {
        date: '2026-03-09',
        storedDayType: 'work',
        storedFreeReason: '',
        expectedDayType: 'free',
        expectedFreeReason: 'Krank',
        reason: {
          kind: 'sick',
          label: 'Krank',
        },
      },
    ]);
  });

  it('does not create conflicts from base day-type differences without absences', () => {
    const conflicts = listDailyReportAbsenceConflicts({
      dailyReports: [
        {
          id: 'day-1',
          weeklyReportId: 'week-1',
          date: '2026-03-09',
          values: {
            dayType: 'school',
            lessons: [
              {
                lesson: 1,
                subject: 'Mathematik',
                teacher: 'Herr Alt',
                topics: ['Lineare Funktionen'],
              },
            ],
          },
          createdAt: '2026-03-09T08:00:00.000Z',
          updatedAt: '2026-03-09T08:00:00.000Z',
        },
      ],
      absenceSettings: parseAbsenceSettings({}),
    });

    expect(conflicts).toEqual([]);
  });
});
