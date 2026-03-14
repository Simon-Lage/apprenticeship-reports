import { z } from 'zod';

export const GOOGLE_PROFILE_SCOPES = ['openid', 'email', 'profile'] as const;

export const GOOGLE_DRIVE_APP_FOLDER_NAME = 'AppRep';

export const DriveBackupFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().min(1),
  createdAt: z.string().datetime().nullable(),
  modifiedAt: z.string().datetime().nullable(),
  size: z.string().nullable(),
});

export type DriveBackupFile = z.infer<typeof DriveBackupFileSchema>;

export function createDriveBackupFileName(exportedAt: string): string {
  const normalizedTimestamp = exportedAt.replace(/[:.]/g, '-');
  return `apprep-backup-${normalizedTimestamp}.json`;
}
