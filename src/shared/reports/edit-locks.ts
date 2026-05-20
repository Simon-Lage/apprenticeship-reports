import { ReportsState, WeeklyReportRecord } from '@/shared/reports/models';

export type WeeklyReportSubmissionBlock =
  | {
      kind: 'future-week';
      blockingWeek: null;
    }
  | {
      kind: 'previous-week-unsubmitted';
      blockingWeek: {
        weekStart: string;
        weekEnd: string;
        weeklyReport: WeeklyReportRecord | null;
      };
    };

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addIsoDays(value: string, amount: number): string | null {
  if (!isIsoDate(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== value) return null;

  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function resolveWeekRangeForDate(value: string): {
  weekStart: string;
  weekEnd: string;
} | null {
  if (!isIsoDate(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== value) return null;

  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  const weekStart = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 6);
  const weekEnd = date.toISOString().slice(0, 10);

  return {
    weekStart,
    weekEnd,
  };
}

function findWeeklyReportByRange(input: {
  reportsState: ReportsState;
  weekStart: string;
  weekEnd: string;
}): WeeklyReportRecord | null {
  return (
    Object.values(input.reportsState.weeklyReports).find(
      (weeklyReport) =>
        weeklyReport.weekStart === input.weekStart &&
        weeklyReport.weekEnd === input.weekEnd,
    ) ?? null
  );
}

export function isWeeklyReportSubmitted(
  weeklyReport: WeeklyReportRecord | null | undefined,
): boolean {
  return weeklyReport?.values.submitted === true;
}

export function resolveLatestSubmittedWeeklyReportEndDate(
  reportsState: ReportsState | null | undefined,
): string | null {
  if (!reportsState) return null;

  return Object.values(reportsState.weeklyReports).reduce<string | null>(
    (latestEndDate, weeklyReport) => {
      if (
        !isWeeklyReportSubmitted(weeklyReport) ||
        !isIsoDate(weeklyReport.weekEnd)
      ) {
        return latestEndDate;
      }

      if (!latestEndDate || weeklyReport.weekEnd > latestEndDate) {
        return weeklyReport.weekEnd;
      }

      return latestEndDate;
    },
    null,
  );
}

export function resolveFirstEditableDateAfterSubmittedReports(
  reportsState: ReportsState | null | undefined,
): string | null {
  const latestSubmittedEndDate =
    resolveLatestSubmittedWeeklyReportEndDate(reportsState);
  if (!latestSubmittedEndDate) return null;

  return addIsoDays(latestSubmittedEndDate, 1);
}

export function isDateLockedBySubmittedReports(input: {
  date: string;
  reportsState: ReportsState | null | undefined;
}): boolean {
  const latestSubmittedEndDate = resolveLatestSubmittedWeeklyReportEndDate(
    input.reportsState,
  );

  return Boolean(
    latestSubmittedEndDate &&
      isIsoDate(input.date) &&
      input.date <= latestSubmittedEndDate,
  );
}

export function isDateRangeLockedBySubmittedReports(input: {
  startDate: string;
  endDate: string;
  reportsState: ReportsState | null | undefined;
}): boolean {
  const latestSubmittedEndDate = resolveLatestSubmittedWeeklyReportEndDate(
    input.reportsState,
  );

  if (!latestSubmittedEndDate) return false;
  if (!isIsoDate(input.startDate) || !isIsoDate(input.endDate)) return false;

  return input.startDate <= latestSubmittedEndDate;
}

export function resolveOldestUnsubmittedWeeklyReportSinceStart(input: {
  reportsState: ReportsState | null | undefined;
  reportStartDate: string | null | undefined;
  beforeWeekStart: string;
}): WeeklyReportSubmissionBlock['blockingWeek'] {
  if (!input.reportsState || !input.reportStartDate) return null;
  if (!isIsoDate(input.beforeWeekStart)) return null;

  let cursor = resolveWeekRangeForDate(input.reportStartDate);

  for (let attempts = 0; cursor && attempts < 5200; attempts += 1) {
    if (cursor.weekStart >= input.beforeWeekStart) {
      return null;
    }

    const weeklyReport = findWeeklyReportByRange({
      reportsState: input.reportsState,
      weekStart: cursor.weekStart,
      weekEnd: cursor.weekEnd,
    });

    if (!isWeeklyReportSubmitted(weeklyReport)) {
      return {
        weekStart: cursor.weekStart,
        weekEnd: cursor.weekEnd,
        weeklyReport,
      };
    }

    const nextWeekStart = addIsoDays(cursor.weekEnd, 1);
    cursor = nextWeekStart ? resolveWeekRangeForDate(nextWeekStart) : null;
  }

  return null;
}

export function resolveWeeklyReportSubmissionBlock(input: {
  reportsState: ReportsState | null | undefined;
  reportStartDate: string | null | undefined;
  weekStart: string;
  weekEnd: string;
  today: string;
}): WeeklyReportSubmissionBlock | null {
  if (!isIsoDate(input.weekStart) || !isIsoDate(input.weekEnd)) return null;

  if (isIsoDate(input.today) && input.weekEnd > input.today) {
    return {
      kind: 'future-week',
      blockingWeek: null,
    };
  }

  const blockingWeek = resolveOldestUnsubmittedWeeklyReportSinceStart({
    reportsState: input.reportsState,
    reportStartDate: input.reportStartDate,
    beforeWeekStart: input.weekStart,
  });

  if (blockingWeek) {
    return {
      kind: 'previous-week-unsubmitted',
      blockingWeek,
    };
  }

  return null;
}
