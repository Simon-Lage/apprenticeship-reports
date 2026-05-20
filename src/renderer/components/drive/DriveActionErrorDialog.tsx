import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DriveActionErrorDialogKind } from '@/renderer/hooks/useDriveActionErrorHandler';

type DriveActionErrorDialogProps = {
  kind: DriveActionErrorDialogKind | null;
  onClose: () => void;
};

const googleDriveStorageUrl = 'https://drive.google.com/settings/storage';

export default function DriveActionErrorDialog({
  kind,
  onClose,
}: DriveActionErrorDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog
      open={Boolean(kind)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('driveActionErrors.storageQuota.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('driveActionErrors.storageQuota.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            asChild
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
          >
            <a
              href={googleDriveStorageUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
            >
              {t('driveActionErrors.storageQuota.action')}
            </a>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
