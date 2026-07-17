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

  it('keeps using the existing apprenticeship-reports data', async () => {
    const persistentDataPath = path.join(appDataPath, 'apprenticeship-reports');
    const alternateDataPath = path.join(appDataPath, 'Apprenticeship Reports');
    await fs.mkdir(persistentDataPath, { recursive: true });
    await fs.mkdir(alternateDataPath, { recursive: true });
    await fs.writeFile(
      path.join(persistentDataPath, 'app-metadata.sqlite'),
      'existing reports',
    );
    await fs.writeFile(
      path.join(alternateDataPath, 'app-metadata.sqlite'),
      'alternate reports',
    );

    expect(preparePersistentUserDataPath(appDataPath)).toBe(persistentDataPath);
    await expect(
      fs.readFile(
        path.join(persistentDataPath, 'app-metadata.sqlite'),
        'utf-8',
      ),
    ).resolves.toBe('existing reports');
  });

  it('copies alternate report data only when the persistent store is empty', async () => {
    const persistentDataPath = path.join(appDataPath, 'apprenticeship-reports');
    const alternateDataPath = path.join(appDataPath, 'Apprenticeship Reports');
    await fs.mkdir(alternateDataPath, { recursive: true });
    await fs.writeFile(
      path.join(alternateDataPath, 'app-metadata.sqlite'),
      'alternate reports',
    );
    await fs.writeFile(
      path.join(alternateDataPath, 'app-metadata.auth.json'),
      'alternate credentials',
    );

    expect(preparePersistentUserDataPath(appDataPath)).toBe(persistentDataPath);
    await expect(
      fs.readFile(
        path.join(persistentDataPath, 'app-metadata.sqlite'),
        'utf-8',
      ),
    ).resolves.toBe('alternate reports');
    expect(
      existsSync(path.join(alternateDataPath, 'app-metadata.sqlite')),
    ).toBe(true);
  });
});
