import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import Database from 'better-sqlite3-multiple-ciphers';

const getDbPath = () => path.join(app.getPath('userData'), 'data', 'app.db');

const ensureDbDir = async () => {
  const dbPath = getDbPath();
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
};

export class DbService {
  private db: Database.Database | null = null;

  private openedPath: string | null = null;

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
    this.db = db;
    this.openedPath = dbPath;
  }

  async close() {
    if (!this.db) {
      return;
    }
    const current = this.db;
    this.db = null;
    this.openedPath = null;
    current.close();
  }

  getPath() {
    return this.openedPath ?? getDbPath();
  }
}
