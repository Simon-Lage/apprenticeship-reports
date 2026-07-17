import path from 'path';

import { resolvePersistentUserDataPath } from '@/main/persistent-user-data-path';

describe('resolvePersistentUserDataPath', () => {
  it('keeps using the data directory from all releases before the rename', () => {
    expect(
      resolvePersistentUserDataPath('C:\\Users\\Test\\AppData\\Roaming'),
    ).toBe(
      path.join('C:\\Users\\Test\\AppData\\Roaming', 'Apprenticeship Reports'),
    );
  });
});
