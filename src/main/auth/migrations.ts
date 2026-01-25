import Database from 'better-sqlite3-multiple-ciphers';
import { startCriticalOperation } from '../criticalOperations';

type Migration = {
  version: number;
  statements: string[];
};

const migrations: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS config (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        surname TEXT NOT NULL,
        ihk_link TEXT,
        department TEXT,
        trainer_email TEXT,
        training_start TEXT,
        training_end TEXT,
        settings TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS timetable (
        id TEXT PRIMARY KEY,
        teacher TEXT NOT NULL,
        subject TEXT NOT NULL,
        weekday INTEGER NOT NULL,
        "order" INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS weekly_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start TEXT NOT NULL,
        week_end TEXT NOT NULL,
        department_when_sent TEXT,
        trainer_email_when_sent TEXT,
        sent INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS daily_reports (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        day_type TEXT NOT NULL CHECK (day_type IN ('school', 'work', 'leave')),
        weekly_report_id INTEGER,
        FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id)
      )`,
      `CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activities TEXT NOT NULL,
        day_type TEXT NOT NULL CHECK (day_type IN ('school', 'work', 'leave'))
      )`,
      `CREATE TABLE IF NOT EXISTS daily_report_entries (
        daily_report_id TEXT NOT NULL,
        entry_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (daily_report_id, entry_id),
        FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id),
        FOREIGN KEY (entry_id) REFERENCES entries(id)
      )`,
      `CREATE TABLE IF NOT EXISTS absences (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'weekend', 'holiday', 'school_break', 'other')),
        from_date TEXT NOT NULL,
        to_date TEXT NOT NULL,
        note TEXT
      )`,
    ],
  },
  {
    version: 2,
    statements: [
      `ALTER TABLE weekly_reports ADD COLUMN sent INTEGER NOT NULL DEFAULT 0`,
    ],
  },
];

const ensureMigrationsTable = (db: Database.Database) => {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);
};

const getCurrentVersion = (db: Database.Database) => {
  const row = db
    .prepare('SELECT COALESCE(MAX(version), 0) as version FROM schema_migrations')
    .get() as { version: number };
  return row.version;
};

const applyMigration = (db: Database.Database, migration: Migration) => {
  const apply = db.transaction((target: Migration) => {
    target.statements.forEach((statement) => {
      db.exec(statement);
    });
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
      .run(target.version, new Date().toISOString());
  });
  apply(migration);
};

export const runMigrations = (db: Database.Database) => {
  const endCritical = startCriticalOperation();
  ensureMigrationsTable(db);
  try {
    const currentVersion = getCurrentVersion(db);
    migrations
      .filter((migration) => migration.version > currentVersion)
      .sort((a, b) => a.version - b.version)
      .forEach((migration) => applyMigration(db, migration));
  } finally {
    endCritical();
  }
};
