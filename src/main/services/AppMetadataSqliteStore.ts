import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

import { z } from 'zod';

import {
  AppMetadata,
  AppMetadataSchema,
  createDefaultAppMetadata,
} from '@/shared/app/state';

type AppMetadataRow = {
  payload: string;
};

type PasswordCredentialRow = {
  salt: string;
  hash: string;
  created_at: string;
  updated_at: string;
};

export const StoredPasswordCredentialSchema = z.object({
  salt: z.string().min(1),
  hash: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type StoredPasswordCredential = z.infer<
  typeof StoredPasswordCredentialSchema
>;

type Migration = {
  version: number;
  statements: string[];
};

const migrations: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS app_metadata (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS password_credentials (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        salt TEXT NOT NULL,
        hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
];

function replaceExtension(filePath: string, nextExtension: string): string {
  const parsedPath = path.parse(filePath);
  return path.join(parsedPath.dir, `${parsedPath.name}${nextExtension}`);
}

function parseStoredMetadata(payload: string): AppMetadata {
  return AppMetadataSchema.parse(JSON.parse(payload) as unknown);
}

function serializeMetadata(value: AppMetadata): string {
  return JSON.stringify(AppMetadataSchema.parse(value));
}

export class AppMetadataSqliteStore {
  private readonly databasePath: string;

  private readonly legacyFilePath: string;

  private readonly now: () => string;

  constructor(filePath: string, now: () => string) {
    this.databasePath = replaceExtension(filePath, '.sqlite');
    this.legacyFilePath = filePath;
    this.now = now;
  }

  getDatabasePath(): string {
    return this.databasePath;
  }

  private async ensureDatabaseDirectory(): Promise<void> {
    await fs.mkdir(path.dirname(this.databasePath), { recursive: true });
  }

  private configureDatabase(database: DatabaseSync): void {
    database.exec('PRAGMA foreign_keys = ON');
    database.exec('PRAGMA journal_mode = WAL');
    database.exec('PRAGMA synchronous = NORMAL');
  }

  private ensureMigrationsTable(database: DatabaseSync): void {
    database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`);
  }

  private getCurrentVersion(database: DatabaseSync): number {
    const row = database
      .prepare(
        'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations',
      )
      .get() as { version: number };

    return row.version;
  }

  private applyMigration(database: DatabaseSync, migration: Migration): void {
    try {
      database.exec('BEGIN');
      migration.statements.forEach((statement) => {
        database.exec(statement);
      });
      database
        .prepare(
          'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        )
        .run(migration.version, this.now());
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  private runMigrations(database: DatabaseSync): void {
    this.ensureMigrationsTable(database);

    const currentVersion = this.getCurrentVersion(database);

    migrations
      .filter((migration) => migration.version > currentVersion)
      .sort((left, right) => left.version - right.version)
      .forEach((migration) => {
        this.applyMigration(database, migration);
      });
  }

  private readStoredRow(database: DatabaseSync): AppMetadataRow | null {
    const row = database
      .prepare('SELECT payload FROM app_metadata WHERE id = 1')
      .get() as AppMetadataRow | undefined;

    return row ?? null;
  }

  private readPasswordCredentialRow(
    database: DatabaseSync,
  ): PasswordCredentialRow | null {
    const row = database
      .prepare(
        'SELECT salt, hash, created_at, updated_at FROM password_credentials WHERE id = 1',
      )
      .get() as PasswordCredentialRow | undefined;

    return row ?? null;
  }

  private writePasswordCredentialRow(
    database: DatabaseSync,
    value: StoredPasswordCredential,
  ): StoredPasswordCredential {
    const parsedValue = StoredPasswordCredentialSchema.parse(value);

    database
      .prepare(
        `INSERT INTO password_credentials (id, salt, hash, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           salt = excluded.salt,
           hash = excluded.hash,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at`,
      )
      .run(
        parsedValue.salt,
        parsedValue.hash,
        parsedValue.createdAt,
        parsedValue.updatedAt,
      );

    return parsedValue;
  }

  private writeStoredMetadata(
    database: DatabaseSync,
    value: AppMetadata,
    updatedAt: string,
  ): AppMetadata {
    const parsedValue = AppMetadataSchema.parse(value);
    const serializedValue = serializeMetadata(parsedValue);

    database
      .prepare(
        `INSERT INTO app_metadata (id, payload, updated_at)
         VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payload = excluded.payload,
           updated_at = excluded.updated_at`,
      )
      .run(serializedValue, updatedAt);

    return parsedValue;
  }

  private async readLegacyMetadata(): Promise<AppMetadata | null> {
    if (!existsSync(this.legacyFilePath)) {
      return null;
    }

    const serialized = await fs.readFile(this.legacyFilePath, 'utf-8');
    return parseStoredMetadata(serialized);
  }

  private async bootstrapMetadata(database: DatabaseSync): Promise<void> {
    const storedRow = this.readStoredRow(database);

    if (storedRow) {
      return;
    }

    const legacyMetadata = await this.readLegacyMetadata();
    const nextState = legacyMetadata ?? createDefaultAppMetadata(this.now());

    this.writeStoredMetadata(database, nextState, this.now());
  }

  private async withDatabase<T>(
    task: (database: DatabaseSync) => Promise<T> | T,
  ): Promise<T> {
    await this.ensureDatabaseDirectory();

    const database = new DatabaseSync(this.databasePath);

    try {
      this.configureDatabase(database);
      this.runMigrations(database);
      await this.bootstrapMetadata(database);
      return await task(database);
    } finally {
      database.close();
    }
  }

  async read(): Promise<AppMetadata> {
    return this.withDatabase((database) => {
      const storedRow = this.readStoredRow(database);

      if (!storedRow) {
        throw new Error('App metadata could not be loaded.');
      }

      return parseStoredMetadata(storedRow.payload);
    });
  }

  async write(value: AppMetadata): Promise<AppMetadata> {
    return this.withDatabase((database) =>
      this.writeStoredMetadata(database, value, this.now()),
    );
  }

  async hasPasswordCredential(): Promise<boolean> {
    return this.withDatabase((database) =>
      Boolean(this.readPasswordCredentialRow(database)),
    );
  }

  async readPasswordCredential(): Promise<StoredPasswordCredential | null> {
    return this.withDatabase((database) => {
      const row = this.readPasswordCredentialRow(database);

      if (!row) {
        return null;
      }

      return StoredPasswordCredentialSchema.parse({
        salt: row.salt,
        hash: row.hash,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    });
  }

  async writePasswordCredential(
    value: StoredPasswordCredential,
  ): Promise<StoredPasswordCredential> {
    return this.withDatabase((database) =>
      this.writePasswordCredentialRow(database, value),
    );
  }
}
