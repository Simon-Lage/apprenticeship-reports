import { ReportsState } from '@/shared/reports/models';
import { isWeeklyReportSubmitted } from '@/shared/reports/edit-locks';
import {
  addIsoDays,
  normalizeIsoDate,
  parseIsoDate,
  resolveWeekRangeForDate,
  toIsoDate,
  toLocalIsoDate,
} from '@/renderer/lib/iso-date';

type WeekdayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export { resolveWeekRangeForDate };

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

function resolveLatestKnownDate(
  reportsState: ReportsState | null,
): string | null {
  if (!reportsState) {
    return null;
  }

  return Object.values(reportsState.dailyReports).reduce<string | null>(
    (latest, report) => {
      const date = normalizeIsoDate(report.date);
      if (!date) {
        return latest;
      }

      return !latest || date > latest ? date : latest;
    },
    null,
  );
}

export function resolveDailyReportUpperLimit(input: {
  reportsState: ReportsState | null;
  trainingEnd: string | null;
  now?: Date;
}): string {
  const today = toLocalIsoDate(input.now ?? new Date());
  const latestDate = resolveLatestKnownDate(input.reportsState);
  const latestNextDate = latestDate ? addIsoDays(latestDate, 1) : null;
  const upperLimit =
    latestNextDate && latestNextDate > today ? latestNextDate : today;
  const trainingEnd = normalizeIsoDate(input.trainingEnd);

  return trainingEnd && trainingEnd < upperLimit ? trainingEnd : upperLimit;
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

    const next = addIsoDays(cursor, 1);
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

export function resolveInitialDailyReportDate(input: {
  reportsState: ReportsState | null;
  reportStartDate: string | null;
  trainingEnd: string | null;
  isAutoEnteredDate?: (date: string) => boolean;
  now?: Date;
}): string {
  const today = toLocalIsoDate(input.now ?? new Date());
  const baseline = normalizeIsoDate(input.reportStartDate) ?? today;
  const upperLimit = resolveDailyReportUpperLimit({
    reportsState: input.reportsState,
    trainingEnd: normalizeIsoDate(input.trainingEnd),
    now: input.now,
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

    const next = addIsoDays(cursor, 1);
    if (!next) {
      return cursor;
    }
    cursor = next;
  }

  return upperLimit;
}

export function resolveInitialWeeklyReportRange(input: {
  reportsState: ReportsState | null;
  reportStartDate: string | null;
  now?: Date;
}): { weekStart: string; weekEnd: string } {
  const today = toLocalIsoDate(input.now ?? new Date());
  const baseline = normalizeIsoDate(input.reportStartDate) ?? today;

  const baselineRange = resolveWeekRangeForDate(baseline) ?? {
    weekStart: baseline,
    weekEnd: baseline,
  };

  let cursorStart = baselineRange.weekStart;
  let cursorEnd = baselineRange.weekEnd;

  const limitDate = new Date((input.now ?? new Date()).getTime());
  limitDate.setFullYear(limitDate.getFullYear() + 2);
  const limit = toIsoDate(limitDate);

  const reports = input.reportsState?.weeklyReports || {};

  for (let i = 0; i < 520; i += 1) {
    if (cursorStart > limit) break;

    const currentStart = cursorStart;
    const currentEnd = cursorEnd;
    const report = Object.values(reports).find(
      (r) => r.weekStart === currentStart && r.weekEnd === currentEnd,
    );

    const isSubmitted = isWeeklyReportSubmitted(report);

    if (!isSubmitted) {
      return { weekStart: currentStart, weekEnd: currentEnd };
    }

    const nextStart = addIsoDays(cursorEnd, 1);
    const nextRange = nextStart ? resolveWeekRangeForDate(nextStart) : null;
    if (!nextRange) break;
    cursorStart = nextRange.weekStart;
    cursorEnd = nextRange.weekEnd;
  }

  return baselineRange;
}
