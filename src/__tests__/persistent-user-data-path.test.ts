import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { preparePersistentUserDataPath } from '@/main/persistent-user-data-path';

describe('preparePersistentUserDataPath', () => {
  let appDataPath: string;

  beforeEach(async () => {
    appDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apprep-data-'));
  });

  afterEach(async () => {
    await fs.rm(appDataPath, { recursive: true, force: true });
  });

  it('always uses the 0.0.34 directory without migrating other folders', async () => {
    const previousDataPath = path.join(appDataPath, 'apprenticeship-reports');
    const persistentDataPath = path.join(appDataPath, 'Apprenticeship Reports');
    await fs.mkdir(previousDataPath, { recursive: true });
    await fs.writeFile(
      path.join(previousDataPath, 'app-metadata.sqlite'),
      'previous reports',
    );

    expect(preparePersistentUserDataPath(appDataPath)).toBe(persistentDataPath);
    expect(existsSync(persistentDataPath)).toBe(false);
    await expect(
      fs.readFile(path.join(previousDataPath, 'app-metadata.sqlite'), 'utf-8'),
    ).resolves.toBe('previous reports');
  });
});
