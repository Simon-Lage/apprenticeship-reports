import { z } from 'zod';

export const GOOGLE_PROFILE_SCOPES = ['openid', 'email', 'profile'] as const;

export const GOOGLE_DRIVE_APP_FOLDER_NAME = 'AppRep';
export const GOOGLE_DRIVE_RECOVERY_FOLDER_NAME = 'Recovery';
export const GOOGLE_DRIVE_BACKUP_RECOVERY_KEY_FILE_NAME =
  'apprep-backup-recovery-key.json';

export const DriveBackupKindSchema = z.enum(['reports', 'settings']);

export type DriveBackupKind = z.infer<typeof DriveBackupKindSchema>;

export const DriveBackupFolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
});

export type DriveBackupFolder = z.infer<typeof DriveBackupFolderSchema>;

export function getDriveBackupFolderName(kind: DriveBackupKind): string {
  return kind === 'settings' ? 'Settings' : 'Entries';
}

export function createDriveBackupPath(
  fileName: string,
  kind: DriveBackupKind = 'reports',
): string {
  return `/${GOOGLE_DRIVE_APP_FOLDER_NAME}/${getDriveBackupFolderName(kind)}/${fileName}`;
}

export function createDriveBackupFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

export function createDriveBackupRecoveryKeyPath(): string {
  return `/${GOOGLE_DRIVE_APP_FOLDER_NAME}/${GOOGLE_DRIVE_RECOVERY_FOLDER_NAME}/${GOOGLE_DRIVE_BACKUP_RECOVERY_KEY_FILE_NAME}`;
}

export const DriveBackupFileSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return value;
    }

    const record = value as Record<string, unknown>;

    return {
      ...record,
      createdAt: record.createdAt ?? record.createdTime ?? null,
      modifiedAt: record.modifiedAt ?? record.modifiedTime ?? null,
      size: record.size ?? null,
    };
  },
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    mimeType: z.string().min(1),
    createdAt: z.string().datetime().nullable(),
    modifiedAt: z.string().datetime().nullable(),
    size: z.string().nullable(),
  }),
);

export type DriveBackupFile = z.infer<typeof DriveBackupFileSchema>;

export function getDriveBackupFileNamePrefix(kind: DriveBackupKind): string {
  return kind === 'settings' ? 'apprep-settings-backup' : 'apprep-backup';
}

export function createDriveBackupFileName(
  exportedAt: string,
  kind: DriveBackupKind = 'reports',
  encrypted = false,
): string {
  const normalizedTimestamp = exportedAt.replace(/[:.]/g, '-');
  const encryptedSegment = encrypted ? '-encrypted' : '';

  return `${getDriveBackupFileNamePrefix(kind)}${encryptedSegment}-${normalizedTimestamp}.json`;
}
