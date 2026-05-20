import { DrivePermissionState } from '@/shared/drive/permissions';
import {
  createDriveBackupFileName,
  DriveBackupKind,
  DriveBackupFile,
  DriveBackupFileSchema,
  getDriveBackupFolderName,
  getDriveBackupFileNamePrefix,
  GOOGLE_DRIVE_BACKUP_RECOVERY_KEY_FILE_NAME,
  GOOGLE_DRIVE_RECOVERY_FOLDER_NAME,
  GOOGLE_DRIVE_APP_FOLDER_NAME,
} from '@/shared/drive/backups';
import { createDriveActionErrorMessage } from '@/shared/drive/errors';
import { GoogleOAuthService } from '@/main/services/GoogleOAuthService';

type GoogleDriveServiceOptions = {
  oauthService: GoogleOAuthService;
  appFolderName?: string;
};

type AuthorizedDriveConnection = {
  accessToken: string;
  grantedScopes: string[];
};

async function throwDriveApiError(response: Response, fallback: string) {
  const details = await response.text().catch(() => '');
  const normalizedDetails = details.toLowerCase();

  if (
    response.status === 507 ||
    normalizedDetails.includes('storagequotaexceeded') ||
    normalizedDetails.includes('storage quota') ||
    normalizedDetails.includes('quota exceeded')
  ) {
    throw new Error(
      createDriveActionErrorMessage({
        kind: 'storage-quota',
        fallback,
      }),
    );
  }

  if (
    response.status === 401 ||
    response.status === 403 ||
    normalizedDetails.includes('insufficientpermissions') ||
    normalizedDetails.includes('insufficientfilepermissions') ||
    normalizedDetails.includes('insufficient permission') ||
    normalizedDetails.includes('autherror')
  ) {
    throw new Error(
      createDriveActionErrorMessage({
        kind: 'permissions',
        fallback,
      }),
    );
  }

  throw new Error(`${fallback}: ${response.status}`);
}

async function findDriveFolder(input: {
  accessToken: string;
  name: string;
  parentId?: string;
}): Promise<string | null> {
  const escapedName = input.name
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
  const queryParts = [
    `name = '${escapedName}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
  ];

  if (input.parentId) {
    queryParts.push(`'${input.parentId}' in parents`);
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');

  url.searchParams.set(
    'fields',
    'files(id,name,mimeType,createdTime,modifiedTime,size)',
  );
  url.searchParams.set('pageSize', '1');
  url.searchParams.set('orderBy', 'createdTime desc');
  url.searchParams.set('q', queryParts.join(' and '));
  const lookupResponse = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  });

  if (!lookupResponse.ok) {
    await throwDriveApiError(
      lookupResponse,
      'Google Drive Ordnersuche fehlgeschlagen',
    );
  }

  const lookupPayload = (await lookupResponse.json()) as {
    files?: Array<{ id?: string }>;
  };

  return lookupPayload.files?.[0]?.id ?? null;
}

async function createDriveFolder(input: {
  accessToken: string;
  name: string;
  parentId?: string;
}): Promise<string> {
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        name: input.name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(input.parentId ? { parents: [input.parentId] } : {}),
      }),
    },
  );

  if (!createResponse.ok) {
    await throwDriveApiError(
      createResponse,
      'Google Drive Ordnererstellung fehlgeschlagen',
    );
  }

  const payload = (await createResponse.json()) as { id?: string };

  if (!payload.id) {
    throw new Error('Google Drive Ordnererstellung lieferte keine ID.');
  }

  return payload.id;
}

async function ensureDriveFolder(input: {
  accessToken: string;
  name: string;
  parentId?: string;
}): Promise<string> {
  const existingFolderId = await findDriveFolder(input);

  if (existingFolderId) {
    return existingFolderId;
  }

  return createDriveFolder(input);
}

async function findDriveFile(input: {
  accessToken: string;
  name: string;
  parentId: string;
}): Promise<DriveBackupFile | null> {
  const escapedName = input.name
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
  const url = new URL('https://www.googleapis.com/drive/v3/files');

  url.searchParams.set(
    'fields',
    'files(id,name,mimeType,createdTime,modifiedTime,size)',
  );
  url.searchParams.set('pageSize', '1');
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set(
    'q',
    [
      `name = '${escapedName}'`,
      `'${input.parentId}' in parents`,
      "mimeType = 'application/json'",
      'trashed = false',
    ].join(' and '),
  );

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  });

  if (!response.ok) {
    await throwDriveApiError(
      response,
      'Google Drive Dateisuche fehlgeschlagen',
    );
  }

  const payload = (await response.json()) as { files?: unknown[] };
  const file = payload.files?.[0];

  return file ? DriveBackupFileSchema.parse(file) : null;
}

async function writeDriveJsonFile(input: {
  accessToken: string;
  name: string;
  parentId: string;
  serialized: string;
  fileId?: string;
}): Promise<DriveBackupFile> {
  const boundary = `apprep-${Date.now()}`;
  const metadata = input.fileId
    ? {
        name: input.name,
        mimeType: 'application/json',
      }
    : {
        name: input.name,
        mimeType: 'application/json',
        parents: [input.parentId],
      };
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${input.serialized}\r\n` +
    `--${boundary}--`;
  const url = input.fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
        input.fileId,
      )}?uploadType=multipart&fields=id,name,mimeType,createdTime,modifiedTime,size`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,modifiedTime,size';
  const response = await fetch(url, {
    method: input.fileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    await throwDriveApiError(response, 'Google Drive Upload fehlgeschlagen');
  }

  return DriveBackupFileSchema.parse(await response.json());
}

export class GoogleDriveService {
  private readonly oauthService: GoogleOAuthService;

  private readonly appFolderName: string;

  constructor(options: GoogleDriveServiceOptions) {
    this.oauthService = options.oauthService;
    this.appFolderName = options.appFolderName ?? GOOGLE_DRIVE_APP_FOLDER_NAME;
  }

  async authorizeConnection(
    permissionState: DrivePermissionState,
  ): Promise<AuthorizedDriveConnection> {
    if (permissionState.refreshToken) {
      const refreshed = await this.oauthService.refreshAccessToken(
        permissionState.refreshToken,
        permissionState.grantedScopes,
      );

      return {
        accessToken: refreshed.accessToken,
        grantedScopes: refreshed.grantedScopes.length
          ? refreshed.grantedScopes
          : permissionState.grantedScopes,
      };
    }

    if (permissionState.accessToken) {
      return {
        accessToken: permissionState.accessToken,
        grantedScopes: permissionState.grantedScopes,
      };
    }

    throw new Error('Google Drive ist nicht verbunden.');
  }

  async uploadBackup(input: {
    permissionState: DrivePermissionState;
    exportedAt: string;
    serializedBackup: string;
    kind?: DriveBackupKind;
    encrypted?: boolean;
  }): Promise<{
    file: DriveBackupFile;
    accessToken: string;
    grantedScopes: string[];
  }> {
    const connection = await this.authorizeConnection(input.permissionState);
    const kind = input.kind ?? 'reports';
    const folderId = await this.ensureBackupFolder(
      connection.accessToken,
      kind,
    );
    const fileName = createDriveBackupFileName(
      input.exportedAt,
      kind,
      input.encrypted ?? false,
    );
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [folderId],
    };
    const boundary = `apprep-${Date.now()}`;
    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      `${input.serializedBackup}\r\n` +
      `--${boundary}--`;
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,modifiedTime,size',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    if (!response.ok) {
      await throwDriveApiError(response, 'Google Drive Upload fehlgeschlagen');
    }

    return {
      file: DriveBackupFileSchema.parse(await response.json()),
      accessToken: connection.accessToken,
      grantedScopes: connection.grantedScopes,
    };
  }

  async listBackups(
    permissionState: DrivePermissionState,
    kind: DriveBackupKind = 'reports',
  ): Promise<{
    files: DriveBackupFile[];
    accessToken: string;
    grantedScopes: string[];
  }> {
    const connection = await this.authorizeConnection(permissionState);
    const folderId = await this.ensureBackupFolder(
      connection.accessToken,
      kind,
    );
    const fileNamePrefix = getDriveBackupFileNamePrefix(kind);
    const escapedFileNamePrefix = fileNamePrefix
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
    const query = [
      `'${folderId}' in parents`,
      'trashed = false',
      "mimeType = 'application/json'",
      `name contains '${escapedFileNamePrefix}'`,
    ].join(' and ');
    const url = new URL('https://www.googleapis.com/drive/v3/files');

    url.searchParams.set(
      'fields',
      'files(id,name,mimeType,createdTime,modifiedTime,size)',
    );
    url.searchParams.set('orderBy', 'modifiedTime desc');
    url.searchParams.set('q', query);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
      },
    });

    if (!response.ok) {
      await throwDriveApiError(
        response,
        'Google Drive Backup-Liste fehlgeschlagen',
      );
    }

    const payload = (await response.json()) as { files?: unknown[] };

    return {
      files: (payload.files ?? []).map((file) =>
        DriveBackupFileSchema.parse(file),
      ),
      accessToken: connection.accessToken,
      grantedScopes: connection.grantedScopes,
    };
  }

  async downloadBackup(input: {
    permissionState: DrivePermissionState;
    fileId: string;
  }): Promise<{
    serializedBackup: string;
    accessToken: string;
    grantedScopes: string[];
  }> {
    const connection = await this.authorizeConnection(input.permissionState);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      await throwDriveApiError(
        response,
        'Google Drive Backup-Download fehlgeschlagen',
      );
    }

    return {
      serializedBackup: await response.text(),
      accessToken: connection.accessToken,
      grantedScopes: connection.grantedScopes,
    };
  }

  async ensureBackupRecoveryKey(input: {
    permissionState: DrivePermissionState;
    serializedKey: string;
  }): Promise<{
    file: DriveBackupFile;
    accessToken: string;
    grantedScopes: string[];
  }> {
    const connection = await this.authorizeConnection(input.permissionState);
    const appFolderId = await ensureDriveFolder({
      accessToken: connection.accessToken,
      name: this.appFolderName,
    });
    const recoveryFolderId = await ensureDriveFolder({
      accessToken: connection.accessToken,
      name: GOOGLE_DRIVE_RECOVERY_FOLDER_NAME,
      parentId: appFolderId,
    });
    const existingFile = await findDriveFile({
      accessToken: connection.accessToken,
      name: GOOGLE_DRIVE_BACKUP_RECOVERY_KEY_FILE_NAME,
      parentId: recoveryFolderId,
    });
    const file = await writeDriveJsonFile({
      accessToken: connection.accessToken,
      name: GOOGLE_DRIVE_BACKUP_RECOVERY_KEY_FILE_NAME,
      parentId: recoveryFolderId,
      fileId: existingFile?.id,
      serialized: input.serializedKey,
    });

    return {
      file,
      accessToken: connection.accessToken,
      grantedScopes: connection.grantedScopes,
    };
  }

  async downloadBackupRecoveryKey(input: {
    permissionState: DrivePermissionState;
    fileId: string;
  }): Promise<{
    serializedKey: string;
    accessToken: string;
    grantedScopes: string[];
  }> {
    const result = await this.downloadBackup({
      permissionState: input.permissionState,
      fileId: input.fileId,
    });

    return {
      serializedKey: result.serializedBackup,
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    };
  }

  private async ensureBackupFolder(
    accessToken: string,
    kind: DriveBackupKind,
  ): Promise<string> {
    const appFolderId = await ensureDriveFolder({
      accessToken,
      name: this.appFolderName,
    });

    return ensureDriveFolder({
      accessToken,
      name: getDriveBackupFolderName(kind),
      parentId: appFolderId,
    });
  }
}

export default GoogleDriveService;
