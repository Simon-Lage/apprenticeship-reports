import { useTranslation } from 'react-i18next';
import { FiRotateCcw } from 'react-icons/fi';

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

export interface ResetChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function ResetChangesDialog({
  open,
  onOpenChange,
  onConfirm,
}: ResetChangesDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('dailyReport.resetDialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('dailyReport.resetDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t('dailyReport.resetDialog.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            <FiRotateCcw className="size-4" />
            {t('dailyReport.resetDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
