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

type UnsavedChangesDialogProps = {
  open: boolean;
  isPending: boolean;
  saveLabelKey?: string;
  discardLabelKey?: string;
  cancelLabelKey?: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export default function UnsavedChangesDialog({
  open,
  isPending,
  saveLabelKey = 'common.unsavedChanges.save',
  discardLabelKey = 'common.unsavedChanges.discard',
  cancelLabelKey = 'common.unsavedChanges.cancel',
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('common.unsavedChanges.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('common.unsavedChanges.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onCancel}>
            {t(cancelLabelKey)}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className="bg-primary-tint text-primary-contrast hover:bg-primary-tint/80"
            onClick={(event) => {
              event.preventDefault();
              onDiscard();
            }}
          >
            {t(discardLabelKey)}
          </AlertDialogAction>
          <AlertDialogAction
            disabled={isPending}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            {isPending ? t('common.loading') : t(saveLabelKey)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


