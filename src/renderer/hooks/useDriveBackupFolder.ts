import { useEffect, useState } from 'react';

import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { DriveBackupFolder, DriveBackupKind } from '@/shared/drive/backups';

export default function useDriveBackupFolder(
  kind: DriveBackupKind,
  enabled: boolean,
): DriveBackupFolder | null {
  const runtime = useAppRuntime();
  const [folder, setFolder] = useState<DriveBackupFolder | null>(null);

  useEffect(() => {
    let isCanceled = false;

    if (!enabled || !runtime.api) {
      setFolder(null);
      return () => {
        isCanceled = true;
      };
    }

    runtime.api
      .getDriveBackupFolder({ kind })
      .then((nextFolder) => {
        if (!isCanceled) {
          setFolder(nextFolder);
        }

        return undefined;
      })
      .catch(() => {
        if (!isCanceled) {
          setFolder(null);
        }

        return undefined;
      });

    return () => {
      isCanceled = true;
    };
  }, [enabled, kind, runtime.api]);

  return folder;
}
