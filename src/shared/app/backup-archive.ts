import { z } from 'zod';

import { ensureJsonObject, JsonObjectSchema } from '@/shared/common/json';
import {
  BackupConflictStrategySchema,
  createWeekIdentity,
  createDefaultReportsState,
  createWeeklyReportContentHash,
  DailyReportRecordSchema,
  ReportsState,
  ReportsStateSchema,
  summarizeReportConflicts,
  WeeklyReportRecordSchema,
} from '@/shared/reports/models';
import { WeeklyReportHashRecordSchema } from '@/shared/reports/stable';

export const DatabaseBackupDaySchema = z.object({
  date: z.string().date(),
  updatedAt: z.string().datetime(),
  content: JsonObjectSchema,
}).strict();

export const DatabaseBackupWeekSchema = z.object({
  weekStart: z.string().date(),
  weekEnd: z.string().date(),
  updatedAt: z.string().datetime(),
  hash: z.string().min(1),
  submitted: z.boolean(),
  submittedToEmail: z.string().min(1).nullable().default(null),
  area: z.string().min(1).nullable().default(null),
  values: JsonObjectSchema.default({}),
  days: z.array(DatabaseBackupDaySchema),
}).strict();

export const DatabaseBackupReportsSchema = z.object({
  weeks: z.array(DatabaseBackupWeekSchema).min(1),
}).strict();

export const DatabaseBackupEnvelopeSchema = z.object({
  exportedAt: z.string().datetime(),
  source: z.literal('reports-json'),
  reports: DatabaseBackupReportsSchema,
}).strict();

export const DatabaseBackupSummarySchema = z.object({
  weeklyReportCount: z.number().int().nonnegative(),
  dailyReportCount: z.number().int().nonnegative(),
  weeklyHashCount: z.number().int().nonnegative(),
});

export const BackupImportConflictSummarySchema = z.object({
  weeklyReportCount: z.number().int().nonnegative(),
  dailyReportCount: z.number().int().nonnegative(),
  conflictingWeekCount: z.number().int().nonnegative(),
  conflictingDailyReportCount: z.number().int().nonnegative(),
});

export const BackupImportConflictWeekSchema = z
  .object({
    weekIdentity: z.string().min(1),
    weekStart: z.string().date(),
    weekEnd: z.string().date(),
    current: DatabaseBackupWeekSchema,
    incoming: DatabaseBackupWeekSchema,
    defaultStrategy: BackupConflictStrategySchema,
  })
  .strict();

export const DatabaseBackupImportPreviewSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  current: DatabaseBackupSummarySchema,
  incoming: DatabaseBackupSummarySchema,
  conflictSummary: BackupImportConflictSummarySchema,
  conflictingWeeks: z.array(BackupImportConflictWeekSchema),
  defaultConflictStrategy: BackupConflictStrategySchema,
  availableConflictStrategies: z.array(BackupConflictStrategySchema),
  warning: z.string().min(1),
});

export type DatabaseBackupEnvelope = z.infer<
  typeof DatabaseBackupEnvelopeSchema
>;
export type DatabaseBackupSummary = z.infer<typeof DatabaseBackupSummarySchema>;
export type BackupImportConflictWeek = z.infer<
  typeof BackupImportConflictWeekSchema
>;
export type DatabaseBackupImportPreview = z.infer<
  typeof DatabaseBackupImportPreviewSchema
>;

function readWeekMetadata(values: Record<string, unknown>): {
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

function createInternalWeekId(weekStart: string, weekEnd: string): string {
  return `week-${weekStart}-${weekEnd}`;
}

function createInternalDayId(weekId: string, date: string): string {
  return `${weekId}-${date}`;
}

function normalizeWeekValues(week: z.infer<typeof DatabaseBackupWeekSchema>) {
  return ensureJsonObject({
    ...ensureJsonObject(week.values),
    submitted: week.submitted,
    submittedToEmail: week.submittedToEmail,
    area: week.area,
  });
}

function assertWeekHashIsValid(
  week: z.infer<typeof DatabaseBackupWeekSchema>,
): void {
  const weekId = createInternalWeekId(week.weekStart, week.weekEnd);
  const dailyReports = week.days.map((day) =>
    DailyReportRecordSchema.parse({
      id: createInternalDayId(weekId, day.date),
      weeklyReportId: weekId,
      date: day.date,
      values: day.content,
      createdAt: day.updatedAt,
      updatedAt: day.updatedAt,
    }),
  );
  const weeklyReport = WeeklyReportRecordSchema.parse({
    id: weekId,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    values: normalizeWeekValues(week),
    dailyReportIds: dailyReports.map((dailyReport) => dailyReport.id),
    createdAt: week.updatedAt,
    updatedAt: week.updatedAt,
  });
  const expectedHash = createWeeklyReportContentHash({
    weeklyReport,
    dailyReports,
  });

  if (week.hash !== expectedHash) {
    throw new Error(
      `Backup week hash mismatch for ${week.weekStart}..${week.weekEnd}.`,
    );
  }
}

function validateParsedEnvelope(envelope: DatabaseBackupEnvelope): void {
  const weekIdentitySet = new Set<string>();

  envelope.reports.weeks.forEach((week) => {
    if (week.weekEnd < week.weekStart) {
      throw new Error(
        `Invalid week range ${week.weekStart}..${week.weekEnd} in backup.`,
      );
    }

    const identity = createWeekIdentity(week.weekStart, week.weekEnd);

    if (weekIdentitySet.has(identity)) {
      throw new Error(`Duplicate week range ${identity} in backup.`);
    }

    weekIdentitySet.add(identity);

    const dayDateSet = new Set<string>();

    week.days.forEach((day) => {
      if (dayDateSet.has(day.date)) {
        throw new Error(`Duplicate day ${day.date} in backup week ${identity}.`);
      }

      dayDateSet.add(day.date);
    });
    assertWeekHashIsValid(week);
  });
}

function createBackupWeekFromReports(input: {
  reports: ReportsState;
  weeklyReportId: string;
}): z.infer<typeof DatabaseBackupWeekSchema> {
  const weeklyReport = input.reports.weeklyReports[input.weeklyReportId];
  const dailyReports = weeklyReport.dailyReportIds
    .map((dailyReportId) => input.reports.dailyReports[dailyReportId])
    .filter(
      (dailyReport): dailyReport is NonNullable<typeof dailyReport> =>
        Boolean(dailyReport),
    )
    .sort((left, right) => left.date.localeCompare(right.date));
  const weekValues = ensureJsonObject(weeklyReport.values);
  const metadata = readWeekMetadata(weekValues);
  const normalizedWeekValues = ensureJsonObject({
    ...weekValues,
    submitted: metadata.submitted,
    submittedToEmail: metadata.submittedToEmail,
    area: metadata.area,
  });
  const weeklyReportForHash = WeeklyReportRecordSchema.parse({
    ...weeklyReport,
    values: normalizedWeekValues,
  });
  const hash = createWeeklyReportContentHash({
    weeklyReport: weeklyReportForHash,
    dailyReports,
  });

  return DatabaseBackupWeekSchema.parse({
    weekStart: weeklyReport.weekStart,
    weekEnd: weeklyReport.weekEnd,
    updatedAt: weeklyReport.updatedAt,
    hash,
    submitted: metadata.submitted,
    submittedToEmail: metadata.submittedToEmail,
    area: metadata.area,
    values: normalizedWeekValues,
    days: dailyReports.map((dailyReport) => ({
      date: dailyReport.date,
      updatedAt: dailyReport.updatedAt,
      content: dailyReport.values,
    })),
  });
}

export function createDatabaseBackupEnvelope(
  reports: ReportsState,
  exportedAt: string,
): DatabaseBackupEnvelope {
  const parsedReports = ReportsStateSchema.parse(reports);
  const weeklyReports = Object.values(parsedReports.weeklyReports).sort(
    (left, right) => {
      const byStart = left.weekStart.localeCompare(right.weekStart);

      if (byStart !== 0) {
        return byStart;
      }

      return left.weekEnd.localeCompare(right.weekEnd);
    },
  );
  const weeks = weeklyReports.map((weeklyReport) =>
    createBackupWeekFromReports({
      reports: parsedReports,
      weeklyReportId: weeklyReport.id,
    }),
  );

  if (!weeks.length) {
    throw new Error('Backup export requires at least one week.');
  }

  return DatabaseBackupEnvelopeSchema.parse({
    exportedAt,
    source: 'reports-json',
    reports: {
      weeks,
    },
  });
}

export function parseDatabaseBackupEnvelope(
  serialized: string,
): DatabaseBackupEnvelope {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(serialized) as unknown;
  } catch {
    throw new Error('Backup import expects valid JSON.');
  }

  const envelope = DatabaseBackupEnvelopeSchema.parse(parsedValue);
  validateParsedEnvelope(envelope);

  return envelope;
}

export function createReportsStateFromDatabaseBackup(
  envelope: DatabaseBackupEnvelope,
): ReportsState {
  const reportsState = createDefaultReportsState();

  envelope.reports.weeks.forEach((week) => {
    const weekId = createInternalWeekId(week.weekStart, week.weekEnd);
    const dailyReports = [...week.days].sort((left, right) =>
      left.date.localeCompare(right.date),
    );

    reportsState.weeklyReports[weekId] = WeeklyReportRecordSchema.parse({
      id: weekId,
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      values: normalizeWeekValues(week),
      dailyReportIds: dailyReports.map((day) => createInternalDayId(weekId, day.date)),
      createdAt: week.updatedAt,
      updatedAt: week.updatedAt,
    });
    reportsState.weeklyHashes[weekId] = WeeklyReportHashRecordSchema.parse({
      weeklyReportId: weekId,
      hash: week.hash,
      createdAt: week.updatedAt,
    });
    dailyReports.forEach((day) => {
      const dayId = createInternalDayId(weekId, day.date);

      reportsState.dailyReports[dayId] = DailyReportRecordSchema.parse({
        id: dayId,
        weeklyReportId: weekId,
        date: day.date,
        values: day.content,
        createdAt: day.updatedAt,
        updatedAt: day.updatedAt,
      });
    });
  });

  return ReportsStateSchema.parse(reportsState);
}

function createWeeksByIdentity(
  reports: ReportsState,
): Map<string, z.infer<typeof DatabaseBackupWeekSchema>> {
  const weeksByIdentity = new Map<string, z.infer<typeof DatabaseBackupWeekSchema>>();

  Object.values(reports.weeklyReports).forEach((weeklyReport) => {
    const week = createBackupWeekFromReports({
      reports,
      weeklyReportId: weeklyReport.id,
    });

    weeksByIdentity.set(
      createWeekIdentity(week.weekStart, week.weekEnd),
      week,
    );
  });

  return weeksByIdentity;
}

function compareWeekRanges(
  left: { weekStart: string; weekEnd: string },
  right: { weekStart: string; weekEnd: string },
): number {
  const byStart = left.weekStart.localeCompare(right.weekStart);

  if (byStart !== 0) {
    return byStart;
  }

  return left.weekEnd.localeCompare(right.weekEnd);
}

function createBackupImportConflictWeeks(
  currentReports: ReportsState,
  incomingReports: ReportsState,
): BackupImportConflictWeek[] {
  const currentWeeksByIdentity = createWeeksByIdentity(currentReports);
  const incomingWeeksByIdentity = createWeeksByIdentity(incomingReports);
  const conflicts: BackupImportConflictWeek[] = [];

  incomingWeeksByIdentity.forEach((incomingWeek, weekIdentity) => {
    const currentWeek = currentWeeksByIdentity.get(weekIdentity);

    if (!currentWeek || currentWeek.hash === incomingWeek.hash) {
      return;
    }

    const defaultStrategy =
      incomingWeek.updatedAt > currentWeek.updatedAt ? 'backup' : 'local';

    conflicts.push(
      BackupImportConflictWeekSchema.parse({
        weekIdentity,
        weekStart: incomingWeek.weekStart,
        weekEnd: incomingWeek.weekEnd,
        current: currentWeek,
        incoming: incomingWeek,
        defaultStrategy,
      }),
    );
  });

  return conflicts.sort(compareWeekRanges);
}

export function summarizeDatabaseBackup(reports: ReportsState): DatabaseBackupSummary {
  return DatabaseBackupSummarySchema.parse({
    weeklyReportCount: Object.keys(reports.weeklyReports).length,
    dailyReportCount: Object.keys(reports.dailyReports).length,
    weeklyHashCount: Object.keys(reports.weeklyHashes).length,
  });
}

export function createDatabaseBackupImportPreview(input: {
  id: string;
  createdAt: string;
  currentReports: ReportsState;
  incomingReports: ReportsState;
  warning?: string;
}): DatabaseBackupImportPreview {
  const conflictSummary = summarizeReportConflicts(
    input.currentReports,
    input.incomingReports,
  );
  const conflictingWeeks = createBackupImportConflictWeeks(
    input.currentReports,
    input.incomingReports,
  );

  return DatabaseBackupImportPreviewSchema.parse({
    id: input.id,
    createdAt: input.createdAt,
    current: summarizeDatabaseBackup(input.currentReports),
    incoming: summarizeDatabaseBackup(input.incomingReports),
    conflictSummary,
    conflictingWeeks,
    defaultConflictStrategy: 'latest-timestamp',
    availableConflictStrategies: ['latest-timestamp', 'local', 'backup'],
    warning:
      input.warning ??
      'Vor dem Import wird automatisch ein lokaler Recovery-Snapshot erstellt. Ohne manuelle Auswahl gilt latest-timestamp.',
  });
}
