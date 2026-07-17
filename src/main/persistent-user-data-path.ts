import path from 'path';

const persistentUserDataDirectoryName = 'Apprenticeship Reports';

export function resolvePersistentUserDataPath(appDataPath: string): string {
  return path.join(appDataPath, persistentUserDataDirectoryName);
}
