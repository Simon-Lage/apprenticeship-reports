import { ReportsState } from '@/shared/reports/models';

type WeekdayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function toLocalIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date | null {
  if (!isoDatePattern.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const normalized = parsed.toISOString().slice(0, 10);

  if (normalized !== value) {
    return null;
  }

  return parsed;
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string | null {
  const parsed = parseIsoDate(value);

  if (!parsed) {
    return null;
  }

  parsed.setUTCDate(parsed.getUTCDate() + days);
  return toIsoDate(parsed);
}

function normalizeIsoDate(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  return parseIsoDate(value) ? value : null;
}

function collectKnownDates(reportsState: ReportsState | null): Set<string> {
  if (!reportsState) {
    return new Set();
  }

  return new Set(
    Object.values(reportsState.dailyReports)
      .map((report) => normalizeIsoDate(report.date))
      .filter((value): value is string => Boolean(value)),
  );
}

function resolveSearchUpperLimit(input: {
  today: string;
  trainingEnd: string | null;
}): string {
  if (!input.trainingEnd) {
    return input.today;
  }

  return input.trainingEnd < input.today ? input.trainingEnd : input.today;
}

export function isWeekendDate(dateValue: string): boolean {
  const parsed = parseIsoDate(dateValue);

  if (!parsed) {
    return false;
  }

  const weekday = parsed.getUTCDay();
  return weekday === 0 || weekday === 6;
}

function resolveCandidateDate(input: {
  startDate: string;
  reportsState: ReportsState | null;
  isAutoEnteredDate?: (date: string) => boolean;
}): string {
  const knownDates = collectKnownDates(input.reportsState);
  let cursor = input.startDate;

  for (let attempts = 0; attempts < 36600; attempts += 1) {
    if (
      !knownDates.has(cursor) &&
      !isWeekendDate(cursor) &&
      !input.isAutoEnteredDate?.(cursor)
    ) {
      return cursor;
    }

    const next = addDays(cursor, 1);
    if (!next) {
      return cursor;
    }
    cursor = next;
  }

  return cursor;
}

export function resolveDayKey(dateValue: string): WeekdayKey | null {
  const parsed = parseIsoDate(dateValue);

  if (!parsed) {
    return null;
  }

  const weekday = parsed.getUTCDay();

  if (weekday === 1) return 'monday';
  if (weekday === 2) return 'tuesday';
  if (weekday === 3) return 'wednesday';
  if (weekday === 4) return 'thursday';
  if (weekday === 5) return 'friday';
  return null;
}

export function resolveWeekRangeForDate(
  dateValue: string,
): { weekStart: string; weekEnd: string } | null {
  const parsed = parseIsoDate(dateValue);

  if (!parsed) {
    return null;
  }

  const weekday = parsed.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  parsed.setUTCDate(parsed.getUTCDate() + mondayOffset);
  const weekStart = toIsoDate(parsed);
  parsed.setUTCDate(parsed.getUTCDate() + 6);
  const weekEnd = toIsoDate(parsed);

  return {
    weekStart,
    weekEnd,
  };
}

export function resolveInitialDailyReportDate(input: {
  reportsState: ReportsState | null;
  trainingStart: string | null;
  trainingEnd: string | null;
  reportsSince: string | null;
  isAutoEnteredDate?: (date: string) => boolean;
  now?: Date;
}): string {
  const today = toLocalIsoDate(input.now ?? new Date());
  const baseline =
    normalizeIsoDate(input.reportsSince) ??
    normalizeIsoDate(input.trainingStart) ??
    today;
  const upperLimit = resolveSearchUpperLimit({
    today,
    trainingEnd: normalizeIsoDate(input.trainingEnd),
  });
  const knownDates = collectKnownDates(input.reportsState);

  if (baseline > upperLimit) {
    return resolveCandidateDate({
      startDate: baseline,
      reportsState: input.reportsState,
      isAutoEnteredDate: input.isAutoEnteredDate,
    });
  }

  let cursor = baseline;
  while (cursor <= upperLimit) {
    if (
      !knownDates.has(cursor) &&
      !isWeekendDate(cursor) &&
      !input.isAutoEnteredDate?.(cursor)
    ) {
      return cursor;
    }

    const next = addDays(cursor, 1);
    if (!next) {
      return cursor;
    }
    cursor = next;
  }

  const nextDate = addDays(upperLimit, 1) ?? upperLimit;

  return resolveCandidateDate({
    startDate: nextDate,
    reportsState: input.reportsState,
    isAutoEnteredDate: input.isAutoEnteredDate,
  });
}
