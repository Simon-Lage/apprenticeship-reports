import fs from 'fs/promises';
import {
  AbsenceRecord,
  AuditEventRecord,
  ConfigRecord,
  DailyReportEntryRecord,
  DailyReportRecord,
  EntryRecord,
  TimetableRecord,
  WeeklyReportRecord,
} from '../../../shared/logic';
import {
  AbsencesRepositoryAdapter,
  ConfigRepositoryAdapter,
  DailyReportsRepositoryAdapter,
  EntriesRepositoryAdapter,
  TimetableRepositoryAdapter,
  WeeklyReportsRepositoryAdapter,
} from '../adapters';
import { normalizeAuditChain } from '../modules/audit/hash';
import { readAuditEvents, writeAuditEvents } from '../modules/audit/store';
import { fail, ok } from '../core/operation';
import { createImplemented } from './utils';

type ImportArchiveShape = {
  schemaVersion?: number;
  config?: ConfigRecord | null;
  timetable?: TimetableRecord[];
  entries?: EntryRecord[];
  absences?: AbsenceRecord[];
  weeklyReports?: WeeklyReportRecord[];
  dailyReports?: DailyReportRecord[];
  dailyReportEntries?: Array<{
    dailyReportId: string;
    entries: DailyReportEntryRecord[];
  }>;
  auditEvents?: AuditEventRecord[];
};

type ApplyArchiveResult = {
  importedItems: number;
  warnings: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown) => (typeof value === 'string' ? value : null);

const asNumber = (value: unknown) => (typeof value === 'number' ? value : null);

const asBoolean = (value: unknown) =>
  typeof value === 'boolean' ? value : null;

const asArray = <T>(value: unknown, mapper: (item: unknown) => T | null) => {
  if (!Array.isArray(value)) {
    return null;
  }
  const mapped: T[] = [];
  for (const item of value) {
    const next = mapper(item);
    if (next) {
      mapped.push(next);
    }
  }
  return mapped;
};

const toConfigRecord = (value: unknown): ConfigRecord | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = asString(value.id);
  const name = asString(value.name);
  const surname = asString(value.surname);
  if (!id || !name || !surname) {
    return null;
  }
  return {
    id,
    name,
    surname,
    ihkLink: asString(value.ihkLink),
    department: asString(value.department),
    trainerEmail: asString(value.trainerEmail),
    trainingStart: asString(value.trainingStart),
    trainingEnd: asString(value.trainingEnd),
    settings: isRecord(value.settings) ? value.settings : {},
  };
};

const toTimetableRecord = (value: unknown): TimetableRecord | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = asString(value.id);
  const teacher = asString(value.teacher);
  const subject = asString(value.subject);
  const weekday = asNumber(value.weekday);
  const order = asNumber(value.order);
  if (!id || !teacher || !subject || weekday === null || order === null) {
    return null;
  }
  return {
    id,
    teacher,
    subject,
    weekday,
    order,
  };
};

const toEntryRecord = (value: unknown): EntryRecord | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = asNumber(value.id);
  const activities = asString(value.activities);
  const dayType = asString(value.dayType);
  if (
    id === null ||
    !activities ||
    (dayType !== 'school' && dayType !== 'work' && dayType !== 'leave')
  ) {
    return null;
  }
  return {
    id,
    activities,
    dayType,
  };
};

const toAbsenceRecord = (value: unknown): AbsenceRecord | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = asString(value.id);
  const type = asString(value.type);
  const fromDate = asString(value.fromDate);
  const toDate = asString(value.toDate);
  const noteRaw = value.note;
  if (
    !id ||
    !type ||
    !fromDate ||
    !toDate ||
    !['vacation', 'sick', 'weekend', 'holiday', 'school_break', 'other'].includes(type)
  ) {
    return null;
  }
  return {
    id,
    type: type as AbsenceRecord['type'],
    fromDate,
    toDate,
    note:
      noteRaw === null || noteRaw === undefined || typeof noteRaw === 'string'
        ? (noteRaw ?? null)
        : null,
  };
};

const toWeeklyReportRecord = (value: unknown): WeeklyReportRecord | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = asNumber(value.id);
  const weekStart = asString(value.weekStart);
  const weekEnd = asString(value.weekEnd);
  const sent = asBoolean(value.sent);
  if (id === null || !weekStart || !weekEnd || sent === null) {
    return null;
  }
  return {
    id,
    weekStart,
    weekEnd,
    departmentWhenSent: asString(value.departmentWhenSent),
    trainerEmailWhenSent: asString(value.trainerEmailWhenSent),
    sent,
  };
};

const toDailyReportRecord = (value: unknown): DailyReportRecord | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = asString(value.id);
  const date = asString(value.date);
  const createdAt = asString(value.createdAt);
  const updatedAt = asString(value.updatedAt);
  const dayType = asString(value.dayType);
  const weeklyReportIdRaw = value.weeklyReportId;
  if (
    !id ||
    !date ||
    !createdAt ||
    !updatedAt ||
    (dayType !== 'school' && dayType !== 'work' && dayType !== 'leave')
  ) {
    return null;
  }
  const weeklyReportId =
    weeklyReportIdRaw === null
      ? null
      : typeof weeklyReportIdRaw === 'number'
        ? weeklyReportIdRaw
        : null;
  return {
    id,
    date,
    createdAt,
    updatedAt,
    dayType,
    weeklyReportId,
  };
};

const toDailyReportEntryRecord = (
  value: unknown,
): DailyReportEntryRecord | null => {
  if (!isRecord(value)) {
    return null;
  }
  const dailyReportId = asString(value.dailyReportId);
  const entryId = asNumber(value.entryId);
  const position = asNumber(value.position);
  if (!dailyReportId || entryId === null || position === null) {
    return null;
  }
  return {
    dailyReportId,
    entryId,
    position,
  };
};

const toDailyReportEntriesBlock = (
  value: unknown,
): { dailyReportId: string; entries: DailyReportEntryRecord[] } | null => {
  if (!isRecord(value)) {
    return null;
  }
  const dailyReportId = asString(value.dailyReportId);
  const entries = asArray(value.entries, toDailyReportEntryRecord);
  if (!dailyReportId || !entries) {
    return null;
  }
  return {
    dailyReportId,
    entries,
  };
};

const toAuditEventRecord = (value: unknown): AuditEventRecord | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = asString(value.id);
  const createdAt = asString(value.createdAt);
  const type = asString(value.type);
  const actor = asString(value.actor);
  const previousHashRaw = value.previousHash;
  const hash = asString(value.hash);
  if (!id || !createdAt || !type || !actor || !hash || !isRecord(value.payload)) {
    return null;
  }
  return {
    id,
    createdAt,
    type,
    actor,
    payload: value.payload,
    previousHash:
      previousHashRaw === null || typeof previousHashRaw === 'string'
        ? previousHashRaw
        : null,
    hash,
  };
};

export class ImportService {
  constructor(
    private readonly config: ConfigRepositoryAdapter,
    private readonly timetable: TimetableRepositoryAdapter,
    private readonly entries: EntriesRepositoryAdapter,
    private readonly absences: AbsencesRepositoryAdapter,
    private readonly weeklyReports: WeeklyReportsRepositoryAdapter,
    private readonly dailyReports: DailyReportsRepositoryAdapter,
  ) {}

  private async readArchive(sourcePath: string): Promise<ImportArchiveShape> {
    const raw = await fs.readFile(sourcePath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : undefined,
      config: toConfigRecord(parsed.config ?? null),
      timetable: asArray(parsed.timetable, toTimetableRecord) ?? undefined,
      entries: asArray(parsed.entries, toEntryRecord) ?? undefined,
      absences: asArray(parsed.absences, toAbsenceRecord) ?? undefined,
      weeklyReports: asArray(parsed.weeklyReports, toWeeklyReportRecord) ?? undefined,
      dailyReports: asArray(parsed.dailyReports, toDailyReportRecord) ?? undefined,
      dailyReportEntries: asArray(parsed.dailyReportEntries, toDailyReportEntriesBlock) ?? undefined,
      auditEvents: asArray(parsed.auditEvents, toAuditEventRecord) ?? undefined,
    };
  }

  private async captureCurrentState(): Promise<ImportArchiveShape> {
    const dailyReports = await this.dailyReports.getDailyReports();
    const dailyReportEntries = await Promise.all(
      dailyReports.map(async (report) => ({
        dailyReportId: report.id,
        entries: await this.dailyReports.getDailyReportEntries({
          dailyReportId: report.id,
        }),
      })),
    );
    const auditEvents = normalizeAuditChain(await readAuditEvents());
    return {
      schemaVersion: 1,
      config: await this.config.getConfig(),
      timetable: await this.timetable.getTimetable(),
      entries: await this.entries.getEntries(),
      absences: await this.absences.getAbsences(),
      weeklyReports: await this.weeklyReports.getWeeklyReports(),
      dailyReports,
      dailyReportEntries,
      auditEvents,
    };
  }

  private async clearExistingData() {
    const daily = await this.dailyReports.getDailyReports();
    for (const report of daily) {
      await this.dailyReports.deleteDailyReport({ id: report.id });
    }
    const weekly = await this.weeklyReports.getWeeklyReports();
    for (const report of weekly) {
      await this.weeklyReports.deleteWeeklyReport({ id: report.id });
    }
    const absences = await this.absences.getAbsences();
    for (const absence of absences) {
      await this.absences.deleteAbsence({ id: absence.id });
    }
    const entries = await this.entries.getEntries();
    for (const entry of entries) {
      await this.entries.deleteEntry({ id: entry.id });
    }
    await this.timetable.replaceTimetable([]);
    await this.config.resetConfig();
    await writeAuditEvents([]);
  }

  private async applyArchiveData(
    archive: ImportArchiveShape,
    mode: 'replace' | 'merge',
  ): Promise<ApplyArchiveResult> {
    const warnings: string[] = [];
    let importedItems = 0;

    if (mode === 'replace') {
      await this.clearExistingData();
    }

    if (archive.config) {
      const current = await this.config.getConfig();
      if (!current) {
        await this.config.initializeConfig(archive.config);
      } else {
        await this.config.updateConfig(archive.config);
      }
      importedItems += 1;
    } else {
      warnings.push('config_missing');
    }

    if (archive.timetable) {
      await this.timetable.replaceTimetable(archive.timetable);
      importedItems += archive.timetable.length;
    } else {
      warnings.push('timetable_missing');
    }

    const entryIdMap = new Map<number, number>();
    if (archive.entries) {
      for (const entry of archive.entries) {
        const existing = await this.entries.getEntry({ id: entry.id });
        if (existing) {
          await this.entries.updateEntry({
            id: entry.id,
            patch: {
              activities: entry.activities,
              dayType: entry.dayType,
            },
          });
          entryIdMap.set(entry.id, entry.id);
        } else {
          const created = await this.entries.setEntry({
            activities: entry.activities,
            dayType: entry.dayType,
          });
          entryIdMap.set(entry.id, created.id);
        }
        importedItems += 1;
      }
    } else {
      warnings.push('entries_missing');
    }

    if (archive.absences) {
      for (const absence of archive.absences) {
        const existing = await this.absences.getAbsence({ id: absence.id });
        if (existing) {
          await this.absences.updateAbsence({
            id: absence.id,
            patch: {
              type: absence.type,
              fromDate: absence.fromDate,
              toDate: absence.toDate,
              note: absence.note,
            },
          });
        } else {
          await this.absences.setAbsence({
            id: absence.id,
            type: absence.type,
            fromDate: absence.fromDate,
            toDate: absence.toDate,
            note: absence.note,
          });
        }
        importedItems += 1;
      }
    } else {
      warnings.push('absences_missing');
    }

    const weeklyIdMap = new Map<number, number>();
    if (archive.weeklyReports) {
      for (const report of archive.weeklyReports) {
        const existing = await this.weeklyReports.getWeeklyReport({ id: report.id });
        if (existing) {
          const updated = await this.weeklyReports.updateWeeklyReport({
            id: report.id,
            patch: {
              weekStart: report.weekStart,
              weekEnd: report.weekEnd,
              departmentWhenSent: report.departmentWhenSent,
              trainerEmailWhenSent: report.trainerEmailWhenSent,
              sent: report.sent,
            },
          });
          weeklyIdMap.set(report.id, updated.id);
        } else {
          const created = await this.weeklyReports.setWeeklyReport({
            weekStart: report.weekStart,
            weekEnd: report.weekEnd,
            departmentWhenSent: report.departmentWhenSent,
            trainerEmailWhenSent: report.trainerEmailWhenSent,
            sent: report.sent,
          });
          weeklyIdMap.set(report.id, created.id);
        }
        importedItems += 1;
      }
    } else {
      warnings.push('weekly_reports_missing');
    }

    if (archive.dailyReports) {
      for (const report of archive.dailyReports) {
        const mappedWeeklyId =
          report.weeklyReportId === null
            ? null
            : (weeklyIdMap.get(report.weeklyReportId) ?? null);
        const existing = await this.dailyReports.getDailyReport({ id: report.id });
        if (existing) {
          await this.dailyReports.updateDailyReport({
            id: report.id,
            patch: {
              date: report.date,
              dayType: report.dayType,
              weeklyReportId: mappedWeeklyId,
            },
          });
        } else {
          await this.dailyReports.setDailyReport({
            id: report.id,
            date: report.date,
            dayType: report.dayType,
            weeklyReportId: mappedWeeklyId,
          });
        }
        importedItems += 1;
      }
    } else {
      warnings.push('daily_reports_missing');
    }

    if (archive.dailyReportEntries) {
      for (const block of archive.dailyReportEntries) {
        const report = await this.dailyReports.getDailyReport({ id: block.dailyReportId });
        if (!report) {
          warnings.push(`daily_report_missing:${block.dailyReportId}`);
          continue;
        }
        const mappedEntries = block.entries
          .map((entry) => ({
            dailyReportId: block.dailyReportId,
            entryId: entryIdMap.get(entry.entryId) ?? entry.entryId,
            position: entry.position,
          }))
          .filter((entry, index, array) => {
            const first = array.findIndex((candidate) => candidate.entryId === entry.entryId);
            return first === index;
          });
        await this.dailyReports.setDailyReportEntries({
          dailyReportId: block.dailyReportId,
          entries: mappedEntries,
        });
        importedItems += mappedEntries.length;
      }
    } else {
      warnings.push('daily_report_entries_missing');
    }

    if (archive.auditEvents) {
      await writeAuditEvents(normalizeAuditChain(archive.auditEvents));
      importedItems += archive.auditEvents.length;
    } else {
      warnings.push('audit_events_missing');
    }

    return {
      importedItems,
      warnings,
    };
  }

  async previewImportArchive(payload: { sourcePath: string }) {
    try {
      const archive = await this.readArchive(payload.sourcePath);
      const warnings: string[] = [];
      if (archive.schemaVersion !== 1) {
        warnings.push('schema_version_mismatch');
      }
      if (!archive.config) {
        warnings.push('config_missing');
      }
      if (!archive.timetable) {
        warnings.push('timetable_missing');
      }
      if (!archive.entries) {
        warnings.push('entries_missing');
      }
      if (!archive.absences) {
        warnings.push('absences_missing');
      }
      if (!archive.weeklyReports) {
        warnings.push('weekly_reports_missing');
      }
      if (!archive.dailyReports) {
        warnings.push('daily_reports_missing');
      }
      if (!archive.dailyReportEntries) {
        warnings.push('daily_report_entries_missing');
      }
      if (!archive.auditEvents) {
        warnings.push('audit_events_missing');
      }
      return createImplemented(
        ok({
          sourcePath: payload.sourcePath,
          canImport: true,
          warnings,
        }),
      );
    } catch {
      return createImplemented(
        fail('validation_error', 'import_archive_invalid', {
          sourcePath: 'unreadable_or_invalid_json',
        }),
      );
    }
  }

  async importDataArchive(payload: { sourcePath: string; mode: 'replace' | 'merge' }) {
    const currentState = await this.captureCurrentState();
    try {
      const archive = await this.readArchive(payload.sourcePath);
      const result = await this.applyArchiveData(archive, payload.mode);
      return createImplemented(
        ok({
          importedItems: result.importedItems,
          warnings: result.warnings,
          sourcePath: payload.sourcePath,
          mode: payload.mode,
          importedAt: new Date().toISOString(),
        }),
      );
    } catch {
      try {
        await this.applyArchiveData(currentState, 'replace');
      } catch {
        return createImplemented(
          fail('unexpected', 'import_archive_failed_and_rollback_failed'),
        );
      }
      return createImplemented(
        fail('unexpected', 'import_archive_failed_rolled_back'),
      );
    }
  }

  async importTimetable(payload: { entries: TimetableRecord[] }) {
    await this.timetable.replaceTimetable(payload.entries);
    return createImplemented(
      ok({
        importedItems: payload.entries.length,
        importedAt: new Date().toISOString(),
      }),
    );
  }

  async importAbsences(payload: { absences: AbsenceRecord[] }) {
    let importedItems = 0;
    for (const absence of payload.absences) {
      const existing = await this.absences.getAbsence({ id: absence.id });
      if (existing) {
        await this.absences.updateAbsence({
          id: absence.id,
          patch: {
            type: absence.type,
            fromDate: absence.fromDate,
            toDate: absence.toDate,
            note: absence.note,
          },
        });
      } else {
        await this.absences.setAbsence({
          id: absence.id,
          type: absence.type,
          fromDate: absence.fromDate,
          toDate: absence.toDate,
          note: absence.note,
        });
      }
      importedItems += 1;
    }
    return createImplemented(
      ok({
        importedItems,
        importedAt: new Date().toISOString(),
      }),
    );
  }
}
