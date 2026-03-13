import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export type BackupProvider = 'local' | 'google-drive';

export type BackupCandidate = {
  provider: BackupProvider;
  filePath: string;
  modifiedAt: number;
};

const getLocalBackupDir = () =>
  path.join(app.getPath('documents'), 'apprenticeship-reports', 'backups');

const getDriveMirrorBackupDir = () =>
  path.join(app.getPath('userData'), 'logic', 'backup', 'drive-mirror');

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const listDbBackups = async (
  dir: string,
  provider: BackupProvider,
): Promise<BackupCandidate[]> => {
  try {
    const names = await fs.readdir(dir);
    const candidates = await Promise.all(
      names
        .filter((name) => name.endsWith('.encrypted.db'))
        .map(async (name) => {
          const filePath = path.join(dir, name);
          const stats = await fs.stat(filePath);
          return {
            provider,
            filePath,
            modifiedAt: stats.mtimeMs,
          } satisfies BackupCandidate;
        }),
    );
    return candidates.sort((a, b) => b.modifiedAt - a.modifiedAt);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ENOENT'
    ) {
      return [];
    }
    throw error;
  }
};

const createBackupName = (provider: BackupProvider) => {
  const token = new Date().toISOString().replace(/[:.]/g, '-');
  return `${provider}-backup-${token}.encrypted.db`;
};

export const copyToLocalBackup = async (sourceFilePath: string) => {
  const dir = getLocalBackupDir();
  await ensureDir(dir);
  const targetPath = path.join(dir, createBackupName('local'));
  await fs.copyFile(sourceFilePath, targetPath);
  return targetPath;
};

export const copyToDriveMirrorBackup = async (sourceFilePath: string) => {
  const dir = getDriveMirrorBackupDir();
  await ensureDir(dir);
  const targetPath = path.join(dir, createBackupName('google-drive'));
  await fs.copyFile(sourceFilePath, targetPath);
  return targetPath;
};

export const getNewestBackupCandidate = async () => {
  const [local, drive] = await Promise.all([
    listDbBackups(getLocalBackupDir(), 'local'),
    listDbBackups(getDriveMirrorBackupDir(), 'google-drive'),
  ]);
  const all = [...local, ...drive];
  if (all.length === 0) {
    return null;
  }
  all.sort((a, b) => b.modifiedAt - a.modifiedAt);
  return all[0];
};
