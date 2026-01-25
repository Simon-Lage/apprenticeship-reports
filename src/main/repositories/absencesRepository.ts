import Database from 'better-sqlite3-multiple-ciphers';
import { trimOptionalText, trimText } from './repositoryUtils';
import { AbsenceType } from './types';

export type Absence = {
  id: string;
  type: AbsenceType;
  fromDate: string;
  toDate: string;
  note: string | null;
};

export type AbsenceCreateInput = {
  id: string;
  type: AbsenceType;
  fromDate: string;
  toDate: string;
  note?: string | null;
};

export type AbsenceUpdateInput = Partial<Omit<Absence, 'id'>>;

type AbsenceRow = {
  id: string;
  type: AbsenceType;
  from_date: string;
  to_date: string;
  note: string | null;
};

const mapRowToAbsence = (row: AbsenceRow): Absence => ({
  id: row.id,
  type: row.type,
  fromDate: row.from_date,
  toDate: row.to_date,
  note: row.note,
});

export const getAbsences = (db: Database.Database): Absence[] => {
  const rows = db
    .prepare('SELECT id, type, from_date, to_date, note FROM absences ORDER BY from_date, to_date')
    .all() as AbsenceRow[];
  return rows.map(mapRowToAbsence);
};

export const getAbsencesByType = (db: Database.Database, type: AbsenceType): Absence[] => {
  const rows = db
    .prepare(
      'SELECT id, type, from_date, to_date, note FROM absences WHERE type = ? ORDER BY from_date, to_date',
    )
    .all(type) as AbsenceRow[];
  return rows.map(mapRowToAbsence);
};

export const getAbsence = (db: Database.Database, id: string): Absence | null => {
  const row = db
    .prepare('SELECT id, type, from_date, to_date, note FROM absences WHERE id = ?')
    .get(id) as AbsenceRow | undefined;
  return row ? mapRowToAbsence(row) : null;
};

export const setAbsence = (db: Database.Database, input: AbsenceCreateInput): Absence => {
  const id = trimText(input.id);
  const fromDate = trimText(input.fromDate);
  const toDate = trimText(input.toDate);
  const note = trimOptionalText(input.note);
  db.prepare('INSERT INTO absences (id, type, from_date, to_date, note) VALUES (?, ?, ?, ?, ?)').run(
    id,
    input.type,
    fromDate,
    toDate,
    note,
  );
  return {
    id,
    type: input.type,
    fromDate,
    toDate,
    note,
  };
};

export const updateAbsence = (
  db: Database.Database,
  id: string,
  input: AbsenceUpdateInput,
): Absence => {
  const current = getAbsence(db, id);
  if (!current) {
    throw new Error('absence_not_found');
  }
  const next = {
    ...current,
    ...input,
  };
  const fromDate = trimText(next.fromDate);
  const toDate = trimText(next.toDate);
  const note = trimOptionalText(next.note);
  db.prepare('UPDATE absences SET type = ?, from_date = ?, to_date = ?, note = ? WHERE id = ?').run(
    next.type,
    fromDate,
    toDate,
    note,
    current.id,
  );
  return {
    ...next,
    fromDate,
    toDate,
    note,
  };
};

export const deleteAbsence = (db: Database.Database, id: string): boolean => {
  const result = db.prepare('DELETE FROM absences WHERE id = ?').run(id);
  return result.changes > 0;
};
