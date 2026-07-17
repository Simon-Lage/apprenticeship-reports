import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from 'fs';
import path from 'path';

const persistentUserDataDirectoryName = 'Apprenticeship Reports';
const alternateUserDataDirectoryName = 'apprenticeship-reports';
const migrationBackupDirectoryName = 'AppRep Data Backups';

const storedDataEntries = [
  'app-metadata.sqlite',
  'app-metadata.sqlite-shm',
  'app-metadata.sqlite-wal',
  'app-metadata.auth.json',
  'app-metadata.json',
  'data',
  'auth',
  'backups',
  'recovery',
];

const reportDataEntries = [
  'app-metadata.sqlite',
  'app-metadata.sqlite-wal',
  'app-metadata.json',
  'data',
];

function hasStoredData(directoryPath: string): boolean {
  return storedDataEntries.some((entry) =>
    existsSync(path.join(directoryPath, entry)),
  );
}

function getLatestModificationTime(targetPath: string): number | null {
  if (!existsSync(targetPath)) {
    return null;
  }

  const targetStat = lstatSync(targetPath);
  let latestModificationTime = targetStat.mtimeMs;

  if (targetStat.isDirectory()) {
    readdirSync(targetPath).forEach((entry) => {
      const entryModificationTime = getLatestModificationTime(
        path.join(targetPath, entry),
      );

      if (
        entryModificationTime !== null &&
        entryModificationTime > latestModificationTime
      ) {
        latestModificationTime = entryModificationTime;
      }
    });
  }

  return latestModificationTime;
}

function getLatestStoredDataModificationTime(
  directoryPath: string,
): number | null {
  const findLatestModificationTime = (entries: string[]): number | null =>
    entries.reduce<number | null>((latestModificationTime, entry) => {
      const entryModificationTime = getLatestModificationTime(
        path.join(directoryPath, entry),
      );

      if (entryModificationTime === null) {
        return latestModificationTime;
      }

      return latestModificationTime === null
        ? entryModificationTime
        : Math.max(latestModificationTime, entryModificationTime);
    }, null);

  return (
    findLatestModificationTime(reportDataEntries) ??
    findLatestModificationTime(storedDataEntries)
  );
}

function copyStoredData(sourcePath: string, targetPath: string): void {
  mkdirSync(targetPath, { recursive: true });

  storedDataEntries.forEach((entry) => {
    const sourceEntryPath = path.join(sourcePath, entry);

    if (existsSync(sourceEntryPath)) {
      cpSync(sourceEntryPath, path.join(targetPath, entry), {
        recursive: true,
        force: true,
        preserveTimestamps: true,
      });
    }
  });
}

function removeStoredData(directoryPath: string): void {
  storedDataEntries.forEach((entry) => {
    rmSync(path.join(directoryPath, entry), { recursive: true, force: true });
  });
}

function backupStoredData(
  appDataPath: string,
  sourcePath: string,
): string | null {
  if (!hasStoredData(sourcePath)) {
    return null;
  }

  const backupRootPath = path.join(appDataPath, migrationBackupDirectoryName);
  mkdirSync(backupRootPath, { recursive: true });
  const backupPath = mkdtempSync(
    path.join(backupRootPath, `${persistentUserDataDirectoryName}-`),
  );
  copyStoredData(sourcePath, backupPath);
  return backupPath;
}

export function preparePersistentUserDataPath(appDataPath: string): string {
  const persistentUserDataPath = path.join(
    appDataPath,
    persistentUserDataDirectoryName,
  );
  const alternateUserDataPath = path.join(
    appDataPath,
    alternateUserDataDirectoryName,
  );

  const persistentDataModificationTime = getLatestStoredDataModificationTime(
    persistentUserDataPath,
  );
  const alternateDataModificationTime = getLatestStoredDataModificationTime(
    alternateUserDataPath,
  );

  if (
    alternateDataModificationTime === null ||
    (persistentDataModificationTime !== null &&
      persistentDataModificationTime >= alternateDataModificationTime)
  ) {
    return persistentUserDataPath;
  }

  const backupPath = backupStoredData(appDataPath, persistentUserDataPath);

  try {
    removeStoredData(persistentUserDataPath);
    copyStoredData(alternateUserDataPath, persistentUserDataPath);
  } catch (error) {
    removeStoredData(persistentUserDataPath);

    if (backupPath) {
      copyStoredData(backupPath, persistentUserDataPath);
    }

    throw error;
  }

  return persistentUserDataPath;
}
