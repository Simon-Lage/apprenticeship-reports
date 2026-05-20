import { useTranslation } from 'react-i18next';
import { formatGermanDate } from '@/renderer/lib/date-format';

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

export interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeletePending: boolean;
  date: string;
  onConfirm: () => void;
}

export default function DeleteDialog({
  open,
  onOpenChange,
  isDeletePending,
  date,
  onConfirm,
}: DeleteDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('dailyReport.deleteDialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('dailyReport.deleteDialog.description', {
              date: date ? formatGermanDate(date) : '-',
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeletePending}
            disabledReason={t('common.disabledReasons.deletionPending')}
          >
            {t('common.no')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeletePending}
            disabledReason={t('common.disabledReasons.deletionPending')}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isDeletePending ? t('common.loading') : t('common.yes')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
