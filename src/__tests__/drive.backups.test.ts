import {
  createDriveBackupPath,
  getDriveBackupFolderName,
} from '@/shared/drive/backups';
import {
  createDriveActionErrorMessage,
  resolveDriveActionErrorKind,
} from '@/shared/drive/errors';

describe('drive backup helpers', () => {
  it('resolves the Google Drive backup subfolder per backup kind', () => {
    expect(getDriveBackupFolderName('reports')).toBe('Entries');
    expect(getDriveBackupFolderName('settings')).toBe('Settings');
  });

  it('creates display paths below the AppRep folder', () => {
    expect(createDriveBackupPath('reports.json', 'reports')).toBe(
      '/AppRep/Entries/reports.json',
    );
    expect(createDriveBackupPath('settings.json', 'settings')).toBe(
      '/AppRep/Settings/settings.json',
    );
  });

  it('resolves structured Drive action errors', () => {
    expect(
      resolveDriveActionErrorKind(
        new Error(
          createDriveActionErrorMessage({
            kind: 'storage-quota',
            fallback: 'Google Drive Upload fehlgeschlagen',
          }),
        ),
      ),
    ).toBe('storage-quota');
  });
});
