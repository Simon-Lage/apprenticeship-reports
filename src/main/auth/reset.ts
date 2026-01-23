import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { DbService } from './db';
import {
  buildKeyring,
  clearKeyring,
  loadKeyring,
  unwrapDekWithPassword,
  wrapDekWithPassword,
} from './keyring';

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const fileExists = async (filePath: string) => {
  try {
    await fs.stat(filePath);
    return true;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
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

export const resetApplication = async (password: string, db: DbService) => {
  const keyring = await loadKeyring();
  if (!keyring?.password) {
    throw new Error('not_initialized');
  }
  const dek = unwrapDekWithPassword(keyring.password, password);
  await db.close();

  const backupDir = path.join(
    app.getPath('userData'),
    'backups',
    `reset-${new Date().toISOString().replace(/[:.]/g, '-')}`,
  );
  await ensureDir(backupDir);

  const dbPath = db.getPath();
  if (await fileExists(dbPath)) {
    await fs.copyFile(dbPath, path.join(backupDir, 'app.db'));
  }

  const backupKeyring = buildKeyring(wrapDekWithPassword(dek, password));
  await fs.writeFile(path.join(backupDir, 'keyring.json'), JSON.stringify(backupKeyring, null, 2), 'utf-8');

  await removeFile(dbPath);
  await clearKeyring();
};
