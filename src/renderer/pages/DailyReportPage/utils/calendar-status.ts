import { ReportsState } from '@/shared/reports/models';
import { isWeeklyReportSubmitted } from '@/shared/reports/edit-locks';

export type DailyReportCalendarStatus = 'submitted' | 'draft';

export type DailyReportCalendarRange = {
  start: string | null;
  end: string | null;
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function normalizeIsoDate(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || !isoDatePattern.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (parsed.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return value;
}

export function resolveDailyReportCalendarRange(input: {
  reportStartDate: string | null;
  trainingEnd: string | null;
}): DailyReportCalendarRange {
  return {
    start: normalizeIsoDate(input.reportStartDate),
    end: normalizeIsoDate(input.trainingEnd),
  };
}

export function isDateWithinDailyReportCalendarRange(
  dateValue: string,
  range: DailyReportCalendarRange,
): boolean {
  const normalizedDate = normalizeIsoDate(dateValue);

  if (!normalizedDate || !range.start || normalizedDate < range.start) {
    return false;
  }

  if (range.end && normalizedDate > range.end) {
    return false;
  }

  return true;
}

export function buildDailyReportCalendarStatusMap(
  reportsState: ReportsState | null,
): Map<string, DailyReportCalendarStatus> {
  const statusMap = new Map<string, DailyReportCalendarStatus>();

  if (!reportsState) {
    return statusMap;
  }

  Object.values(reportsState.weeklyReports).forEach((weeklyReport) => {
    const status: DailyReportCalendarStatus = isWeeklyReportSubmitted(
      weeklyReport,
    )
      ? 'submitted'
      : 'draft';

    weeklyReport.dailyReportIds.forEach((dailyReportId) => {
      const dailyReport = reportsState.dailyReports[dailyReportId];

      if (!dailyReport) {
        return;
      }

      statusMap.set(dailyReport.date, status);
    });
  });

  return statusMap;
}
