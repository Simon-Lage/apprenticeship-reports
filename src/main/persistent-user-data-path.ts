import path from 'path';

const persistentUserDataDirectoryName = 'Apprenticeship Reports';

export function preparePersistentUserDataPath(appDataPath: string): string {
  return path.join(appDataPath, persistentUserDataDirectoryName);
}
