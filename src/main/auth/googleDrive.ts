const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_BACKUP_APP = 'apprenticeship-reports';
const DRIVE_BACKUP_KIND = 'encrypted-db-backup';

type DriveFile = {
  id: string;
  modifiedTime: string;
  name: string;
};

const buildAuthHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

const buildError = async (response: Response, prefix: string) => {
  const text = await response.text();
  throw new Error(`${prefix}:${response.status}:${text}`);
};

export const uploadEncryptedBackupToDrive = async (
  accessToken: string,
  fileName: string,
  bytes: Buffer,
) => {
  const boundary = `backup-boundary-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const metadata = {
    name: fileName,
    appProperties: {
      app: DRIVE_BACKUP_APP,
      kind: DRIVE_BACKUP_KIND,
    },
  };
  const metadataPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    'utf-8',
  );
  const fileHeaderPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
    'utf-8',
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  const body = Buffer.concat([metadataPart, fileHeaderPart, bytes, footer]);
  const response = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,modifiedTime`,
    {
      method: 'POST',
      headers: {
        ...buildAuthHeaders(accessToken),
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!response.ok) {
    await buildError(response, 'drive_upload_failed');
  }
  const data = (await response.json()) as {
    id?: string;
    name?: string;
    modifiedTime?: string;
  };
  if (!data.id || !data.name || !data.modifiedTime) {
    throw new Error('drive_upload_invalid_response');
  }
  return {
    id: data.id,
    name: data.name,
    modifiedTime: data.modifiedTime,
  };
};

export const listEncryptedBackupsFromDrive = async (
  accessToken: string,
): Promise<DriveFile[]> => {
  const query = encodeURIComponent(
    "trashed = false and appProperties has { key='app' and value='apprenticeship-reports' } and appProperties has { key='kind' and value='encrypted-db-backup' }",
  );
  const response = await fetch(
    `${DRIVE_API_BASE}/files?q=${query}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)&pageSize=20`,
    {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    },
  );
  if (!response.ok) {
    await buildError(response, 'drive_list_failed');
  }
  const data = (await response.json()) as {
    files?: Array<{ id?: string; name?: string; modifiedTime?: string }>;
  };
  return (data.files ?? [])
    .filter((file) => !!file.id && !!file.name && !!file.modifiedTime)
    .map((file) => ({
      id: file.id as string,
      name: file.name as string,
      modifiedTime: file.modifiedTime as string,
    }));
};

export const downloadBackupFromDrive = async (
  accessToken: string,
  fileId: string,
) => {
  const response = await fetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    },
  );
  if (!response.ok) {
    await buildError(response, 'drive_download_failed');
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
