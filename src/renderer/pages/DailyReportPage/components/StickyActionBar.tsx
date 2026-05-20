import { useTranslation } from 'react-i18next';
import { FiRotateCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

export interface StickyActionBarProps {
  isEditing: boolean;
  isPending: boolean;
  isDeletePending: boolean;
  isContentReadOnly: boolean;
  isDirty: boolean;
  submitLabel: string;
  cancelDisabledReason: string | undefined;
  deleteDisabledReason: string | undefined;
  submitDisabledReason: string | undefined;
  onCancel: () => void;
  onDelete: () => void;
}

export default function StickyActionBar({
  isEditing,
  isPending,
  isDeletePending,
  isContentReadOnly,
  isDirty,
  submitLabel,
  cancelDisabledReason,
  deleteDisabledReason,
  submitDisabledReason,
  onCancel,
  onDelete,
}: StickyActionBarProps) {
  const { t } = useTranslation();

  return (
    <div className="sticky bottom-0 z-20 rounded-xl border border-primary-tint/75 bg-white/95 p-3 shadow-sm backdrop-blur">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-primary-tint"
            disabled={isPending || isDeletePending || !isDirty}
            disabledReason={cancelDisabledReason}
            onClick={onCancel}
          >
            <FiRotateCcw className="size-4" />
            {t('dailyReport.actions.resetChanges')}
          </Button>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              className="border-primary-tint"
              disabled={isPending || isDeletePending || isContentReadOnly}
              disabledReason={deleteDisabledReason}
              onClick={onDelete}
            >
              <FiTrash2 className="size-4" />
              {t('dailyReport.actions.delete')}
            </Button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="submit"
            disabled={
              isPending || isDeletePending || isContentReadOnly || !isDirty
            }
            disabledReason={submitDisabledReason}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
          >
            <FiSave className="size-4" />
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
