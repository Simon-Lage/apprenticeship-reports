import { DrivePermissionState } from '@/shared/drive/permissions';
import {
  createDriveBackupFileName,
  DriveBackupFile,
  DriveBackupFileSchema,
  GOOGLE_DRIVE_APP_FOLDER_NAME,
} from '@/shared/drive/backups';
import { GoogleOAuthService } from '@/main/services/GoogleOAuthService';

type GoogleDriveServiceOptions = {
  oauthService: GoogleOAuthService;
  appFolderName?: string;
};

type AuthorizedDriveConnection = {
  accessToken: string;
  grantedScopes: string[];
};

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
    if (permissionState.accessToken) {
      return {
        accessToken: permissionState.accessToken,
        grantedScopes: permissionState.grantedScopes,
      };
    }

    if (!permissionState.refreshToken) {
      throw new Error('Google Drive ist nicht verbunden.');
    }

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

  async uploadBackup(input: {
    permissionState: DrivePermissionState;
    exportedAt: string;
    serializedBackup: string;
  }): Promise<{
    file: DriveBackupFile;
    accessToken: string;
    grantedScopes: string[];
  }> {
    const connection = await this.authorizeConnection(input.permissionState);
    const folderId = await this.ensureAppFolder(connection.accessToken);
    const fileName = createDriveBackupFileName(input.exportedAt);
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
      throw new Error(`Google Drive Upload fehlgeschlagen: ${response.status}`);
    }

    return {
      file: DriveBackupFileSchema.parse(await response.json()),
      accessToken: connection.accessToken,
      grantedScopes: connection.grantedScopes,
    };
  }

  async listBackups(
    permissionState: DrivePermissionState,
  ): Promise<{
    files: DriveBackupFile[];
    accessToken: string;
    grantedScopes: string[];
  }> {
    const connection = await this.authorizeConnection(permissionState);
    const folderId = await this.ensureAppFolder(connection.accessToken);
    const query = `'${folderId}' in parents and trashed = false and mimeType = 'application/json'`;
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
      throw new Error(
        `Google Drive Backup-Liste fehlgeschlagen: ${response.status}`,
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
      throw new Error(
        `Google Drive Backup-Download fehlgeschlagen: ${response.status}`,
      );
    }

    return {
      serializedBackup: await response.text(),
      accessToken: connection.accessToken,
      grantedScopes: connection.grantedScopes,
    };
  }

  private async ensureAppFolder(accessToken: string): Promise<string> {
    const query = `name = '${this.appFolderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const url = new URL('https://www.googleapis.com/drive/v3/files');

    url.searchParams.set(
      'fields',
      'files(id,name,mimeType,createdTime,modifiedTime,size)',
    );
    url.searchParams.set('pageSize', '1');
    url.searchParams.set('orderBy', 'createdTime desc');
    url.searchParams.set('q', query);
    const lookupResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!lookupResponse.ok) {
      throw new Error(
        `Google Drive Ordnersuche fehlgeschlagen: ${lookupResponse.status}`,
      );
    }

    const lookupPayload = (await lookupResponse.json()) as {
      files?: Array<{ id?: string }>;
    };
    const existingFolderId = lookupPayload.files?.[0]?.id;

    if (existingFolderId) {
      return existingFolderId;
    }

    const createResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files?fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          name: this.appFolderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      },
    );

    if (!createResponse.ok) {
      throw new Error(
        `Google Drive Ordnererstellung fehlgeschlagen: ${createResponse.status}`,
      );
    }

    const payload = (await createResponse.json()) as { id?: string };

    if (!payload.id) {
      throw new Error('Google Drive Ordnererstellung lieferte keine ID.');
    }

    return payload.id;
  }
}
