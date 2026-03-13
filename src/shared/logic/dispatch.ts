import { AbsenceCreateInput, AbsenceRecord, AbsenceUpdateInput } from './absences';
import { AuditEventInput, AuditEventRecord } from './audit';
import { AbsenceType, DayType } from './common';
import { ConfigRecord } from './config';
import { LogicServiceName, LogicStubResult } from './core';
import { EntryCreateInput, EntryRecord, EntryUpdateInput } from './entries';
import { IntegrityIssue, IntegrityReport } from './integrity';
import { LogicOperationResult } from './operation';
import {
  DailyReportCreateInput,
  DailyReportEntryInput,
  DailyReportEntryRecord,
  DailyReportRecord,
  DailyReportUpdateInput,
  WeeklyReportCreateInput,
  WeeklyReportRecord,
  WeeklyReportUpdateInput,
} from './reports';
import { TimetableRecord } from './timetable';
import { ExportResult, ImportPreview, ImportResult } from './transfer';

type ActionContract<Payload, Result> = {
  payload: Payload;
  result: Result;
};

export type LogicActionContractMap = {
  config: {
    getConfig: ActionContract<undefined, LogicOperationResult<ConfigRecord | null>>;
    initializeConfig: ActionContract<ConfigRecord, LogicOperationResult<ConfigRecord>>;
    updateConfig: ActionContract<
      Partial<ConfigRecord>,
      LogicOperationResult<ConfigRecord>
    >;
    resetConfig: ActionContract<undefined, LogicOperationResult<{ reset: boolean }>>;
    getStatus: ActionContract<
      undefined,
      LogicOperationResult<{ initialized: boolean }>
    >;
  };
  timetable: {
    listTimetable: ActionContract<
      undefined,
      LogicOperationResult<TimetableRecord[]>
    >;
    replaceTimetable: ActionContract<
      TimetableRecord[],
      LogicOperationResult<TimetableRecord[]>
    >;
    upsertTimetableEntry: ActionContract<
      TimetableRecord,
      LogicOperationResult<TimetableRecord>
    >;
    removeTimetableEntry: ActionContract<
      { id: string },
      LogicOperationResult<{ deleted: boolean; id: string }>
    >;
    validateTimetable: ActionContract<
      undefined,
      LogicOperationResult<{ valid: boolean; issues: string[] }>
    >;
    generateDayTemplate: ActionContract<
      { weekday: number },
      LogicOperationResult<{ generatedAt: string | null; template: TimetableRecord[] }>
    >;
  };
  entries: {
    listEntries: ActionContract<undefined, LogicOperationResult<EntryRecord[]>>;
    listEntriesByDayType: ActionContract<
      { dayType: DayType },
      LogicOperationResult<EntryRecord[]>
    >;
    createEntry: ActionContract<
      EntryCreateInput,
      LogicOperationResult<EntryRecord>
    >;
    updateEntry: ActionContract<
      { id: number; patch: EntryUpdateInput },
      LogicOperationResult<EntryRecord>
    >;
    deleteEntry: ActionContract<
      { id: number },
      LogicOperationResult<{ deleted: boolean; id: number }>
    >;
  };
  absences: {
    listAbsences: ActionContract<undefined, LogicOperationResult<AbsenceRecord[]>>;
    listAbsencesByType: ActionContract<
      { type: AbsenceType },
      LogicOperationResult<AbsenceRecord[]>
    >;
    createAbsence: ActionContract<
      AbsenceCreateInput,
      LogicOperationResult<AbsenceRecord>
    >;
    updateAbsence: ActionContract<
      { id: string; patch: AbsenceUpdateInput },
      LogicOperationResult<AbsenceRecord>
    >;
    deleteAbsence: ActionContract<
      { id: string },
      LogicOperationResult<{ deleted: boolean; id: string }>
    >;
    importHolidays: ActionContract<
      { holidays: AbsenceRecord[] },
      LogicOperationResult<{ imported: number }>
    >;
  };
  dailyReports: {
    listDailyReports: ActionContract<
      { fromDate?: string; toDate?: string; dayType?: DayType } | undefined,
      LogicOperationResult<DailyReportRecord[]>
    >;
    getDailyReport: ActionContract<
      { id: string },
      LogicOperationResult<{
        report: DailyReportRecord | null;
        entries: DailyReportEntryRecord[];
      }>
    >;
    createDailyReport: ActionContract<
      DailyReportCreateInput,
      LogicOperationResult<DailyReportRecord>
    >;
    updateDailyReport: ActionContract<
      { id: string; patch: DailyReportUpdateInput },
      LogicOperationResult<DailyReportRecord>
    >;
    deleteDailyReport: ActionContract<
      { id: string },
      LogicOperationResult<{ deleted: boolean; id: string }>
    >;
    setDailyReportEntries: ActionContract<
      { dailyReportId: string; entries: DailyReportEntryInput[] },
      LogicOperationResult<DailyReportEntryRecord[]>
    >;
    addDailyReportEntry: ActionContract<
      { dailyReportId: string; entry: DailyReportEntryInput },
      LogicOperationResult<DailyReportEntryRecord>
    >;
    removeDailyReportEntry: ActionContract<
      { dailyReportId: string; entryId: number },
      LogicOperationResult<{ deleted: boolean; dailyReportId: string; entryId: number }>
    >;
    reorderDailyReportEntries: ActionContract<
      {
        dailyReportId: string;
        order: Array<{ entryId: number; position: number }>;
      },
      LogicOperationResult<DailyReportEntryRecord[]>
    >;
    assignWeeklyReport: ActionContract<
      { dailyReportId: string; weeklyReportId: number | null },
      LogicOperationResult<DailyReportRecord>
    >;
  };
  weeklyReports: {
    listWeeklyReports: ActionContract<
      undefined,
      LogicOperationResult<WeeklyReportRecord[]>
    >;
    getWeeklyReport: ActionContract<
      { id: number },
      LogicOperationResult<WeeklyReportRecord | null>
    >;
    createWeeklyReport: ActionContract<
      WeeklyReportCreateInput,
      LogicOperationResult<WeeklyReportRecord>
    >;
    updateWeeklyReport: ActionContract<
      { id: number; patch: WeeklyReportUpdateInput },
      LogicOperationResult<WeeklyReportRecord>
    >;
    deleteWeeklyReport: ActionContract<
      { id: number },
      LogicOperationResult<{ deleted: boolean; id: number }>
    >;
    markWeeklyReportSent: ActionContract<
      { id: number; sent: boolean },
      LogicOperationResult<WeeklyReportRecord>
    >;
    deriveWeeklyReport: ActionContract<
      { weekStart: string; weekEnd: string },
      LogicOperationResult<{ weekStart: string; weekEnd: string; derived: boolean }>
    >;
  };
  reportGeneration: {
    buildWeeklyPreview: ActionContract<
      { weeklyReportId: number },
      LogicOperationResult<{
        weeklyReportId: number;
        generatedAt: string | null;
        blocks: Array<Record<string, unknown>>;
      }>
    >;
    regenerateWeeklyFromDaily: ActionContract<
      { weeklyReportId: number },
      LogicOperationResult<{ weeklyReportId: number; regeneratedAt: string | null }>
    >;
    validateDayTypeConsistency: ActionContract<
      undefined,
      LogicOperationResult<{
        valid: boolean;
        checkedAt: string | null;
        issues: IntegrityIssue[];
      }>
    >;
  };
  export: {
    exportDataArchive: ActionContract<
      { targetPath?: string } | undefined,
      LogicOperationResult<ExportResult>
    >;
    exportDailyReportsPdf: ActionContract<
      { targetPath?: string; fromDate?: string; toDate?: string } | undefined,
      LogicOperationResult<ExportResult>
    >;
    exportWeeklyReportPdf: ActionContract<
      { targetPath?: string; weeklyReportId: number },
      LogicOperationResult<ExportResult>
    >;
  };
  import: {
    previewImportArchive: ActionContract<
      { sourcePath: string },
      LogicOperationResult<ImportPreview>
    >;
    importDataArchive: ActionContract<
      { sourcePath: string; mode: 'replace' | 'merge' },
      LogicOperationResult<
        ImportResult & {
          sourcePath: string;
          mode: 'replace' | 'merge';
          importedAt: string | null;
        }
      >
    >;
    importTimetable: ActionContract<
      { entries: TimetableRecord[] },
      LogicOperationResult<{ importedItems: number; importedAt: string | null }>
    >;
    importAbsences: ActionContract<
      { absences: AbsenceRecord[] },
      LogicOperationResult<{ importedItems: number; importedAt: string | null }>
    >;
  };
  integrity: {
    runIntegrityCheck: ActionContract<
      undefined,
      LogicOperationResult<IntegrityReport>
    >;
    trimAllTextFields: ActionContract<
      undefined,
      LogicOperationResult<{ trimmedRows: number }>
    >;
    verifySchemaCompatibility: ActionContract<
      { version?: number } | undefined,
      LogicOperationResult<{ compatible: boolean; version: number | null }>
    >;
    buildRevisionSnapshot: ActionContract<
      undefined,
      LogicOperationResult<{ snapshotId: string; createdAt: string | null }>
    >;
  };
  audit: {
    listAuditEvents: ActionContract<
      undefined,
      LogicOperationResult<AuditEventRecord[]>
    >;
    appendAuditEvent: ActionContract<
      AuditEventInput,
      LogicOperationResult<AuditEventRecord>
    >;
    clearAuditEvents: ActionContract<
      undefined,
      LogicOperationResult<{ cleared: boolean }>
    >;
  };
  backup: {
    exportLocalEncrypted: ActionContract<
      undefined,
      LogicOperationResult<{
        provider: 'local';
        exportedAt: string | null;
        externalSyncStatus: 'local_only';
      }>
    >;
    exportGoogleDriveEncrypted: ActionContract<
      undefined,
      LogicOperationResult<{
        provider: 'google-drive';
        exportedAt: string | null;
        externalSyncStatus: 'mirrored_local_pending_remote';
      }>
    >;
    importEncryptedBackup: ActionContract<
      undefined,
      LogicOperationResult<{
        importedAt: string | null;
        sourceProvider: 'local' | 'google-drive' | 'unknown';
      }>
    >;
  };
};

export type LogicServiceActionName<S extends LogicServiceName> =
  keyof LogicActionContractMap[S] & string;

export type LogicActionPayload<
  S extends LogicServiceName,
  A extends LogicServiceActionName<S>,
> = LogicActionContractMap[S][A] extends ActionContract<infer P, unknown>
  ? P
  : never;

export type LogicActionResult<
  S extends LogicServiceName,
  A extends LogicServiceActionName<S>,
> = LogicActionContractMap[S][A] extends ActionContract<unknown, infer R>
  ? R
  : never;

export type LogicDispatchRequestOf<
  S extends LogicServiceName = LogicServiceName,
  A extends LogicServiceActionName<S> = LogicServiceActionName<S>,
> = undefined extends LogicActionPayload<S, A>
  ? {
      service: S;
      action: A;
      payload?: LogicActionPayload<S, A>;
    }
  : {
      service: S;
      action: A;
      payload: LogicActionPayload<S, A>;
    };

export type LogicDispatchRequest = {
  [S in LogicServiceName]: {
    [A in LogicServiceActionName<S>]: LogicDispatchRequestOf<S, A>;
  }[LogicServiceActionName<S>];
}[LogicServiceName];

export type LogicServiceCatalog = {
  [S in LogicServiceName]: LogicServiceActionName<S>[];
};

export type LogicDispatchResponse<
  S extends LogicServiceName,
  A extends LogicServiceActionName<S>,
> = LogicStubResult<LogicActionResult<S, A>>;
