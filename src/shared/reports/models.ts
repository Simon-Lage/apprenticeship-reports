import { z } from 'zod';

import {
  JsonObject,
  JsonObjectSchema,
  stableStringifyJson,
} from '@/shared/common/json';
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

export function createWeekIdentity(weekStart: string, weekEnd: string): string {
  return `${weekStart}:${weekEnd}`;
}

function getWeekIdentity(report: WeeklyReportRecord): string {
  return createWeekIdentity(report.weekStart, report.weekEnd);
}

function createStableHash(serialized: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function readWeekMetadata(values: JsonObject): {
  submitted: boolean;
  submittedToEmail: string | null;
  area: string | null;
} {
  return {
    submitted: typeof values.submitted === 'boolean' ? values.submitted : false,
    submittedToEmail:
      typeof values.submittedToEmail === 'string' &&
      values.submittedToEmail.trim().length
        ? values.submittedToEmail.trim()
        : null,
    area:
      typeof values.area === 'string' && values.area.trim().length
        ? values.area.trim()
        : null,
  };
}

export function createDailyReportContentHash(
  dailyReport: DailyReportRecord,
): string {
  return createStableHash(
    stableStringifyJson({
      date: dailyReport.date,
      content: dailyReport.values,
    }),
  );
}

export function createWeeklyReportContentHash(input: {
  weeklyReport: WeeklyReportRecord;
  dailyReports: DailyReportRecord[];
}): string {
  const sortedDailyReports = [...input.dailyReports].sort((left, right) => {
    const byDate = left.date.localeCompare(right.date);

    if (byDate !== 0) {
      return byDate;
    }

    return left.id.localeCompare(right.id);
  });
  const weekValues = JsonObjectSchema.parse(input.weeklyReport.values);
  const weekMetadata = readWeekMetadata(weekValues);
  const weekValuesForHash = Object.entries(weekValues).reduce<JsonObject>(
    (result, [key, value]) => {
      if (
        key === 'submitted' ||
        key === 'submittedToEmail' ||
        key === 'area'
      ) {
        return result;
      }

      result[key] = value;
      return result;
    },
    {},
  );

  return createStableHash(
    stableStringifyJson({
      weekStart: input.weeklyReport.weekStart,
      weekEnd: input.weeklyReport.weekEnd,
      submitted: weekMetadata.submitted,
      submittedToEmail: weekMetadata.submittedToEmail,
      area: weekMetadata.area,
      values: weekValuesForHash,
      days: sortedDailyReports.map((dailyReport) => ({
        date: dailyReport.date,
        content: dailyReport.values,
      })),
    }),
  );
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
  dailyReportsById: ReportsState['dailyReports'],
  weeklyReport: WeeklyReportRecord,
): DailyReportRecord[] {
  const result: DailyReportRecord[] = [];

  weeklyReport.dailyReportIds.forEach((dailyReportId) => {
    const dailyReport = dailyReportsById[dailyReportId];

    if (!dailyReport) {
      return;
    }

    result.push(dailyReport);
  });

  return result;
}

function mapDailyReportsByDate(
  dailyReports: DailyReportRecord[],
): Record<string, DailyReportRecord> {
  return dailyReports.reduce<Record<string, DailyReportRecord>>(
    (result, dailyReport) => {
      result[dailyReport.date] = dailyReport;
      return result;
    },
    {},
  );
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
} {
  const currentDailyReports = mapDailyReportsByDate(
    getDailyReportsForWeek(
      input.currentState.dailyReports,
      input.currentWeeklyReport,
    ),
  );
  const incomingDailyReports = mapDailyReportsByDate(
    getDailyReportsForWeek(
      input.incomingState.dailyReports,
      input.incomingWeeklyReport,
    ),
  );
  const nextDailyReports: Record<string, DailyReportRecord> = {};
  const dailyReportIds: string[] = [];
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

    const currentDailyReports = getDailyReportsForWeek(
      currentState.dailyReports,
      currentWeeklyReport,
    );
    const incomingDailyReports = getDailyReportsForWeek(
      incomingState.dailyReports,
      incomingWeeklyReport,
    );
    const currentWeekHash = createWeeklyReportContentHash({
      weeklyReport: currentWeeklyReport,
      dailyReports: currentDailyReports,
    });
    const incomingWeekHash = createWeeklyReportContentHash({
      weeklyReport: incomingWeeklyReport,
      dailyReports: incomingDailyReports,
    });

    if (currentWeekHash === incomingWeekHash) {
      return;
    }

    conflictingWeekCount += 1;
    const currentDailyReportsByDate = mapDailyReportsByDate(currentDailyReports);
    const incomingDailyReportsByDate = mapDailyReportsByDate(
      incomingDailyReports,
    );
    const reportDates = Array.from(
      new Set([
        ...Object.keys(currentDailyReportsByDate),
        ...Object.keys(incomingDailyReportsByDate),
      ]),
    );

    reportDates.forEach((date) => {
      const currentDailyReport = currentDailyReportsByDate[date];
      const incomingDailyReport = incomingDailyReportsByDate[date];

      if (!currentDailyReport || !incomingDailyReport) {
        conflictingDailyReportCount += 1;
        return;
      }

      if (
        createDailyReportContentHash(currentDailyReport) !==
        createDailyReportContentHash(incomingDailyReport)
      ) {
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
  weekConflictStrategies?: Record<string, BackupConflictStrategy>;
}): ReportsState {
  const strategy = input.strategy ?? defaultBackupConflictStrategy;
  const currentState = ReportsStateSchema.parse(input.currentState);
  const incomingState = ReportsStateSchema.parse(input.incomingState);
  const nextWeeklyReports: Record<string, WeeklyReportRecord> = {};
  const nextDailyReports: Record<string, DailyReportRecord> = {};
  const currentWeeksByIdentity = new Map<string, WeeklyReportRecord>();
  const incomingWeeksByIdentity = new Map<string, WeeklyReportRecord>();

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
    getDailyReportsForWeek(
      currentState.dailyReports,
      currentWeeklyReport,
    ).forEach((dailyReport) => {
      nextDailyReports[dailyReport.id] = dailyReport;
    });
  });

  incomingWeeksByIdentity.forEach((incomingWeeklyReport, identity) => {
    const currentWeeklyReport = currentWeeksByIdentity.get(identity);

    if (!currentWeeklyReport) {
      nextWeeklyReports[incomingWeeklyReport.id] = incomingWeeklyReport;
      getDailyReportsForWeek(
        incomingState.dailyReports,
        incomingWeeklyReport,
      ).forEach((dailyReport) => {
        nextDailyReports[dailyReport.id] = dailyReport;
      });
      return;
    }

    const currentDailyReports = getDailyReportsForWeek(
      currentState.dailyReports,
      currentWeeklyReport,
    );
    const incomingDailyReports = getDailyReportsForWeek(
      incomingState.dailyReports,
      incomingWeeklyReport,
    );
    const currentWeekHash = createWeeklyReportContentHash({
      weeklyReport: currentWeeklyReport,
      dailyReports: currentDailyReports,
    });
    const incomingWeekHash = createWeeklyReportContentHash({
      weeklyReport: incomingWeeklyReport,
      dailyReports: incomingDailyReports,
    });

    if (currentWeekHash === incomingWeekHash) {
      nextWeeklyReports[currentWeeklyReport.id] = currentWeeklyReport;
      currentDailyReports.forEach((dailyReport) => {
        nextDailyReports[dailyReport.id] = dailyReport;
      });
      return;
    }

    const strategyForWeek =
      input.weekConflictStrategies?.[identity] ?? strategy;
    const selectedWeeklyReport = selectReportByStrategy({
      currentValue: currentWeeklyReport,
      incomingValue: incomingWeeklyReport,
      strategy: strategyForWeek,
    });
    const mergedDailyReports = mergeDailyReportsForWeek({
      currentState,
      incomingState,
      currentWeeklyReport,
      incomingWeeklyReport,
      strategy: strategyForWeek,
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

  const nextWeeklyHashes = Object.values(nextWeeklyReports).reduce<
    ReportsState['weeklyHashes']
  >((result, weeklyReport) => {
    result[weeklyReport.id] = WeeklyReportHashRecordSchema.parse({
      weeklyReportId: weeklyReport.id,
      hash: createWeeklyReportContentHash({
        weeklyReport,
        dailyReports: getDailyReportsForWeek(nextDailyReports, weeklyReport),
      }),
      createdAt: weeklyReport.updatedAt,
    });
    return result;
  }, {});

  return ReportsStateSchema.parse({
    weeklyHashes: nextWeeklyHashes,
    weeklyReports: nextWeeklyReports,
    dailyReports: nextDailyReports,
  });
}
