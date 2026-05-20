export type DriveActionErrorKind = 'permissions' | 'storage-quota';

const driveActionErrorPrefix = 'APPREP_DRIVE_ACTION_ERROR';

export function createDriveActionErrorMessage(input: {
  kind: DriveActionErrorKind;
  fallback: string;
}): string {
  return `${driveActionErrorPrefix}:${input.kind}:${input.fallback}`;
}

export function resolveDriveActionErrorKind(
  error: unknown,
): DriveActionErrorKind | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const { message } = error;
  const normalizedMessage = message.toLowerCase();
  const { 1: kind } = message.split(':');

  if (kind === 'permissions' || kind === 'storage-quota') {
    return kind;
  }

  if (
    normalizedMessage.includes('google-drive-berechtigungen fehlen') ||
    normalizedMessage.includes('google drive ist nicht verbunden')
  ) {
    return 'permissions';
  }

  return null;
}
