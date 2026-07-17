import { cpSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const persistentUserDataDirectoryName = 'apprenticeship-reports';
const alternateUserDataDirectoryName = 'Apprenticeship Reports';

const storedDataEntries = [
  'app-metadata.sqlite',
  'app-metadata.sqlite-shm',
  'app-metadata.sqlite-wal',
  'app-metadata.auth.json',
  'app-metadata.json',
  'data',
  'auth',
  'recovery',
];

function hasStoredData(directoryPath: string): boolean {
  return storedDataEntries.some((entry) =>
    existsSync(path.join(directoryPath, entry)),
  );
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

  if (
    hasStoredData(persistentUserDataPath) ||
    !hasStoredData(alternateUserDataPath)
  ) {
    return persistentUserDataPath;
  }

  mkdirSync(persistentUserDataPath, { recursive: true });

  storedDataEntries.forEach((entry) => {
    const sourcePath = path.join(alternateUserDataPath, entry);

    if (existsSync(sourcePath)) {
      cpSync(sourcePath, path.join(persistentUserDataPath, entry), {
        recursive: true,
        force: false,
        errorOnExist: false,
        preserveTimestamps: true,
      });
    }
  });

  return persistentUserDataPath;
}
