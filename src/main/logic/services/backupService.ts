import fs from 'fs/promises';
import path from 'path';
import { getAuthSessionState, getDbService } from '../../auth/runtime';
import { fail, ok } from '../core/operation';
import {
  copyToDriveMirrorBackup,
  copyToLocalBackup,
  getNewestBackupCandidate,
} from '../modules/backup/store';
import { createImplemented, nowIso } from './utils';

export class BackupService {
  async exportLocalEncrypted() {
    try {
      const session = getAuthSessionState();
      if (!session.dek) {
        return createImplemented(
          fail('access_denied', 'not_authenticated'),
        );
      }
      const dbPath = getDbService().getPath();
      await fs.access(dbPath);
      await copyToLocalBackup(dbPath);
      return createImplemented(
        ok({
          provider: 'local' as const,
          exportedAt: nowIso(),
          externalSyncStatus: 'local_only' as const,
        }),
      );
    } catch {
      return createImplemented(
        fail('unexpected', 'backup_export_local_failed'),
      );
    }
  }

  async exportGoogleDriveEncrypted() {
    try {
      const session = getAuthSessionState();
      if (!session.dek) {
        return createImplemented(
          fail('access_denied', 'not_authenticated'),
        );
      }
      const dbPath = getDbService().getPath();
      await fs.access(dbPath);
      await copyToDriveMirrorBackup(dbPath);
      return createImplemented(
        ok({
          provider: 'google-drive' as const,
          exportedAt: nowIso(),
          externalSyncStatus: 'mirrored_local_pending_remote' as const,
        }),
      );
    } catch {
      return createImplemented(
        fail('unexpected', 'backup_export_drive_failed'),
      );
    }
  }

  async importEncryptedBackup() {
    const session = getAuthSessionState();
    if (!session.dek) {
      return createImplemented(
        fail('access_denied', 'not_authenticated'),
      );
    }
    const dbService = getDbService();
    try {
      const newest = await getNewestBackupCandidate();
      if (!newest) {
        return createImplemented(
          fail('not_found', 'backup_not_found'),
        );
      }
      const targetPath = dbService.getPath();
      await dbService.close();
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(newest.filePath, targetPath);
      await dbService.open(session.dek);
      return createImplemented(
        ok({
          importedAt: nowIso(),
          sourceProvider: newest.provider,
        }),
      );
    } catch {
      try {
        await dbService.open(session.dek);
      } catch {}
      return createImplemented(
        fail('unexpected', 'backup_import_failed'),
      );
    }
  }
}
