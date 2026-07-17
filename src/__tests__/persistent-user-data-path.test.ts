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

  it('keeps using newer data from the 0.0.34 directory', async () => {
    const persistentDataPath = path.join(appDataPath, 'Apprenticeship Reports');
    const alternateDataPath = path.join(appDataPath, 'apprenticeship-reports');
    await fs.mkdir(persistentDataPath, { recursive: true });
    await fs.mkdir(alternateDataPath, { recursive: true });
    const persistentDatabasePath = path.join(
      persistentDataPath,
      'app-metadata.sqlite',
    );
    const alternateDatabasePath = path.join(
      alternateDataPath,
      'app-metadata.sqlite',
    );
    await fs.writeFile(persistentDatabasePath, '0.0.34 reports');
    await fs.writeFile(alternateDatabasePath, 'older reports');
    await fs.utimes(alternateDatabasePath, new Date(1_000), new Date(1_000));
    await fs.utimes(persistentDatabasePath, new Date(2_000), new Date(2_000));

    expect(preparePersistentUserDataPath(appDataPath)).toBe(persistentDataPath);
    await expect(fs.readFile(persistentDatabasePath, 'utf-8')).resolves.toBe(
      '0.0.34 reports',
    );
  });

  it('copies existing report data into the 0.0.34 directory', async () => {
    const persistentDataPath = path.join(appDataPath, 'Apprenticeship Reports');
    const alternateDataPath = path.join(appDataPath, 'apprenticeship-reports');
    await fs.mkdir(alternateDataPath, { recursive: true });
    await fs.writeFile(
      path.join(alternateDataPath, 'app-metadata.sqlite'),
      'alternate reports',
    );
    await fs.writeFile(
      path.join(alternateDataPath, 'app-metadata.auth.json'),
      'alternate credentials',
    );
    await fs.mkdir(path.join(alternateDataPath, 'backups'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(alternateDataPath, 'backups', 'app.db'),
      'legacy backup',
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
    await expect(
      fs.readFile(path.join(persistentDataPath, 'backups', 'app.db'), 'utf-8'),
    ).resolves.toBe('legacy backup');
  });

  it('backs up older 0.0.34 data before copying a newer data store', async () => {
    const persistentDataPath = path.join(appDataPath, 'Apprenticeship Reports');
    const alternateDataPath = path.join(appDataPath, 'apprenticeship-reports');
    const persistentDatabasePath = path.join(
      persistentDataPath,
      'app-metadata.sqlite',
    );
    const alternateDatabasePath = path.join(
      alternateDataPath,
      'app-metadata.sqlite',
    );
    await fs.mkdir(persistentDataPath, { recursive: true });
    await fs.mkdir(alternateDataPath, { recursive: true });
    await fs.writeFile(persistentDatabasePath, 'older 0.0.34 reports');
    await fs.writeFile(alternateDatabasePath, 'newer reports');
    await fs.utimes(persistentDatabasePath, new Date(1_000), new Date(1_000));
    await fs.utimes(alternateDatabasePath, new Date(2_000), new Date(2_000));

    expect(preparePersistentUserDataPath(appDataPath)).toBe(persistentDataPath);
    await expect(fs.readFile(persistentDatabasePath, 'utf-8')).resolves.toBe(
      'newer reports',
    );
    await expect(fs.readFile(alternateDatabasePath, 'utf-8')).resolves.toBe(
      'newer reports',
    );

    const backupRootPath = path.join(appDataPath, 'AppRep Data Backups');
    const backupDirectories = await fs.readdir(backupRootPath);
    expect(backupDirectories).toHaveLength(1);
    await expect(
      fs.readFile(
        path.join(backupRootPath, backupDirectories[0], 'app-metadata.sqlite'),
        'utf-8',
      ),
    ).resolves.toBe('older 0.0.34 reports');
  });
});
