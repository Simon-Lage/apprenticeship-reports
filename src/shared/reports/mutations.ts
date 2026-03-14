import { JsonObject, stableStringifyJson } from '@/shared/common/json';
import {
  createWeekIdentity,
  createWeeklyReportContentHash,
  DailyReportRecord,
  DailyReportRecordSchema,
  ReportsState,
  ReportsStateSchema,
  WeeklyReportRecord,
  WeeklyReportRecordSchema,
} from '@/shared/reports/models';
import {
  WeeklyReportHashRecord,
  WeeklyReportHashRecordSchema,
} from '@/shared/reports/stable';

type UpsertWeeklyReportInput = {
  weekStart: string;
  weekEnd: string;
  values: JsonObject;
  now: string;
};

type DeleteWeeklyReportInput = {
  weekStart: string;
  weekEnd: string;
  now: string;
};

type UpsertDailyReportInput = {
  weekStart: string;
  weekEnd: string;
  date: string;
  values: JsonObject;
  now: string;
};

type DeleteDailyReportInput = {
  weekStart: string;
  weekEnd: string;
  date: string;
  now: string;
};

type ReportsMutationResult = {
  reports: ReportsState;
  changed: boolean;
  dailyReportWritten: boolean;
};

function createWeekId(weekStart: string, weekEnd: string): string {
  return `week-${weekStart}-${weekEnd}`;
}

function createDayId(weekId: string, date: string): string {
  return `${weekId}-${date}`;
}

function findWeeklyReportByIdentity(input: {
  weeklyReports: Record<string, WeeklyReportRecord>;
  weekStart: string;
  weekEnd: string;
}): WeeklyReportRecord | null {
  const weekIdentity = createWeekIdentity(input.weekStart, input.weekEnd);

  return (
    Object.values(input.weeklyReports).find(
      (weeklyReport) =>
        createWeekIdentity(weeklyReport.weekStart, weeklyReport.weekEnd) ===
        weekIdentity,
    ) ?? null
  );
}

function getDailyReportsForWeek(
  reports: ReportsState,
  weeklyReport: WeeklyReportRecord,
): DailyReportRecord[] {
  return weeklyReport.dailyReportIds
    .map((dailyReportId) => reports.dailyReports[dailyReportId])
    .filter(
      (dailyReport): dailyReport is NonNullable<typeof dailyReport> =>
        Boolean(dailyReport),
    )
    .sort((left, right) => left.date.localeCompare(right.date));
}

function findDailyReportByDate(input: {
  reports: ReportsState;
  weeklyReport: WeeklyReportRecord;
  date: string;
}): DailyReportRecord | null {
  return (
    getDailyReportsForWeek(input.reports, input.weeklyReport).find(
      (dailyReport) => dailyReport.date === input.date,
    ) ?? null
  );
}

function createWeeklyHashRecord(input: {
  weeklyReport: WeeklyReportRecord;
  dailyReports: DailyReportRecord[];
  createdAt: string;
}): WeeklyReportHashRecord {
  return WeeklyReportHashRecordSchema.parse({
    weeklyReportId: input.weeklyReport.id,
    hash: createWeeklyReportContentHash({
      weeklyReport: input.weeklyReport,
      dailyReports: input.dailyReports,
    }),
    createdAt: input.createdAt,
  });
}

function patchWeeklyHash(input: {
  reports: ReportsState;
  weeklyReport: WeeklyReportRecord;
}): ReportsState {
  const nextReports = ReportsStateSchema.parse(input.reports);

  nextReports.weeklyHashes[input.weeklyReport.id] = createWeeklyHashRecord({
    weeklyReport: input.weeklyReport,
    dailyReports: getDailyReportsForWeek(nextReports, input.weeklyReport),
    createdAt: input.weeklyReport.updatedAt,
  });

  return nextReports;
}

export function rebuildWeeklyHashByWeeklyReportId(input: {
  reports: ReportsState;
  weeklyReportId: string;
}): { reports: ReportsState; record: WeeklyReportHashRecord } | null {
  const parsedReports = ReportsStateSchema.parse(input.reports);
  const weeklyReport = parsedReports.weeklyReports[input.weeklyReportId];

  if (!weeklyReport) {
    return null;
  }

  const reportsWithHash = patchWeeklyHash({
    reports: parsedReports,
    weeklyReport,
  });

  return {
    reports: reportsWithHash,
    record: reportsWithHash.weeklyHashes[input.weeklyReportId],
  };
}

export function applyUpsertWeeklyReport(
  reports: ReportsState,
  input: UpsertWeeklyReportInput,
): ReportsMutationResult {
  const parsedReports = ReportsStateSchema.parse(reports);
  const currentWeeklyReport = findWeeklyReportByIdentity({
    weeklyReports: parsedReports.weeklyReports,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
  });

  if (
    currentWeeklyReport &&
    stableStringifyJson(currentWeeklyReport.values) ===
      stableStringifyJson(input.values)
  ) {
    return {
      reports: parsedReports,
      changed: false,
      dailyReportWritten: false,
    };
  }

  const nextWeeklyReport = WeeklyReportRecordSchema.parse({
    id: currentWeeklyReport?.id ?? createWeekId(input.weekStart, input.weekEnd),
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    values: input.values,
    dailyReportIds: currentWeeklyReport?.dailyReportIds ?? [],
    createdAt: currentWeeklyReport?.createdAt ?? input.now,
    updatedAt: input.now,
  });
  const nextReports = ReportsStateSchema.parse({
    ...parsedReports,
    weeklyReports: {
      ...parsedReports.weeklyReports,
      [nextWeeklyReport.id]: nextWeeklyReport,
    },
  });

  return {
    reports: patchWeeklyHash({
      reports: nextReports,
      weeklyReport: nextWeeklyReport,
    }),
    changed: true,
    dailyReportWritten: false,
  };
}

export function applyDeleteWeeklyReport(
  reports: ReportsState,
  input: DeleteWeeklyReportInput,
): ReportsMutationResult {
  const parsedReports = ReportsStateSchema.parse(reports);
  const weeklyReport = findWeeklyReportByIdentity({
    weeklyReports: parsedReports.weeklyReports,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
  });

  if (!weeklyReport) {
    return {
      reports: parsedReports,
      changed: false,
      dailyReportWritten: false,
    };
  }

  const nextWeeklyReports = { ...parsedReports.weeklyReports };
  const nextDailyReports = { ...parsedReports.dailyReports };
  const nextWeeklyHashes = { ...parsedReports.weeklyHashes };

  delete nextWeeklyReports[weeklyReport.id];
  delete nextWeeklyHashes[weeklyReport.id];
  weeklyReport.dailyReportIds.forEach((dailyReportId) => {
    delete nextDailyReports[dailyReportId];
  });

  return {
    reports: ReportsStateSchema.parse({
      ...parsedReports,
      weeklyReports: nextWeeklyReports,
      dailyReports: nextDailyReports,
      weeklyHashes: nextWeeklyHashes,
    }),
    changed: true,
    dailyReportWritten: false,
  };
}

export function applyUpsertDailyReport(
  reports: ReportsState,
  input: UpsertDailyReportInput,
): ReportsMutationResult {
  const parsedReports = ReportsStateSchema.parse(reports);
  const currentWeeklyReport =
    findWeeklyReportByIdentity({
      weeklyReports: parsedReports.weeklyReports,
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
    }) ??
    WeeklyReportRecordSchema.parse({
      id: createWeekId(input.weekStart, input.weekEnd),
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      values: {},
      dailyReportIds: [],
      createdAt: input.now,
      updatedAt: input.now,
    });
  const currentDailyReport = findDailyReportByDate({
    reports: parsedReports,
    weeklyReport: currentWeeklyReport,
    date: input.date,
  });

  if (
    currentDailyReport &&
    stableStringifyJson(currentDailyReport.values) ===
      stableStringifyJson(input.values)
  ) {
    return {
      reports: parsedReports,
      changed: false,
      dailyReportWritten: false,
    };
  }

  const nextDailyReport = DailyReportRecordSchema.parse({
    id: currentDailyReport?.id ?? createDayId(currentWeeklyReport.id, input.date),
    weeklyReportId: currentWeeklyReport.id,
    date: input.date,
    values: input.values,
    createdAt: currentDailyReport?.createdAt ?? input.now,
    updatedAt: input.now,
  });
  const nextDailyReports = {
    ...parsedReports.dailyReports,
    [nextDailyReport.id]: nextDailyReport,
  };
  const nextDailyReportIds = currentWeeklyReport.dailyReportIds.includes(
    nextDailyReport.id,
  )
    ? currentWeeklyReport.dailyReportIds
    : [...currentWeeklyReport.dailyReportIds, nextDailyReport.id];
  const sortedDailyReportIds = nextDailyReportIds.sort((leftId, rightId) => {
    const leftDailyReport = nextDailyReports[leftId];
    const rightDailyReport = nextDailyReports[rightId];

    if (!leftDailyReport || !rightDailyReport) {
      return leftId.localeCompare(rightId);
    }

    return leftDailyReport.date.localeCompare(rightDailyReport.date);
  });
  const nextWeeklyReport = WeeklyReportRecordSchema.parse({
    ...currentWeeklyReport,
    dailyReportIds: sortedDailyReportIds,
    updatedAt: input.now,
  });
  const nextReports = ReportsStateSchema.parse({
    ...parsedReports,
    weeklyReports: {
      ...parsedReports.weeklyReports,
      [nextWeeklyReport.id]: nextWeeklyReport,
    },
    dailyReports: nextDailyReports,
  });

  return {
    reports: patchWeeklyHash({
      reports: nextReports,
      weeklyReport: nextWeeklyReport,
    }),
    changed: true,
    dailyReportWritten: true,
  };
}

export function applyDeleteDailyReport(
  reports: ReportsState,
  input: DeleteDailyReportInput,
): ReportsMutationResult {
  const parsedReports = ReportsStateSchema.parse(reports);
  const weeklyReport = findWeeklyReportByIdentity({
    weeklyReports: parsedReports.weeklyReports,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
  });

  if (!weeklyReport) {
    return {
      reports: parsedReports,
      changed: false,
      dailyReportWritten: false,
    };
  }

  const dailyReport = findDailyReportByDate({
    reports: parsedReports,
    weeklyReport,
    date: input.date,
  });

  if (!dailyReport) {
    return {
      reports: parsedReports,
      changed: false,
      dailyReportWritten: false,
    };
  }

  const nextDailyReports = { ...parsedReports.dailyReports };
  const nextDailyReportIds = weeklyReport.dailyReportIds.filter(
    (dailyReportId) => dailyReportId !== dailyReport.id,
  );
  const nextWeeklyReport = WeeklyReportRecordSchema.parse({
    ...weeklyReport,
    dailyReportIds: nextDailyReportIds,
    updatedAt: input.now,
  });

  delete nextDailyReports[dailyReport.id];

  const nextReports = ReportsStateSchema.parse({
    ...parsedReports,
    weeklyReports: {
      ...parsedReports.weeklyReports,
      [weeklyReport.id]: nextWeeklyReport,
    },
    dailyReports: nextDailyReports,
  });

  return {
    reports: patchWeeklyHash({
      reports: nextReports,
      weeklyReport: nextWeeklyReport,
    }),
    changed: true,
    dailyReportWritten: false,
  };
}
