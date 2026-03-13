import Database from 'better-sqlite3-multiple-ciphers';
import {
  AbsenceCreateInput,
  AbsenceRecord,
  AbsenceUpdateInput,
  ConfigRecord,
  DailyReportCreateInput,
  DailyReportEntryInput,
  DailyReportEntryRecord,
  DailyReportRecord,
  DailyReportUpdateInput,
  EntryCreateInput,
  EntryRecord,
  EntryUpdateInput,
  TimetableRecord,
  WeeklyReportCreateInput,
  WeeklyReportRecord,
  WeeklyReportUpdateInput,
} from '../../../shared/logic';
import {
  deleteAbsence,
  deleteDailyReport,
  deleteEntry,
  deleteWeeklyReport,
  getAbsence,
  getAbsences,
  getAbsencesByType,
  getConfig,
  getDailyReport,
  getDailyReportEntries,
  getDailyReports,
  getDailyReportsByWeeklyReportId,
  getEntries,
  getEntriesByDayType,
  getEntriesByWeeklyReportId,
  getEntry,
  getTimetable,
  getWeeklyReport,
  getWeeklyReports,
  replaceDailyReportEntries,
  replaceTimetable,
  removeDailyReportEntry,
  setAbsence,
  setDailyReport,
  setEntry,
  setWeeklyReport,
  updateAbsence,
  updateConfig,
  updateDailyReport,
  updateEntry,
  updateWeeklyReport,
} from '../../repositories';
import { LogicAdapters } from './types';

const parseSettings = (raw: string) => {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const toStoredSettings = (settings: Record<string, unknown>) =>
  JSON.stringify(settings ?? {});

const mapConfigToShared = (record: {
  id: string;
  name: string;
  surname: string;
  ihkLink: string | null;
  department: string | null;
  trainerEmail: string | null;
  trainingStart: string | null;
  trainingEnd: string | null;
  settings: string;
}): ConfigRecord => ({
  id: record.id,
  name: record.name,
  surname: record.surname,
  ihkLink: record.ihkLink,
  department: record.department,
  trainerEmail: record.trainerEmail,
  trainingStart: record.trainingStart,
  trainingEnd: record.trainingEnd,
  settings: parseSettings(record.settings),
});

const mapConfigToRepository = (
  record: ConfigRecord,
): {
  id: string;
  name: string;
  surname: string;
  ihkLink: string | null;
  department: string | null;
  trainerEmail: string | null;
  trainingStart: string | null;
  trainingEnd: string | null;
  settings: string;
} => ({
  id: record.id,
  name: record.name,
  surname: record.surname,
  ihkLink: record.ihkLink,
  department: record.department,
  trainerEmail: record.trainerEmail,
  trainingStart: record.trainingStart,
  trainingEnd: record.trainingEnd,
  settings: toStoredSettings(record.settings),
});

const ensureConfigRow = (db: Database.Database, payload: ConfigRecord): ConfigRecord => {
  const stored = mapConfigToRepository(payload);
  db.prepare(
    `INSERT INTO config (id, name, surname, ihk_link, department, trainer_email, training_start, training_end, settings)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    stored.id,
    stored.name,
    stored.surname,
    stored.ihkLink,
    stored.department,
    stored.trainerEmail,
    stored.trainingStart,
    stored.trainingEnd,
    stored.settings,
  );
  return payload;
};

export const createDbLogicAdapters = (
  getDb: () => Database.Database,
): LogicAdapters => ({
  config: {
    async getConfig() {
      const config = getConfig(getDb());
      return config ? mapConfigToShared(config) : null;
    },
    async initializeConfig(payload: ConfigRecord) {
      return ensureConfigRow(getDb(), payload);
    },
    async updateConfig(payload: Partial<ConfigRecord>) {
      const db = getDb();
      const current = getConfig(db);
      if (!current) {
        const next: ConfigRecord = {
          id: payload.id ?? 'default',
          name: payload.name ?? '',
          surname: payload.surname ?? '',
          ihkLink: payload.ihkLink ?? null,
          department: payload.department ?? null,
          trainerEmail: payload.trainerEmail ?? null,
          trainingStart: payload.trainingStart ?? null,
          trainingEnd: payload.trainingEnd ?? null,
          settings: payload.settings ?? {},
        };
        return ensureConfigRow(db, next);
      }
      const next = updateConfig(db, {
        ...payload,
        settings:
          payload.settings === undefined
            ? undefined
            : toStoredSettings(payload.settings),
      });
      return mapConfigToShared(next);
    },
    async resetConfig() {
      const changes = getDb().prepare('DELETE FROM config').run().changes;
      return changes > 0;
    },
  },
  timetable: {
    async getTimetable() {
      return getTimetable(getDb()).map((entry) => ({
        id: entry.id,
        teacher: entry.teacher,
        subject: entry.subject,
        weekday: entry.weekday,
        order: entry.order,
      }));
    },
    async replaceTimetable(payload: TimetableRecord[]) {
      replaceTimetable(getDb(), payload);
    },
  },
  entries: {
    async getEntries() {
      return getEntries(getDb()).map((entry) => ({
        id: entry.id,
        activities: entry.activities,
        dayType: entry.dayType,
      }));
    },
    async getEntriesByDayType(payload) {
      return getEntriesByDayType(getDb(), payload.dayType).map((entry) => ({
        id: entry.id,
        activities: entry.activities,
        dayType: entry.dayType,
      }));
    },
    async getEntriesByWeeklyReportId(payload) {
      return getEntriesByWeeklyReportId(getDb(), payload.weeklyReportId).map((entry) => ({
        id: entry.id,
        activities: entry.activities,
        dayType: entry.dayType,
      }));
    },
    async getEntry(payload) {
      const entry = getEntry(getDb(), payload.id);
      if (!entry) {
        return null;
      }
      return {
        id: entry.id,
        activities: entry.activities,
        dayType: entry.dayType,
      };
    },
    async setEntry(payload: EntryCreateInput) {
      const created = setEntry(getDb(), payload);
      return {
        id: created.id,
        activities: created.activities,
        dayType: created.dayType,
      };
    },
    async updateEntry(payload: { id: number; patch: EntryUpdateInput }) {
      const updated = updateEntry(getDb(), payload.id, payload.patch);
      return {
        id: updated.id,
        activities: updated.activities,
        dayType: updated.dayType,
      };
    },
    async deleteEntry(payload: { id: number }) {
      return deleteEntry(getDb(), payload.id);
    },
  },
  absences: {
    async getAbsences() {
      return getAbsences(getDb());
    },
    async getAbsencesByType(payload) {
      return getAbsencesByType(getDb(), payload.type);
    },
    async getAbsence(payload) {
      return getAbsence(getDb(), payload.id);
    },
    async setAbsence(payload: AbsenceCreateInput) {
      return setAbsence(getDb(), payload);
    },
    async updateAbsence(payload: { id: string; patch: AbsenceUpdateInput }) {
      return updateAbsence(getDb(), payload.id, payload.patch);
    },
    async deleteAbsence(payload: { id: string }) {
      return deleteAbsence(getDb(), payload.id);
    },
  },
  weeklyReports: {
    async getWeeklyReports() {
      return getWeeklyReports(getDb());
    },
    async setWeeklyReport(payload: WeeklyReportCreateInput) {
      return setWeeklyReport(getDb(), payload);
    },
    async updateWeeklyReport(payload: {
      id: number;
      patch: WeeklyReportUpdateInput;
    }) {
      return updateWeeklyReport(getDb(), payload.id, payload.patch);
    },
    async deleteWeeklyReport(payload: { id: number }) {
      return deleteWeeklyReport(getDb(), payload.id);
    },
    async getWeeklyReport(payload: { id: number }) {
      return getWeeklyReport(getDb(), payload.id);
    },
  },
  dailyReports: {
    async getDailyReports(payload) {
      return getDailyReports(getDb(), payload);
    },
    async getDailyReportsByWeeklyReportId(payload: { weeklyReportId: number }) {
      return getDailyReportsByWeeklyReportId(getDb(), payload.weeklyReportId);
    },
    async getDailyReport(payload: { id: string }) {
      return getDailyReport(getDb(), payload.id);
    },
    async getDailyReportEntries(payload: { dailyReportId: string }) {
      return getDailyReportEntries(getDb(), payload.dailyReportId).map((entry) => ({
        dailyReportId: entry.dailyReportId,
        entryId: entry.entryId,
        position: entry.position,
      })) as DailyReportEntryRecord[];
    },
    async setDailyReport(payload: DailyReportCreateInput) {
      const id = payload.id ?? `daily_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return setDailyReport(getDb(), {
        id,
        date: payload.date,
        dayType: payload.dayType,
        weeklyReportId: payload.weeklyReportId ?? null,
      }) as DailyReportRecord;
    },
    async updateDailyReport(payload: {
      id: string;
      patch: DailyReportUpdateInput;
    }) {
      return updateDailyReport(getDb(), payload.id, payload.patch) as DailyReportRecord;
    },
    async deleteDailyReport(payload: { id: string }) {
      return deleteDailyReport(getDb(), payload.id);
    },
    async setDailyReportEntries(payload: {
      dailyReportId: string;
      entries: DailyReportEntryInput[];
    }) {
      return replaceDailyReportEntries(getDb(), {
        dailyReportId: payload.dailyReportId,
        entries: payload.entries.map((entry, index) => ({
          entryId: entry.entryId,
          position: entry.position ?? index,
        })),
      }) as DailyReportEntryRecord[];
    },
    async removeDailyReportEntry(payload: {
      dailyReportId: string;
      entryId: number;
    }) {
      return removeDailyReportEntry(getDb(), payload);
    },
  },
});
