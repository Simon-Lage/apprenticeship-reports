import { existsSync, promises as fs } from 'fs';
import path from 'path';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';
import { DatabaseSync as PlainDatabaseSync } from 'node:sqlite';

import Database = require('better-sqlite3-multiple-ciphers');
import { z } from 'zod';

import {
  AppMetadata,
  AppMetadataSchema,
  createDefaultAppMetadata,
} from '@/shared/app/state';
import { AppSessionSchema, UserAccountSchema } from '@/shared/auth/session';
import { SecretStorageService } from '@/main/services/SecretStorageService';

type AppMetadataRow = {
  payload: string;
};

type PasswordCredentialRow = {
  salt: string;
  hash: string;
  created_at: string;
  updated_at: string;
};

const StoredPasswordCredentialSchema = z.object({
  salt: z.string().min(1),
  hash: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const PasswordKeyWrapSchema = z.object({
  salt: z.string().min(1),
  iv: z.string().min(1),
  tag: z.string().min(1),
  ciphertext: z.string().min(1),
});

const AuthEnvelopeSchema = z.object({
  version: z.literal(1),
  passwordCredential: StoredPasswordCredentialSchema.nullable().default(null),
  passwordKeyWrap: PasswordKeyWrapSchema.nullable().default(null),
  rememberedKeyWrap: z.string().min(1).nullable().default(null),
  googleKeyWrap: z.string().min(1).nullable().default(null),
  persistedSession: AppSessionSchema.nullable().default(null),
  googleAccount: UserAccountSchema.nullable().default(null),
});

export type StoredPasswordCredential = z.infer<
  typeof StoredPasswordCredentialSchema
>;
type AuthEnvelope = z.infer<typeof AuthEnvelopeSchema>;

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

function createAuthEnvelope(): AuthEnvelope {
  return AuthEnvelopeSchema.parse({
    version: 1,
  });
}

function derivePasswordWrapKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32, {
    N: 16_384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
}

function encryptDatabaseKeyWithPassword(
  databaseKey: string,
  password: string,
): z.infer<typeof PasswordKeyWrapSchema> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = derivePasswordWrapKey(password, salt);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(databaseKey, 'utf8'),
    cipher.final(),
  ]);

  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptDatabaseKeyWithPassword(
  wrap: z.infer<typeof PasswordKeyWrapSchema>,
  password: string,
): string {
  const key = derivePasswordWrapKey(password, Buffer.from(wrap.salt, 'hex'));
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(wrap.iv, 'hex'),
  );

  decipher.setAuthTag(Buffer.from(wrap.tag, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(wrap.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function createDatabaseKey(): string {
  return randomBytes(32).toString('hex');
}

function assertDatabaseKey(value: string): string {
  if (!/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error('Invalid database key.');
  }

  return value;
}

export class AppMetadataSqliteStore {
  private readonly databasePath: string;

  private readonly authEnvelopePath: string;

  private readonly legacyFilePath: string;

  private readonly now: () => string;

  private readonly secretStorage: SecretStorageService | null;

  private databaseKey: string | null = null;

  constructor(
    filePath: string,
    now: () => string,
    secretStorage: SecretStorageService | null = null,
  ) {
    this.databasePath = replaceExtension(filePath, '.sqlite');
    this.authEnvelopePath = replaceExtension(filePath, '.auth.json');
    this.legacyFilePath = filePath;
    this.now = now;
    this.secretStorage = secretStorage;
  }

  getDatabasePath(): string {
    return this.databasePath;
  }

  isUnlocked(): boolean {
    return Boolean(this.databaseKey);
  }

  lock(): void {
    this.databaseKey = null;
  }

  private async ensureStorageDirectory(): Promise<void> {
    await fs.mkdir(path.dirname(this.databasePath), { recursive: true });
  }

  private async readAuthEnvelope(): Promise<AuthEnvelope> {
    if (!existsSync(this.authEnvelopePath)) {
      const legacyCredential = await this.readLegacyPasswordCredential();

      return AuthEnvelopeSchema.parse({
        ...createAuthEnvelope(),
        passwordCredential: legacyCredential,
      });
    }

    const serialized = await fs.readFile(this.authEnvelopePath, 'utf-8');
    return AuthEnvelopeSchema.parse(JSON.parse(serialized) as unknown);
  }

  private async writeAuthEnvelope(value: AuthEnvelope): Promise<AuthEnvelope> {
    const parsedValue = AuthEnvelopeSchema.parse(value);

    await fs.mkdir(path.dirname(this.authEnvelopePath), { recursive: true });
    await fs.writeFile(
      this.authEnvelopePath,
      JSON.stringify(parsedValue, null, 2),
      'utf-8',
    );

    return parsedValue;
  }

  private configureEncryptedDatabase(database: Database): void {
    database.exec('PRAGMA foreign_keys = ON');
    database.exec('PRAGMA journal_mode = WAL');
    database.exec('PRAGMA synchronous = NORMAL');
  }

  private openEncryptedDatabase(): Database {
    if (!this.databaseKey) {
      throw new Error('Die lokale Datenbank ist gesperrt.');
    }

    const databaseKey = assertDatabaseKey(this.databaseKey);
    const database = new Database(this.databasePath);

    database.pragma("cipher='sqlcipher'");
    database.pragma('legacy=4');
    database.pragma(`key='${databaseKey}'`);
    database.prepare('SELECT count(*) AS count FROM sqlite_master').get();
    this.configureEncryptedDatabase(database);
    this.runMigrations(database);
    return database;
  }

  private ensureMigrationsTable(database: Database): void {
    database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`);
  }

  private getCurrentVersion(database: Database): number {
    const row = database
      .prepare(
        'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations',
      )
      .get() as { version: number };

    return row.version;
  }

  private applyMigration(database: Database, migration: Migration): void {
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

  private runMigrations(database: Database): void {
    this.ensureMigrationsTable(database);

    const currentVersion = this.getCurrentVersion(database);

    migrations
      .filter((migration) => migration.version > currentVersion)
      .sort((left, right) => left.version - right.version)
      .forEach((migration) => {
        this.applyMigration(database, migration);
      });
  }

  private readStoredRow(database: Database): AppMetadataRow | null {
    const row = database
      .prepare('SELECT payload FROM app_metadata WHERE id = 1')
      .get() as AppMetadataRow | undefined;

    return row ?? null;
  }

  private writeStoredMetadata(
    database: Database,
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

  private async readLegacyJsonMetadata(): Promise<AppMetadata | null> {
    if (!existsSync(this.legacyFilePath)) {
      return null;
    }

    const serialized = await fs.readFile(this.legacyFilePath, 'utf-8');
    return parseStoredMetadata(serialized);
  }

  private async readLegacySqliteMetadata(): Promise<AppMetadata | null> {
    if (!existsSync(this.databasePath) || existsSync(this.authEnvelopePath)) {
      return null;
    }

    const database = new PlainDatabaseSync(this.databasePath);

    try {
      const row = database
        .prepare('SELECT payload FROM app_metadata WHERE id = 1')
        .get() as AppMetadataRow | undefined;

      return row ? parseStoredMetadata(row.payload) : null;
    } catch {
      return null;
    } finally {
      database.close();
    }
  }

  private async readLegacyPasswordCredential(): Promise<StoredPasswordCredential | null> {
    if (!existsSync(this.databasePath) || existsSync(this.authEnvelopePath)) {
      return null;
    }

    const database = new PlainDatabaseSync(this.databasePath);

    try {
      const row = database
        .prepare(
          'SELECT salt, hash, created_at, updated_at FROM password_credentials WHERE id = 1',
        )
        .get() as PasswordCredentialRow | undefined;

      if (!row) {
        return null;
      }

      return StoredPasswordCredentialSchema.parse({
        salt: row.salt,
        hash: row.hash,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch {
      return null;
    } finally {
      database.close();
    }
  }

  private async readLegacyMetadata(): Promise<AppMetadata | null> {
    const legacySqliteMetadata = await this.readLegacySqliteMetadata();

    return legacySqliteMetadata ?? this.readLegacyJsonMetadata();
  }

  private async backupLegacyPlaintextDatabase(): Promise<void> {
    if (!existsSync(this.databasePath) || existsSync(this.authEnvelopePath)) {
      return;
    }

    const backupPath = replaceExtension(
      this.databasePath,
      `.plaintext-migrated-${this.now().replace(/[^0-9]/g, '')}.sqlite`,
    );

    await fs.rename(this.databasePath, backupPath);
  }

  private async bootstrapMetadata(database: Database): Promise<void> {
    const storedRow = this.readStoredRow(database);

    if (storedRow) {
      return;
    }

    const legacyMetadata = await this.readLegacyJsonMetadata();
    const nextState = legacyMetadata ?? createDefaultAppMetadata(this.now());

    this.writeStoredMetadata(database, nextState, this.now());
  }

  private async withEncryptedDatabase<T>(
    task: (database: Database) => Promise<T> | T,
  ): Promise<T> {
    await this.ensureStorageDirectory();

    const database = this.openEncryptedDatabase();

    try {
      await this.bootstrapMetadata(database);
      return await task(database);
    } finally {
      database.close();
    }
  }

  private createLockedMetadata(envelope: AuthEnvelope): AppMetadata {
    return AppMetadataSchema.parse({
      ...createDefaultAppMetadata(this.now()),
      auth: {
        persistedSession: null,
      },
      drive: {
        requiredScopes: [],
        grantedScopes: [],
        account: envelope.googleAccount,
        accessToken: null,
        refreshToken: null,
        connectedAt: null,
        lastValidatedAt: null,
        lastPromptedAt: null,
        explanation: null,
      },
    });
  }

  private async persistEnvelopeFromMetadata(
    metadata: AppMetadata,
  ): Promise<void> {
    if (!this.databaseKey) {
      return;
    }

    const envelope = await this.readAuthEnvelope();
    const nextEnvelope = AuthEnvelopeSchema.parse({
      ...envelope,
      persistedSession: metadata.auth.persistedSession,
      googleAccount: metadata.drive.account,
      rememberedKeyWrap:
        metadata.auth.persistedSession &&
        this.secretStorage?.isEncryptionAvailable()
          ? this.secretStorage.encryptString(this.databaseKey)
          : null,
      googleKeyWrap:
        metadata.drive.account && this.secretStorage?.isEncryptionAvailable()
          ? this.secretStorage.encryptString(this.databaseKey)
          : null,
    });

    await this.writeAuthEnvelope(nextEnvelope);
  }

  async unlockWithRememberedKey(): Promise<boolean> {
    const envelope = await this.readAuthEnvelope();

    if (
      !envelope.persistedSession ||
      !envelope.rememberedKeyWrap ||
      !this.secretStorage?.isEncryptionAvailable()
    ) {
      return false;
    }

    try {
      this.databaseKey = assertDatabaseKey(
        this.secretStorage.decryptString(envelope.rememberedKeyWrap),
      );
      await this.read();
      return true;
    } catch {
      this.databaseKey = null;
      return false;
    }
  }

  async unlockWithGoogle(): Promise<boolean> {
    const envelope = await this.readAuthEnvelope();

    if (
      !envelope.googleKeyWrap ||
      !this.secretStorage?.isEncryptionAvailable()
    ) {
      return false;
    }

    try {
      this.databaseKey = assertDatabaseKey(
        this.secretStorage.decryptString(envelope.googleKeyWrap),
      );
      await this.read();
      return true;
    } catch {
      this.databaseKey = null;
      return false;
    }
  }

  async unlockWithPassword(password: string): Promise<boolean> {
    const envelope = await this.readAuthEnvelope();

    if (!envelope.passwordKeyWrap) {
      const legacyMetadata = await this.readLegacyMetadata();

      if (!legacyMetadata || !envelope.passwordCredential) {
        return false;
      }

      const databaseKey = createDatabaseKey();
      const nextEnvelope = AuthEnvelopeSchema.parse({
        ...envelope,
        passwordKeyWrap: encryptDatabaseKeyWithPassword(databaseKey, password),
      });

      await this.backupLegacyPlaintextDatabase();
      this.databaseKey = databaseKey;
      await this.write(legacyMetadata);
      await this.writeAuthEnvelope(nextEnvelope);
      return true;
    }

    this.databaseKey = assertDatabaseKey(
      decryptDatabaseKeyWithPassword(envelope.passwordKeyWrap, password),
    );
    await this.read();
    return true;
  }

  async initializePassword(
    password: string,
    credential: StoredPasswordCredential,
  ): Promise<void> {
    const envelope = await this.readAuthEnvelope();

    if (envelope.passwordCredential) {
      throw new Error('Ein Passwort ist bereits eingerichtet.');
    }

    const databaseKey = createDatabaseKey();
    const legacyMetadata = await this.readLegacyMetadata();
    const nextEnvelope = AuthEnvelopeSchema.parse({
      ...envelope,
      passwordCredential: credential,
      passwordKeyWrap: encryptDatabaseKeyWithPassword(databaseKey, password),
    });

    await this.backupLegacyPlaintextDatabase();
    this.databaseKey = databaseKey;
    await this.write(legacyMetadata ?? createDefaultAppMetadata(this.now()));
    await this.writeAuthEnvelope(nextEnvelope);
  }

  async changePassword(
    password: string,
    credential: StoredPasswordCredential,
  ): Promise<void> {
    if (!this.databaseKey) {
      throw new Error('Die lokale Datenbank ist gesperrt.');
    }

    const envelope = await this.readAuthEnvelope();

    await this.writeAuthEnvelope(
      AuthEnvelopeSchema.parse({
        ...envelope,
        passwordCredential: credential,
        passwordKeyWrap: encryptDatabaseKeyWithPassword(
          this.databaseKey,
          password,
        ),
      }),
    );
  }

  async read(): Promise<AppMetadata> {
    if (!this.databaseKey) {
      return this.createLockedMetadata(await this.readAuthEnvelope());
    }

    return this.withEncryptedDatabase((database) => {
      const storedRow = this.readStoredRow(database);

      if (!storedRow) {
        throw new Error('App metadata could not be loaded.');
      }

      return parseStoredMetadata(storedRow.payload);
    });
  }

  async write(value: AppMetadata): Promise<AppMetadata> {
    if (!this.databaseKey) {
      throw new Error('Die lokale Datenbank ist gesperrt.');
    }

    const nextState = await this.withEncryptedDatabase((database) =>
      this.writeStoredMetadata(database, value, this.now()),
    );

    await this.persistEnvelopeFromMetadata(nextState);
    return nextState;
  }

  async hasPasswordCredential(): Promise<boolean> {
    const envelope = await this.readAuthEnvelope();
    return Boolean(envelope.passwordCredential);
  }

  async readPasswordCredential(): Promise<StoredPasswordCredential | null> {
    const envelope = await this.readAuthEnvelope();
    return envelope.passwordCredential;
  }

  async writePasswordCredential(
    value: StoredPasswordCredential,
  ): Promise<StoredPasswordCredential> {
    if (!this.databaseKey) {
      throw new Error('Die lokale Datenbank ist gesperrt.');
    }

    const parsedValue = StoredPasswordCredentialSchema.parse(value);
    const envelope = await this.readAuthEnvelope();

    await this.writeAuthEnvelope({
      ...envelope,
      passwordCredential: parsedValue,
    });

    return parsedValue;
  }
}
