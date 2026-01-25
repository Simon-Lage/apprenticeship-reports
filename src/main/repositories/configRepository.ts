import Database from 'better-sqlite3-multiple-ciphers';
import { trimOptionalText, trimText } from './repositoryUtils';

export type Config = {
  id: string;
  name: string;
  surname: string;
  ihkLink: string | null;
  department: string | null;
  trainerEmail: string | null;
  trainingStart: string | null;
  trainingEnd: string | null;
  settings: string;
};

export type ConfigUpdate = Partial<Omit<Config, 'id'>> & { id?: string };

type ConfigRow = {
  id: string;
  name: string;
  surname: string;
  ihk_link: string | null;
  department: string | null;
  trainer_email: string | null;
  training_start: string | null;
  training_end: string | null;
  settings: string;
};

const mapRowToConfig = (row: ConfigRow): Config => ({
  id: row.id,
  name: row.name,
  surname: row.surname,
  ihkLink: row.ihk_link,
  department: row.department,
  trainerEmail: row.trainer_email,
  trainingStart: row.training_start,
  trainingEnd: row.training_end,
  settings: row.settings,
});

const normalizeConfig = (config: Config): Config => ({
  id: trimText(config.id),
  name: trimText(config.name),
  surname: trimText(config.surname),
  ihkLink: trimOptionalText(config.ihkLink),
  department: trimOptionalText(config.department),
  trainerEmail: trimOptionalText(config.trainerEmail),
  trainingStart: trimOptionalText(config.trainingStart),
  trainingEnd: trimOptionalText(config.trainingEnd),
  settings: trimText(config.settings),
});

export const getConfig = (db: Database.Database): Config | null => {
  const row = db
    .prepare(
      `SELECT id, name, surname, ihk_link, department, trainer_email, training_start, training_end, settings
       FROM config
       LIMIT 1`,
    )
    .get() as ConfigRow | undefined;
  return row ? mapRowToConfig(row) : null;
};

export const updateConfig = (db: Database.Database, update: ConfigUpdate): Config => {
  const current = getConfig(db);
  if (!current) {
    throw new Error('config_not_found');
  }
  const next = normalizeConfig({ ...current, ...update, id: current.id });
  db.prepare(
    `UPDATE config
     SET name = ?, surname = ?, ihk_link = ?, department = ?, trainer_email = ?, training_start = ?, training_end = ?, settings = ?
     WHERE id = ?`,
  ).run(
    next.name,
    next.surname,
    next.ihkLink,
    next.department,
    next.trainerEmail,
    next.trainingStart,
    next.trainingEnd,
    next.settings,
    next.id,
  );
  return next;
};
