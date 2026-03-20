import { DailyReportRecord } from '@/shared/reports/models';

export type DailyReportEntryMode = 'manual' | 'automatic';

export type HomeStatsSnapshot = {
  backlogDays: number;
  sameDayRate: number;
  averageReportsPerEntryDay: number;
  manualCount: number;
  automaticCount: number;
  entryDayCount: number;
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

export function resolveDailyReportEntryMode(
  values: unknown,
): DailyReportEntryMode {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return 'manual';
  }

  const entryMode =
    'entryMode' in values && typeof values.entryMode === 'string'
      ? values.entryMode
      : null;

  if (entryMode === 'automatic') {
    return 'automatic';
  }

  if (entryMode === 'manual') {
    return 'manual';
  }

  const legacyType =
    'type' in values && typeof values.type === 'string' ? values.type : null;
  const dayType =
    'dayType' in values && typeof values.dayType === 'string'
      ? values.dayType
      : null;

  if (legacyType === 'free' && !dayType) {
    return 'automatic';
  }

  return 'manual';
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
    input.reportEndDate && input.reportEndDate < input.today
      ? input.reportEndDate
      : input.today;
  const expectedDates =
    input.reportStartDate && input.reportStartDate <= effectiveEndDate
      ? listDateRange(input.reportStartDate, effectiveEndDate)
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
