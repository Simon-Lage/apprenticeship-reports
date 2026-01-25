import Database from 'better-sqlite3-multiple-ciphers';
import { trimText } from './repositoryUtils';

export type TimetableEntry = {
  id: string;
  teacher: string;
  subject: string;
  weekday: number;
  order: number;
};

type TimetableRow = {
  id: string;
  teacher: string;
  subject: string;
  weekday: number;
  order: number;
};

const mapRowToEntry = (row: TimetableRow): TimetableEntry => ({
  id: row.id,
  teacher: row.teacher,
  subject: row.subject,
  weekday: row.weekday,
  order: row.order,
});

export const getTimetable = (db: Database.Database): TimetableEntry[] => {
  const rows = db
    .prepare('SELECT id, teacher, subject, weekday, "order" FROM timetable ORDER BY weekday, "order", id')
    .all() as TimetableRow[];
  return rows.map(mapRowToEntry);
};

export const replaceTimetable = (db: Database.Database, entries: TimetableEntry[]): void => {
  const insert = db.prepare(
    'INSERT INTO timetable (id, teacher, subject, weekday, "order") VALUES (?, ?, ?, ?, ?)',
  );
  const replace = db.transaction((items: TimetableEntry[]) => {
    db.prepare('DELETE FROM timetable').run();
    items.forEach((entry) => {
      insert.run(
        trimText(entry.id),
        trimText(entry.teacher),
        trimText(entry.subject),
        entry.weekday,
        entry.order,
      );
    });
  });
  replace(entries);
};
