import { useTranslation } from 'react-i18next';
import { Save, Trash2 } from 'lucide-react';

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
  titleKey?: string;
  descriptionKey?: string;
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
  titleKey = 'common.unsavedChanges.title',
  descriptionKey = 'common.unsavedChanges.description',
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
          <AlertDialogTitle>{t(titleKey)}</AlertDialogTitle>
          <AlertDialogDescription>{t(descriptionKey)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            disabledReason={t('common.disabledReasons.pending')}
            onClick={onCancel}
          >
            {t(cancelLabelKey)}
          </AlertDialogCancel>
          <div className="flex items-center gap-2">
            <AlertDialogAction
              disabled={isPending}
              disabledReason={t('common.disabledReasons.pending')}
              className="border border-destructive bg-background text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={(event) => {
                event.preventDefault();
                onDiscard();
              }}
            >
              <Trash2 />
              {t(discardLabelKey)}
            </AlertDialogAction>
            <AlertDialogAction
              disabled={isPending}
              disabledReason={t('common.disabledReasons.pending')}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={(event) => {
                event.preventDefault();
                onSave();
              }}
            >
              <Save />
              {isPending ? t('common.loading') : t(saveLabelKey)}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

UnsavedChangesDialog.defaultProps = {
  titleKey: 'common.unsavedChanges.title',
  descriptionKey: 'common.unsavedChanges.description',
  saveLabelKey: 'common.unsavedChanges.save',
  discardLabelKey: 'common.unsavedChanges.discard',
  cancelLabelKey: 'common.unsavedChanges.cancel',
};
