import { app } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import Database from 'better-sqlite3-multiple-ciphers';
import { runMigrations } from './migrations';

const getDbPath = () => path.join(app.getPath('userData'), 'data', 'app.db');
const getDecryptedDbPath = () => path.join(app.getPath('userData'), 'data', 'app.decrypted.db');
const isDebugDekEnabled = () =>
  process.env.SHOW_DEBUG_DEK_KEY_IAEJFJDKDSMSDKLMDMFGKLKFMEKFEMFPEP342342324234 === 'true';

const ensureDbDir = async () => {
  const dbPath = getDbPath();
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
};

const removeFile = async (filePath: string) => {
  try {
    await fs.unlink(filePath);
  } catch (error: unknown) {
    if ((error as { code?: string }).code !== 'ENOENT') {
      throw error;
    }
  }
};

export class DbService {
  private db: Database.Database | null = null;

  private openedPath: string | null = null;

  private debugWatcher: fsSync.FSWatcher | null = null;

  private debugExportTimer: NodeJS.Timeout | null = null;

  private debugExportRunning = false;

  private debugExportPending = false;

  async open(dek: Buffer) {
    if (this.db) {
      return;
    }
    await ensureDbDir();
    const dbPath = getDbPath();
    const db = new Database(dbPath);
    const key = dek.toString('hex');
    db.pragma(`cipher='sqlcipher'`);
    db.pragma(`key="x'${key}'"`);
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    this.db = db;
    this.openedPath = dbPath;
    this.startDebugWatcher();
    this.scheduleDebugExport();
  }

  async close() {
    if (!this.db) {
      return;
    }
    const current = this.db;
    this.db = null;
    this.openedPath = null;
    this.stopDebugWatcher();
    current.close();
  }

  getPath() {
    return this.openedPath ?? getDbPath();
  }

  async exportDecrypted() {
    if (!this.db) {
      throw new Error('db_not_open');
    }
    const targetPath = getDecryptedDbPath();
    await removeFile(targetPath);
    const escapedPath = targetPath.replace(/'/g, "''");
    const db = this.db;
    db.exec(`ATTACH DATABASE '${escapedPath}' AS plaintext KEY ''`);
    db.exec('PRAGMA plaintext.foreign_keys = OFF');
    try {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[];
      db.exec('BEGIN');
      tables.forEach(({ name }) => {
        const safeName = name.replace(/"/g, '""');
        db.exec(`CREATE TABLE plaintext."${safeName}" AS SELECT * FROM main."${safeName}"`);
      });
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    } finally {
      db.exec('DETACH DATABASE plaintext');
    }
    return targetPath;
  }

  private scheduleDebugExport() {
    if (!isDebugDekEnabled() || !this.db) {
      return;
    }
    if (this.debugExportTimer) {
      clearTimeout(this.debugExportTimer);
    }
    this.debugExportTimer = setTimeout(() => {
      this.debugExportTimer = null;
      void this.runDebugExport();
    }, 500);
  }

  private async runDebugExport() {
    if (!isDebugDekEnabled() || !this.db) {
      return;
    }
    if (this.debugExportRunning) {
      this.debugExportPending = true;
      return;
    }
    this.debugExportRunning = true;
    try {
      await this.exportDecrypted();
    } finally {
      this.debugExportRunning = false;
      if (this.debugExportPending) {
        this.debugExportPending = false;
        this.scheduleDebugExport();
      }
    }
  }

  private startDebugWatcher() {
    if (!isDebugDekEnabled() || !this.openedPath || this.debugWatcher) {
      return;
    }
    this.debugWatcher = fsSync.watch(this.openedPath, { persistent: false }, () => {
      this.scheduleDebugExport();
    });
  }

  private stopDebugWatcher() {
    if (this.debugExportTimer) {
      clearTimeout(this.debugExportTimer);
      this.debugExportTimer = null;
    }
    if (this.debugWatcher) {
      this.debugWatcher.close();
      this.debugWatcher = null;
    }
    this.debugExportRunning = false;
    this.debugExportPending = false;
  }
}
