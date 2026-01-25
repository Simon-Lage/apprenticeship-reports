import Database from 'better-sqlite3-multiple-ciphers';
import { trimOptionalText, trimText } from './repositoryUtils';

export type WeeklyReport = {
  id: number;
  weekStart: string;
  weekEnd: string;
  departmentWhenSent: string | null;
  trainerEmailWhenSent: string | null;
  sent: boolean;
};

export type WeeklyReportCreateInput = {
  weekStart: string;
  weekEnd: string;
  departmentWhenSent?: string | null;
  trainerEmailWhenSent?: string | null;
  sent?: boolean;
};

export type WeeklyReportUpdateInput = Partial<WeeklyReportCreateInput>;

type WeeklyReportRow = {
  id: number;
  week_start: string;
  week_end: string;
  department_when_sent: string | null;
  trainer_email_when_sent: string | null;
  sent: number;
};

const mapRowToWeeklyReport = (row: WeeklyReportRow): WeeklyReport => ({
  id: row.id,
  weekStart: row.week_start,
  weekEnd: row.week_end,
  departmentWhenSent: row.department_when_sent,
  trainerEmailWhenSent: row.trainer_email_when_sent,
  sent: row.sent === 1,
});

const toDbBoolean = (value: boolean) => (value ? 1 : 0);

export const getWeeklyReports = (db: Database.Database): WeeklyReport[] => {
  const rows = db
    .prepare(
      `SELECT id, week_start, week_end, department_when_sent, trainer_email_when_sent, sent
       FROM weekly_reports
       ORDER BY week_start, week_end, id`,
    )
    .all() as WeeklyReportRow[];
  return rows.map(mapRowToWeeklyReport);
};

export const setWeeklyReport = (
  db: Database.Database,
  input: WeeklyReportCreateInput,
): WeeklyReport => {
  const weekStart = trimText(input.weekStart);
  const weekEnd = trimText(input.weekEnd);
  const departmentWhenSent = trimOptionalText(input.departmentWhenSent);
  const trainerEmailWhenSent = trimOptionalText(input.trainerEmailWhenSent);
  const sent = input.sent ?? false;
  const result = db
    .prepare(
      `INSERT INTO weekly_reports (week_start, week_end, department_when_sent, trainer_email_when_sent, sent)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(weekStart, weekEnd, departmentWhenSent, trainerEmailWhenSent, toDbBoolean(sent));
  return {
    id: Number(result.lastInsertRowid),
    weekStart,
    weekEnd,
    departmentWhenSent,
    trainerEmailWhenSent,
    sent,
  };
};

export const updateWeeklyReport = (
  db: Database.Database,
  id: number,
  input: WeeklyReportUpdateInput,
): WeeklyReport => {
  const current = getWeeklyReport(db, id);
  if (!current) {
    throw new Error('weekly_report_not_found');
  }
  const next = {
    ...current,
    ...input,
  };
  const weekStart = trimText(next.weekStart);
  const weekEnd = trimText(next.weekEnd);
  const departmentWhenSent = trimOptionalText(next.departmentWhenSent);
  const trainerEmailWhenSent = trimOptionalText(next.trainerEmailWhenSent);
  const sent = next.sent ?? false;
  db.prepare(
    `UPDATE weekly_reports
     SET week_start = ?, week_end = ?, department_when_sent = ?, trainer_email_when_sent = ?, sent = ?
     WHERE id = ?`,
  ).run(weekStart, weekEnd, departmentWhenSent, trainerEmailWhenSent, toDbBoolean(sent), id);
  return {
    ...next,
    weekStart,
    weekEnd,
    departmentWhenSent,
    trainerEmailWhenSent,
    sent,
  };
};

export const deleteWeeklyReport = (db: Database.Database, id: number): boolean => {
  const result = db.prepare('DELETE FROM weekly_reports WHERE id = ?').run(id);
  return result.changes > 0;
};

export const getWeeklyReport = (db: Database.Database, id: number): WeeklyReport | null => {
  const row = db
    .prepare(
      `SELECT id, week_start, week_end, department_when_sent, trainer_email_when_sent, sent
       FROM weekly_reports
       WHERE id = ?`,
    )
    .get(id) as WeeklyReportRow | undefined;
  return row ? mapRowToWeeklyReport(row) : null;
};
