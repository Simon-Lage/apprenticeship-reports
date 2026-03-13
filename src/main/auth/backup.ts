import { BackupService } from '../logic/services/backupService';

const backupService = new BackupService();

export const exportLocalEncrypted = async () => {
  const result = await backupService.exportLocalEncrypted();
  if (!result.data.ok) {
    return {
      implemented: result.implemented,
      provider: 'local',
      touchedAt: result.touchedAt,
      ok: false,
      error: result.data.error.message,
    };
  }
  return {
    implemented: result.implemented,
    provider: 'local',
    touchedAt: result.touchedAt,
    ok: true,
  };
};

export const exportGoogleDriveEncrypted = async () => {
  const result = await backupService.exportGoogleDriveEncrypted();
  if (!result.data.ok) {
    return {
      implemented: result.implemented,
      provider: 'google-drive',
      touchedAt: result.touchedAt,
      ok: false,
      error: result.data.error.message,
    };
  }
  return {
    implemented: result.implemented,
    provider: 'google-drive',
    touchedAt: result.touchedAt,
    ok: true,
  };
};

export const importEncryptedBackup = async () => {
  const result = await backupService.importEncryptedBackup();
  if (!result.data.ok) {
    return {
      implemented: result.implemented,
      provider: 'import',
      touchedAt: result.touchedAt,
      ok: false,
      error: result.data.error.message,
    };
  }
  return {
    implemented: result.implemented,
    provider: 'import',
    touchedAt: result.touchedAt,
    ok: true,
  };
};
