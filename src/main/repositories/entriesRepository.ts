import Database from 'better-sqlite3-multiple-ciphers';
import { trimText } from './repositoryUtils';
import { DayType } from './types';

export type Entry = {
  id: number;
  activities: string;
  dayType: DayType;
};

export type EntryCreateInput = {
  activities: string;
  dayType: DayType;
};

export type EntryUpdateInput = Partial<EntryCreateInput>;

type EntryRow = {
  id: number;
  activities: string;
  day_type: DayType;
};

const mapRowToEntry = (row: EntryRow): Entry => ({
  id: row.id,
  activities: row.activities,
  dayType: row.day_type,
});

export const getEntries = (db: Database.Database): Entry[] => {
  const rows = db
    .prepare('SELECT id, activities, day_type FROM entries ORDER BY id')
    .all() as EntryRow[];
  return rows.map(mapRowToEntry);
};

export const getEntriesByDayType = (db: Database.Database, dayType: DayType): Entry[] => {
  const rows = db
    .prepare('SELECT id, activities, day_type FROM entries WHERE day_type = ? ORDER BY id')
    .all(dayType) as EntryRow[];
  return rows.map(mapRowToEntry);
};

export const getEntriesByWeeklyReportId = (
  db: Database.Database,
  weeklyReportId: number,
): Entry[] => {
  const rows = db
    .prepare(
      `SELECT DISTINCT e.id, e.activities, e.day_type
       FROM entries e
       INNER JOIN daily_report_entries dre ON dre.entry_id = e.id
       INNER JOIN daily_reports dr ON dr.id = dre.daily_report_id
       WHERE dr.weekly_report_id = ?
       ORDER BY e.id`,
    )
    .all(weeklyReportId) as EntryRow[];
  return rows.map(mapRowToEntry);
};

export const getEntry = (db: Database.Database, id: number): Entry | null => {
  const row = db
    .prepare('SELECT id, activities, day_type FROM entries WHERE id = ?')
    .get(id) as EntryRow | undefined;
  return row ? mapRowToEntry(row) : null;
};

export const setEntry = (db: Database.Database, input: EntryCreateInput): Entry => {
  const activities = trimText(input.activities);
  const result = db
    .prepare('INSERT INTO entries (activities, day_type) VALUES (?, ?)')
    .run(activities, input.dayType);
  return {
    id: Number(result.lastInsertRowid),
    activities,
    dayType: input.dayType,
  };
};

export const updateEntry = (
  db: Database.Database,
  id: number,
  input: EntryUpdateInput,
): Entry => {
  const current = getEntry(db, id);
  if (!current) {
    throw new Error('entry_not_found');
  }
  const next = {
    ...current,
    ...input,
  };
  const activities = trimText(next.activities);
  db.prepare('UPDATE entries SET activities = ?, day_type = ? WHERE id = ?').run(
    activities,
    next.dayType,
    id,
  );
  return {
    ...next,
    activities,
  };
};

export const deleteEntry = (db: Database.Database, id: number): boolean => {
  const result = db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  return result.changes > 0;
};
