import { toIsoDate } from '@/renderer/lib/iso-date';
import { listCompleteWeeksWithDailyReports } from '@/renderer/lib/report-values';
import { ReportsState } from '@/shared/reports/models';

const handledYearsStorageKey =
  'apprenticeship-reports.timetable-update-reminder.handled-years.v1';
const postponedYearsStorageKey =
  'apprenticeship-reports.timetable-update-reminder.postponed-years.v1';

function readStoredYears(storage: Storage | null, key: string): number[] {
  if (!storage) {
    return [];
  }

  try {
    const rawValue = storage.getItem(key);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (value): value is number =>
        Number.isInteger(value) && value >= 1900 && value <= 3000,
    );
  } catch {
    return [];
  }
}

function writeStoredYear(storage: Storage | null, key: string, year: number) {
  if (!storage) {
    return;
  }

  const years = new Set(readStoredYears(storage, key));
  years.add(year);

  try {
    storage.setItem(key, JSON.stringify(Array.from(years).sort()));
  } catch {
    // Storage errors should not block the app flow.
  }
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function resolveLastCompleteJulyWeekEnd(year: number): string {
  const cursor = new Date(Date.UTC(year, 6, 31));

  while (cursor.getUTCDay() !== 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return toIsoDate(cursor);
}

export function findDueTimetableUpdateReminderYear(
  reports: ReportsState,
  ignoredYears: number[] = [],
): number | null {
  const ignoredThroughYear = ignoredYears.length
    ? Math.max(...ignoredYears)
    : null;
  let dueYear: number | null = null;

  listCompleteWeeksWithDailyReports(reports).forEach(({ weeklyReport }) => {
    const match = /^(\d{4})-07-\d{2}$/.exec(weeklyReport.weekEnd);

    if (!match) {
      return;
    }

    const year = Number(match[1]);

    if (weeklyReport.weekEnd !== resolveLastCompleteJulyWeekEnd(year)) {
      return;
    }

    if (ignoredThroughYear !== null && year <= ignoredThroughYear) {
      return;
    }

    if (dueYear === null || year > dueYear) {
      dueYear = year;
    }
  });

  return dueYear;
}

export function readHandledTimetableReminderYears(): number[] {
  return readStoredYears(getLocalStorage(), handledYearsStorageKey);
}

export function markTimetableReminderYearHandled(year: number): void {
  writeStoredYear(getLocalStorage(), handledYearsStorageKey, year);
}

export function readPostponedTimetableReminderYears(): number[] {
  return readStoredYears(getSessionStorage(), postponedYearsStorageKey);
}

export function postponeTimetableReminderYearForSession(year: number): void {
  writeStoredYear(getSessionStorage(), postponedYearsStorageKey, year);
}
