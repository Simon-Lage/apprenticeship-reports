import { DailyReportRecord, WeeklyReportRecord } from '@/shared/reports/models';
import { isWeeklyReportSubmitted } from '@/shared/reports/edit-locks';
import { resolveDailyReportEntryMode } from '@/shared/reports/entry-mode';
import { addIsoDays, resolveWeekRangeForDate } from '@/renderer/lib/iso-date';

export { resolveDailyReportEntryMode } from '@/shared/reports/entry-mode';

export type HomeStatsSnapshot = {
  backlogDays: number;
  sameDayRate: number;
  averageReportsPerEntryDay: number;
  manualCount: number;
  automaticCount: number;
  entryDayCount: number;
};

export type HomeWeeklyReportStatsSnapshot = {
  totalCount: number;
  submittedCount: number;
  toSendCount: number;
};

function toLocalIsoDate(value: string): string | null {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

function isDateInReportRange(input: {
  date: string;
  startDate: string;
  endDate: string | null;
}): boolean {
  if (input.date < input.startDate) {
    return false;
  }

  if (input.endDate && input.date > input.endDate) {
    return false;
  }

  return true;
}

function clampNonNegative(value: number): number {
  return value < 0 ? 0 : value;
}

function listDateRange(startDate: string, endDate: string): string[] {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
    startDate > endDate
  ) {
    return [];
  }

  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const result: string[] = [];
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, startDay));

  while (cursor.toISOString().slice(0, 10) <= endDate) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

function isWeekendDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (parsed.toISOString().slice(0, 10) !== value) {
    return false;
  }

  const weekday = parsed.getUTCDay();
  return weekday === 0 || weekday === 6;
}

function resolveDailyBacklogEndDate(input: {
  reportEndDate: string | null;
  today: string;
}): string | null {
  const yesterday = addIsoDays(input.today, -1);

  if (!yesterday) {
    return null;
  }

  return input.reportEndDate && input.reportEndDate < yesterday
    ? input.reportEndDate
    : yesterday;
}

function listDueWeeklyReportRanges(input: {
  reportStartDate: string | null;
  reportEndDate: string | null;
  today: string;
}): Array<{ weekStart: string; weekEnd: string }> {
  if (!input.reportStartDate) {
    return [];
  }

  const endDate =
    input.reportEndDate && input.reportEndDate < input.today
      ? input.reportEndDate
      : input.today;
  const firstWeek = resolveWeekRangeForDate(input.reportStartDate);

  if (!firstWeek || input.reportStartDate > endDate) {
    return [];
  }

  const ranges: Array<{ weekStart: string; weekEnd: string }> = [];
  let cursor: string | null = input.reportStartDate;

  for (let attempts = 0; attempts < 5200 && cursor; attempts += 1) {
    const range = resolveWeekRangeForDate(cursor);

    if (!range || range.weekEnd > endDate) {
      break;
    }

    ranges.push({
      weekStart:
        cursor === input.reportStartDate
          ? input.reportStartDate
          : range.weekStart,
      weekEnd: range.weekEnd,
    });
    cursor = addIsoDays(range.weekEnd, 1);
  }

  return ranges;
}

export function buildHomeStatsSnapshot(input: {
  dailyReports: DailyReportRecord[];
  reportStartDate: string | null;
  reportEndDate: string | null;
  today: string;
}): HomeStatsSnapshot {
  const dailyReports = [...input.dailyReports].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const createdDates = dailyReports
    .map((dailyReport) => toLocalIsoDate(dailyReport.createdAt))
    .filter((value): value is string => Boolean(value));
  const sameDayCount = dailyReports.filter(
    (dailyReport) => toLocalIsoDate(dailyReport.createdAt) === dailyReport.date,
  ).length;
  const entryDays = new Set(createdDates);
  const reportDates = new Set(
    dailyReports.map((dailyReport) => dailyReport.date),
  );
  const automaticCount = dailyReports.filter(
    (dailyReport) =>
      resolveDailyReportEntryMode(dailyReport.values) === 'automatic',
  ).length;
  const manualCount = clampNonNegative(dailyReports.length - automaticCount);
  const effectiveEndDate =
    resolveDailyBacklogEndDate({
      reportEndDate: input.reportEndDate,
      today: input.today,
    }) ?? input.today;
  const expectedDates =
    input.reportStartDate && input.reportStartDate <= effectiveEndDate
      ? listDateRange(input.reportStartDate, effectiveEndDate).filter(
          (date) => !isWeekendDate(date),
        )
      : [];
  const missingCount = expectedDates.filter(
    (date) => !reportDates.has(date),
  ).length;

  return {
    backlogDays: missingCount,
    sameDayRate: dailyReports.length ? sameDayCount / dailyReports.length : 0,
    averageReportsPerEntryDay: entryDays.size
      ? dailyReports.length / entryDays.size
      : 0,
    manualCount,
    automaticCount,
    entryDayCount: entryDays.size,
  };
}

export function buildHomeWeeklyReportStatsSnapshot(input: {
  weeklyReports: WeeklyReportRecord[];
  reportStartDate: string | null;
  reportEndDate: string | null;
  today: string;
}): HomeWeeklyReportStatsSnapshot {
  const { reportStartDate } = input;

  if (!reportStartDate) {
    return {
      totalCount: 0,
      submittedCount: 0,
      toSendCount: 0,
    };
  }

  const dueRanges = listDueWeeklyReportRanges({
    reportStartDate,
    reportEndDate: input.reportEndDate,
    today: input.today,
  });
  const submittedCount = input.weeklyReports.filter(
    (weeklyReport) =>
      isWeeklyReportSubmitted(weeklyReport) &&
      isDateInReportRange({
        date: weeklyReport.weekEnd,
        startDate: reportStartDate,
        endDate:
          input.reportEndDate && input.reportEndDate < input.today
            ? input.reportEndDate
            : input.today,
      }),
  ).length;

  return {
    totalCount: dueRanges.length,
    submittedCount,
    toSendCount: Math.max(dueRanges.length - submittedCount, 0),
  };
}
