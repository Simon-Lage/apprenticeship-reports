import { useCallback, useState } from 'react';

import { resolveDriveActionErrorKind } from '@/shared/drive/errors';

export type DriveActionErrorDialogKind = 'storage-quota';

export default function useDriveActionErrorHandler(input: {
  onRequestPermissions: () => Promise<void>;
}) {
  const { onRequestPermissions } = input;
  const [dialogKind, setDialogKind] =
    useState<DriveActionErrorDialogKind | null>(null);

  const handleDriveActionError = useCallback(
    async (error: unknown): Promise<boolean> => {
      const kind = resolveDriveActionErrorKind(error);

      if (kind === 'permissions') {
        await onRequestPermissions();
        return true;
      }

      if (kind === 'storage-quota') {
        setDialogKind('storage-quota');
        return true;
      }

      return false;
    },
    [onRequestPermissions],
  );

  const closeDriveActionErrorDialog = useCallback(() => {
    setDialogKind(null);
  }, []);

  return {
    driveActionErrorDialogKind: dialogKind,
    closeDriveActionErrorDialog,
    handleDriveActionError,
  };
}
