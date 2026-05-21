import {
  findDueTimetableUpdateReminderYear,
  markTimetableReminderYearHandled,
  postponeTimetableReminderYearForSession,
  readHandledTimetableReminderYears,
  readPostponedTimetableReminderYears,
  resolveLastCompleteJulyWeekEnd,
} from '@/renderer/lib/timetable-update-reminder';
import {
  createDefaultReportsState,
  ReportsState,
} from '@/shared/reports/models';

const timestamp = '2026-01-01T00:00:00.000Z';

function addWeek(
  reports: ReportsState,
  input: {
    id: string;
    weekStart: string;
    weekEnd: string;
    dates: string[];
  },
) {
  const dailyReportIds = input.dates.map((date, index) => {
    const id = `${input.id}-day-${index + 1}`;

    reports.dailyReports[id] = {
      id,
      weeklyReportId: input.id,
      date,
      values: {
        dayType: 'work',
        activities: ['Arbeit'],
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return id;
  });

  reports.weeklyReports[input.id] = {
    id: input.id,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    values: {
      submitted: false,
    },
    dailyReportIds,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('timetable update reminder', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('resolves the last Sunday in July', () => {
    expect(resolveLastCompleteJulyWeekEnd(2026)).toBe('2026-07-26');
    expect(resolveLastCompleteJulyWeekEnd(2027)).toBe('2027-07-25');
  });

  it('is due when the complete week ending on the last Sunday in July exists', () => {
    const reports = createDefaultReportsState();

    addWeek(reports, {
      id: 'week-2026',
      weekStart: '2026-07-20',
      weekEnd: '2026-07-26',
      dates: [
        '2026-07-20',
        '2026-07-21',
        '2026-07-22',
        '2026-07-23',
        '2026-07-24',
        '2026-07-25',
        '2026-07-26',
      ],
    });

    expect(findDueTimetableUpdateReminderYear(reports)).toBe(2026);
  });

  it('ignores incomplete target weeks', () => {
    const reports = createDefaultReportsState();

    addWeek(reports, {
      id: 'week-2026',
      weekStart: '2026-07-20',
      weekEnd: '2026-07-26',
      dates: [
        '2026-07-20',
        '2026-07-21',
        '2026-07-22',
        '2026-07-23',
        '2026-07-24',
        '2026-07-25',
      ],
    });

    expect(findDueTimetableUpdateReminderYear(reports)).toBeNull();
  });

  it('ignores weeks whose Sunday is already in August', () => {
    const reports = createDefaultReportsState();

    addWeek(reports, {
      id: 'week-2026-august',
      weekStart: '2026-07-27',
      weekEnd: '2026-08-02',
      dates: [
        '2026-07-27',
        '2026-07-28',
        '2026-07-29',
        '2026-07-30',
        '2026-07-31',
        '2026-08-01',
        '2026-08-02',
      ],
    });

    expect(findDueTimetableUpdateReminderYear(reports)).toBeNull();
  });

  it('skips ignored years and returns the next due year', () => {
    const reports = createDefaultReportsState();

    addWeek(reports, {
      id: 'week-2026',
      weekStart: '2026-07-20',
      weekEnd: '2026-07-26',
      dates: [
        '2026-07-20',
        '2026-07-21',
        '2026-07-22',
        '2026-07-23',
        '2026-07-24',
        '2026-07-25',
        '2026-07-26',
      ],
    });
    addWeek(reports, {
      id: 'week-2027',
      weekStart: '2027-07-19',
      weekEnd: '2027-07-25',
      dates: [
        '2027-07-19',
        '2027-07-20',
        '2027-07-21',
        '2027-07-22',
        '2027-07-23',
        '2027-07-24',
        '2027-07-25',
      ],
    });

    expect(findDueTimetableUpdateReminderYear(reports, [2026])).toBe(2027);
  });

  it('does not fall back to older due years after a later year was ignored', () => {
    const reports = createDefaultReportsState();

    addWeek(reports, {
      id: 'week-2025',
      weekStart: '2025-07-21',
      weekEnd: '2025-07-27',
      dates: [
        '2025-07-21',
        '2025-07-22',
        '2025-07-23',
        '2025-07-24',
        '2025-07-25',
        '2025-07-26',
        '2025-07-27',
      ],
    });

    expect(findDueTimetableUpdateReminderYear(reports, [2026])).toBeNull();
  });

  it('stores handled years locally and postponed years for the session', () => {
    markTimetableReminderYearHandled(2026);
    postponeTimetableReminderYearForSession(2027);

    expect(readHandledTimetableReminderYears()).toEqual([2026]);
    expect(readPostponedTimetableReminderYears()).toEqual([2027]);
  });
});
