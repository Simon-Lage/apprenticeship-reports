import { z } from 'zod';

import { JsonObjectSchema } from '@/shared/common/json';
import { WeeklyReportHashRecordSchema } from '@/shared/reports/stable';

export const BackupConflictStrategySchema = z.enum([
  'latest-timestamp',
  'local',
  'backup',
]);

export const DailyReportRecordSchema = z.object({
  id: z.string().min(1),
  weeklyReportId: z.string().min(1),
  date: z.string().date(),
  values: JsonObjectSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const WeeklyReportRecordSchema = z.object({
  id: z.string().min(1),
  weekStart: z.string().date(),
  weekEnd: z.string().date(),
  values: JsonObjectSchema,
  dailyReportIds: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ReportsStateSchema = z.object({
  weeklyHashes: z.record(z.string(), WeeklyReportHashRecordSchema).default({}),
  weeklyReports: z.record(z.string(), WeeklyReportRecordSchema).default({}),
  dailyReports: z.record(z.string(), DailyReportRecordSchema).default({}),
});

export const BackupConflictSummarySchema = z.object({
  weeklyReportCount: z.number().int().nonnegative(),
  dailyReportCount: z.number().int().nonnegative(),
  conflictingWeekCount: z.number().int().nonnegative(),
  conflictingDailyReportCount: z.number().int().nonnegative(),
});

export type BackupConflictStrategy = z.infer<
  typeof BackupConflictStrategySchema
>;
export type DailyReportRecord = z.infer<typeof DailyReportRecordSchema>;
export type WeeklyReportRecord = z.infer<typeof WeeklyReportRecordSchema>;
export type ReportsState = z.infer<typeof ReportsStateSchema>;
export type BackupConflictSummary = z.infer<typeof BackupConflictSummarySchema>;

const defaultBackupConflictStrategy: BackupConflictStrategy =
  'latest-timestamp';

function dedupeIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function getWeekIdentity(report: WeeklyReportRecord): string {
  return `${report.weekStart}:${report.weekEnd}`;
}

function getLatestReport<T extends { updatedAt: string }>(
  currentValue: T,
  incomingValue: T,
): T {
  return incomingValue.updatedAt > currentValue.updatedAt
    ? incomingValue
    : currentValue;
}

function selectReportByStrategy<T extends { updatedAt: string }>(input: {
  currentValue: T;
  incomingValue: T;
  strategy: BackupConflictStrategy;
}): T {
  if (input.strategy === 'local') {
    return input.currentValue;
  }

  if (input.strategy === 'backup') {
    return input.incomingValue;
  }

  return getLatestReport(input.currentValue, input.incomingValue);
}

function getDailyReportsForWeek(
  reportsState: ReportsState,
  weeklyReport: WeeklyReportRecord,
): Record<string, DailyReportRecord> {
  const result: Record<string, DailyReportRecord> = {};

  weeklyReport.dailyReportIds.forEach((dailyReportId) => {
    const dailyReport = reportsState.dailyReports[dailyReportId];

    if (!dailyReport) {
      return;
    }

    result[dailyReport.date] = dailyReport;
  });

  return result;
}

function mergeDailyReportsForWeek(input: {
  currentState: ReportsState;
  incomingState: ReportsState;
  currentWeeklyReport: WeeklyReportRecord;
  incomingWeeklyReport: WeeklyReportRecord;
  strategy: BackupConflictStrategy;
}): {
  dailyReports: Record<string, DailyReportRecord>;
  dailyReportIds: string[];
  conflictingDailyReportCount: number;
} {
  const currentDailyReports = getDailyReportsForWeek(
    input.currentState,
    input.currentWeeklyReport,
  );
  const incomingDailyReports = getDailyReportsForWeek(
    input.incomingState,
    input.incomingWeeklyReport,
  );
  const nextDailyReports: Record<string, DailyReportRecord> = {};
  const dailyReportIds: string[] = [];
  let conflictingDailyReportCount = 0;

  const reportDates = Array.from(
    new Set([
      ...Object.keys(currentDailyReports),
      ...Object.keys(incomingDailyReports),
    ]),
  ).sort((left, right) => left.localeCompare(right));

  reportDates.forEach((date) => {
    const currentDailyReport = currentDailyReports[date];
    const incomingDailyReport = incomingDailyReports[date];

    if (currentDailyReport && incomingDailyReport) {
      conflictingDailyReportCount += 1;
      const selectedDailyReport = selectReportByStrategy({
        currentValue: currentDailyReport,
        incomingValue: incomingDailyReport,
        strategy: input.strategy,
      });

      nextDailyReports[selectedDailyReport.id] = selectedDailyReport;
      dailyReportIds.push(selectedDailyReport.id);
      return;
    }

    const selectedDailyReport = incomingDailyReport ?? currentDailyReport;

    if (!selectedDailyReport) {
      return;
    }

    nextDailyReports[selectedDailyReport.id] = selectedDailyReport;
    dailyReportIds.push(selectedDailyReport.id);
  });

  return {
    dailyReports: nextDailyReports,
    dailyReportIds,
    conflictingDailyReportCount,
  };
}

export function createDefaultReportsState(): ReportsState {
  return ReportsStateSchema.parse({
    weeklyHashes: {},
    weeklyReports: {},
    dailyReports: {},
  });
}

export function summarizeReportConflicts(
  currentState: ReportsState,
  incomingState: ReportsState,
): BackupConflictSummary {
  const currentWeeksByIdentity = new Map<string, WeeklyReportRecord>();
  const incomingWeeksByIdentity = new Map<string, WeeklyReportRecord>();

  Object.values(currentState.weeklyReports).forEach((weeklyReport) => {
    currentWeeksByIdentity.set(getWeekIdentity(weeklyReport), weeklyReport);
  });

  Object.values(incomingState.weeklyReports).forEach((weeklyReport) => {
    incomingWeeksByIdentity.set(getWeekIdentity(weeklyReport), weeklyReport);
  });

  let conflictingWeekCount = 0;
  let conflictingDailyReportCount = 0;

  incomingWeeksByIdentity.forEach((incomingWeeklyReport, identity) => {
    const currentWeeklyReport = currentWeeksByIdentity.get(identity);

    if (!currentWeeklyReport) {
      return;
    }

    conflictingWeekCount += 1;
    const currentDailyReports = getDailyReportsForWeek(
      currentState,
      currentWeeklyReport,
    );
    const incomingDailyReports = getDailyReportsForWeek(
      incomingState,
      incomingWeeklyReport,
    );

    Object.keys(incomingDailyReports).forEach((date) => {
      if (currentDailyReports[date]) {
        conflictingDailyReportCount += 1;
      }
    });
  });

  return BackupConflictSummarySchema.parse({
    weeklyReportCount: Object.keys(incomingState.weeklyReports).length,
    dailyReportCount: Object.keys(incomingState.dailyReports).length,
    conflictingWeekCount,
    conflictingDailyReportCount,
  });
}

export function mergeReportsState(input: {
  currentState: ReportsState;
  incomingState: ReportsState;
  strategy?: BackupConflictStrategy;
}): ReportsState {
  const strategy = input.strategy ?? defaultBackupConflictStrategy;
  const currentState = ReportsStateSchema.parse(input.currentState);
  const incomingState = ReportsStateSchema.parse(input.incomingState);
  const nextWeeklyReports: Record<string, WeeklyReportRecord> = {};
  const nextDailyReports: Record<string, DailyReportRecord> = {};
  const currentWeeksByIdentity = new Map<string, WeeklyReportRecord>();
  const incomingWeeksByIdentity = new Map<string, WeeklyReportRecord>();
  const nextWeeklyHashes: ReportsState['weeklyHashes'] = {};
  const conflictedWeeklyReportIds = new Set<string>();

  Object.values(currentState.weeklyReports).forEach((weeklyReport) => {
    currentWeeksByIdentity.set(getWeekIdentity(weeklyReport), weeklyReport);
  });

  Object.values(incomingState.weeklyReports).forEach((weeklyReport) => {
    incomingWeeksByIdentity.set(getWeekIdentity(weeklyReport), weeklyReport);
  });

  currentWeeksByIdentity.forEach((currentWeeklyReport, identity) => {
    const incomingWeeklyReport = incomingWeeksByIdentity.get(identity);

    if (incomingWeeklyReport) {
      return;
    }

    nextWeeklyReports[currentWeeklyReport.id] = currentWeeklyReport;
    currentWeeklyReport.dailyReportIds.forEach((dailyReportId) => {
      const dailyReport = currentState.dailyReports[dailyReportId];

      if (!dailyReport) {
        return;
      }

      nextDailyReports[dailyReport.id] = dailyReport;
    });
  });

  incomingWeeksByIdentity.forEach((incomingWeeklyReport, identity) => {
    const currentWeeklyReport = currentWeeksByIdentity.get(identity);

    if (!currentWeeklyReport) {
      nextWeeklyReports[incomingWeeklyReport.id] = incomingWeeklyReport;
      incomingWeeklyReport.dailyReportIds.forEach((dailyReportId) => {
        const dailyReport = incomingState.dailyReports[dailyReportId];

        if (!dailyReport) {
          return;
        }

        nextDailyReports[dailyReport.id] = dailyReport;
      });
      return;
    }

    const selectedWeeklyReport = selectReportByStrategy({
      currentValue: currentWeeklyReport,
      incomingValue: incomingWeeklyReport,
      strategy,
    });
    conflictedWeeklyReportIds.add(selectedWeeklyReport.id);
    const mergedDailyReports = mergeDailyReportsForWeek({
      currentState,
      incomingState,
      currentWeeklyReport,
      incomingWeeklyReport,
      strategy,
    });
    const latestDailyReportTimestamp = Object.values(
      mergedDailyReports.dailyReports,
    )
      .map((dailyReport) => dailyReport.updatedAt)
      .sort((left, right) => right.localeCompare(left))[0];

    Object.assign(nextDailyReports, mergedDailyReports.dailyReports);

    nextWeeklyReports[selectedWeeklyReport.id] = WeeklyReportRecordSchema.parse(
      {
        ...selectedWeeklyReport,
        dailyReportIds: dedupeIds(mergedDailyReports.dailyReportIds),
        updatedAt:
          latestDailyReportTimestamp &&
          latestDailyReportTimestamp > selectedWeeklyReport.updatedAt
            ? latestDailyReportTimestamp
            : selectedWeeklyReport.updatedAt,
      },
    );
  });

  const nextWeeklyReportIds = new Set(Object.keys(nextWeeklyReports));
  const hashSources = [currentState.weeklyHashes, incomingState.weeklyHashes];

  hashSources.forEach((hashSource) => {
    Object.entries(hashSource).forEach(([weeklyReportId, record]) => {
      if (
        !nextWeeklyReportIds.has(weeklyReportId) ||
        conflictedWeeklyReportIds.has(weeklyReportId)
      ) {
        return;
      }

      const previousRecord = nextWeeklyHashes[weeklyReportId];
      nextWeeklyHashes[weeklyReportId] = previousRecord
        ? record.createdAt > previousRecord.createdAt
          ? record
          : previousRecord
        : record;
    });
  });

  return ReportsStateSchema.parse({
    weeklyHashes: nextWeeklyHashes,
    weeklyReports: nextWeeklyReports,
    dailyReports: nextDailyReports,
  });
}
