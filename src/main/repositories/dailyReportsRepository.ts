import Database from 'better-sqlite3-multiple-ciphers';
import { trimText } from './repositoryUtils';
import { DayType } from './types';

export type DailyReport = {
  id: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  dayType: DayType;
  weeklyReportId: number | null;
};

export type DailyReportCreateInput = {
  id: string;
  date: string;
  dayType: DayType;
  weeklyReportId?: number | null;
};

export type DailyReportUpdateInput = {
  date?: string;
  dayType?: DayType;
  weeklyReportId?: number | null;
};

export type DailyReportEntry = {
  dailyReportId: string;
  entryId: number;
  position: number;
};

type DailyReportRow = {
  id: string;
  created_at: string;
  updated_at: string;
  day_type: DayType;
  weekly_report_id: number | null;
};

type DailyReportEntryRow = {
  daily_report_id: string;
  entry_id: number;
  position: number;
};

const normalizeDate = (value: string) => trimText(value);

const toIsoFromDate = (date: string) => `${date}T00:00:00.000Z`;

const mapRowToDailyReport = (row: DailyReportRow): DailyReport => ({
  id: row.id,
  date: row.created_at.slice(0, 10),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  dayType: row.day_type,
  weeklyReportId: row.weekly_report_id,
});

const mapRowToDailyReportEntry = (row: DailyReportEntryRow): DailyReportEntry => ({
  dailyReportId: row.daily_report_id,
  entryId: row.entry_id,
  position: row.position,
});

export const getDailyReports = (
  db: Database.Database,
  filter?: {
    fromDate?: string;
    toDate?: string;
    dayType?: DayType;
  },
): DailyReport[] => {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter?.dayType) {
    where.push('day_type = ?');
    params.push(filter.dayType);
  }
  if (filter?.fromDate) {
    where.push("substr(created_at, 1, 10) >= ?");
    params.push(filter.fromDate);
  }
  if (filter?.toDate) {
    where.push("substr(created_at, 1, 10) <= ?");
    params.push(filter.toDate);
  }
  const query = `
    SELECT id, created_at, updated_at, day_type, weekly_report_id
    FROM daily_reports
    ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY created_at, id
  `;
  const rows = db.prepare(query).all(...params) as DailyReportRow[];
  return rows.map(mapRowToDailyReport);
};

export const getDailyReportsByWeeklyReportId = (
  db: Database.Database,
  weeklyReportId: number,
): DailyReport[] => {
  const rows = db
    .prepare(
      `SELECT id, created_at, updated_at, day_type, weekly_report_id
       FROM daily_reports
       WHERE weekly_report_id = ?
       ORDER BY created_at, id`,
    )
    .all(weeklyReportId) as DailyReportRow[];
  return rows.map(mapRowToDailyReport);
};

export const getDailyReport = (
  db: Database.Database,
  id: string,
): DailyReport | null => {
  const row = db
    .prepare(
      `SELECT id, created_at, updated_at, day_type, weekly_report_id
       FROM daily_reports
       WHERE id = ?`,
    )
    .get(id) as DailyReportRow | undefined;
  return row ? mapRowToDailyReport(row) : null;
};

export const setDailyReport = (
  db: Database.Database,
  input: DailyReportCreateInput,
): DailyReport => {
  const id = trimText(input.id);
  const date = normalizeDate(input.date);
  const createdAt = toIsoFromDate(date);
  const updatedAt = createdAt;
  db.prepare(
    `INSERT INTO daily_reports (id, created_at, updated_at, day_type, weekly_report_id)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, createdAt, updatedAt, input.dayType, input.weeklyReportId ?? null);
  return {
    id,
    date,
    createdAt,
    updatedAt,
    dayType: input.dayType,
    weeklyReportId: input.weeklyReportId ?? null,
  };
};

export const updateDailyReport = (
  db: Database.Database,
  id: string,
  input: DailyReportUpdateInput,
): DailyReport => {
  const current = getDailyReport(db, id);
  if (!current) {
    throw new Error('daily_report_not_found');
  }
  const nextDate = input.date ? normalizeDate(input.date) : current.date;
  const nextCreatedAt = toIsoFromDate(nextDate);
  const nextUpdatedAt = new Date().toISOString();
  const nextDayType = input.dayType ?? current.dayType;
  const nextWeeklyReportId =
    input.weeklyReportId === undefined
      ? current.weeklyReportId
      : input.weeklyReportId;
  db.prepare(
    `UPDATE daily_reports
     SET created_at = ?, updated_at = ?, day_type = ?, weekly_report_id = ?
     WHERE id = ?`,
  ).run(nextCreatedAt, nextUpdatedAt, nextDayType, nextWeeklyReportId, id);
  return {
    id: current.id,
    date: nextDate,
    createdAt: nextCreatedAt,
    updatedAt: nextUpdatedAt,
    dayType: nextDayType,
    weeklyReportId: nextWeeklyReportId,
  };
};

export const deleteDailyReport = (
  db: Database.Database,
  id: string,
): boolean => {
  const transaction = db.transaction((targetId: string) => {
    db.prepare('DELETE FROM daily_report_entries WHERE daily_report_id = ?').run(
      targetId,
    );
    const result = db.prepare('DELETE FROM daily_reports WHERE id = ?').run(targetId);
    return result.changes > 0;
  });
  return transaction(id);
};

export const getDailyReportEntries = (
  db: Database.Database,
  dailyReportId: string,
): DailyReportEntry[] => {
  const rows = db
    .prepare(
      `SELECT daily_report_id, entry_id, position
       FROM daily_report_entries
       WHERE daily_report_id = ?
       ORDER BY position, entry_id`,
    )
    .all(dailyReportId) as DailyReportEntryRow[];
  return rows.map(mapRowToDailyReportEntry);
};

export const replaceDailyReportEntries = (
  db: Database.Database,
  payload: { dailyReportId: string; entries: Array<{ entryId: number; position: number }> },
): DailyReportEntry[] => {
  const transaction = db.transaction(
    (targetPayload: {
      dailyReportId: string;
      entries: Array<{ entryId: number; position: number }>;
    }) => {
      db.prepare('DELETE FROM daily_report_entries WHERE daily_report_id = ?').run(
        targetPayload.dailyReportId,
      );
      const insert = db.prepare(
        `INSERT INTO daily_report_entries (daily_report_id, entry_id, position)
         VALUES (?, ?, ?)`,
      );
      targetPayload.entries.forEach((entry) => {
        insert.run(targetPayload.dailyReportId, entry.entryId, entry.position);
      });
    },
  );
  transaction(payload);
  return getDailyReportEntries(db, payload.dailyReportId);
};

export const removeDailyReportEntry = (
  db: Database.Database,
  payload: { dailyReportId: string; entryId: number },
): boolean => {
  const result = db
    .prepare(
      'DELETE FROM daily_report_entries WHERE daily_report_id = ? AND entry_id = ?',
    )
    .run(payload.dailyReportId, payload.entryId);
  return result.changes > 0;
};

