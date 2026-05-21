import { Dispatch, ReactNode, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';

import EditableCollectionList from '@/renderer/components/app/EditableCollectionList';
import { FormField } from '@/renderer/components/app/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { ManualAbsence, ManualAbsenceType } from '@/shared/absence/settings';

export type ManualAbsenceFormState = {
  id: string | null;
  type: ManualAbsenceType;
  startDate: string;
  endDate: string;
  label: string;
  note: string;
};

export const defaultManualAbsenceFormState: ManualAbsenceFormState = {
  id: null,
  type: 'sick',
  startDate: '',
  endDate: '',
  label: '',
  note: '',
};

type EditableAbsenceCollectionProps<T> = {
  type: ManualAbsenceType;
  title: ReactNode;
  titleLabel: string;
  items: T[];
  form: ManualAbsenceFormState;
  isPending: boolean;
  emptyText: string;
  getKey: (item: T) => string;
  getEditableEntry: (item: T) => ManualAbsence | null;
  renderItem: (item: T) => ReactNode;
  getEntryDisabledReason: (entry: ManualAbsence) => string | null;
  getFormDisabledReason: (form: ManualAbsenceFormState) => string | null;
  minDate: string | null;
  setForm: Dispatch<SetStateAction<ManualAbsenceFormState>>;
  onSubmit: (form: ManualAbsenceFormState) => Promise<boolean>;
  onEdit: (entry: ManualAbsence) => void;
  onDelete: (entry: ManualAbsence) => Promise<void>;
};

export default function EditableAbsenceCollection<T>({
  type,
  title,
  titleLabel,
  items,
  form,
  isPending,
  emptyText,
  getKey,
  getEditableEntry,
  renderItem,
  getEntryDisabledReason,
  getFormDisabledReason,
  minDate,
  setForm,
  onSubmit,
  onEdit,
  onDelete,
}: EditableAbsenceCollectionProps<T>) {
  const { t } = useTranslation();
  const [pendingDeleteEntry, setPendingDeleteEntry] =
    useState<ManualAbsence | null>(null);
  const requiresCustomLabel =
    type === 'public-holiday' || type === 'school-holiday';

  const activeForm =
    form.type === type
      ? form
      : {
          ...defaultManualAbsenceFormState,
          type,
        };
  const isEditing = Boolean(activeForm.id);
  const formDisabledReason = getFormDisabledReason?.(activeForm) ?? null;
  const submitDisabledReason = isPending
    ? t('common.disabledReasons.pending')
    : formDisabledReason;
  const canCopyStartDateToEndDate =
    Boolean(activeForm.startDate) && !activeForm.endDate;
  const canCopyEndDateToStartDate =
    Boolean(activeForm.endDate) && !activeForm.startDate;
  const copyDateTooltip = canCopyStartDateToEndDate
    ? t('absences.manual.copyStartDateToEndDate')
    : t('absences.manual.copyEndDateToStartDate');

  function updateFormField(
    key: keyof Omit<ManualAbsenceFormState, 'id' | 'type'>,
    value: string,
  ) {
    setForm((current) => {
      const nextForm =
        current.type === type
          ? current
          : {
              ...defaultManualAbsenceFormState,
              type,
            };

      return {
        ...nextForm,
        [key]: value,
      };
    });
  }

  return (
    <>
      <EditableCollectionList
        addSlot={
          <div className="space-y-3">
            <div
              className={`grid gap-2 ${
                requiresCustomLabel
                  ? 'xl:grid-cols-[11rem_auto_11rem_minmax(0,1fr)_auto]'
                  : 'xl:grid-cols-[11rem_auto_11rem_auto]'
              }`}
            >
              <FormField
                id={`${type}-start-date`}
                label={t('absences.manual.startDate')}
              >
                <Input
                  id={`${type}-start-date`}
                  type="date"
                  value={activeForm.startDate}
                  min={minDate ?? undefined}
                  onChange={(event) => {
                    updateFormField('startDate', event.target.value);
                  }}
                />
              </FormField>
              <div className="flex items-end justify-center">
                {canCopyStartDateToEndDate || canCopyEndDateToStartDate ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 border-primary-tint"
                        aria-label={copyDateTooltip}
                        onClick={() => {
                          if (canCopyStartDateToEndDate) {
                            updateFormField('endDate', activeForm.startDate);
                            return;
                          }

                          updateFormField('startDate', activeForm.endDate);
                        }}
                      >
                        {canCopyStartDateToEndDate ? (
                          <ArrowRight className="size-4" />
                        ) : (
                          <ArrowLeft className="size-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{copyDateTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="h-10 w-10" aria-hidden="true" />
                )}
              </div>
              <FormField
                id={`${type}-end-date`}
                label={t('absences.manual.endDate')}
              >
                <Input
                  id={`${type}-end-date`}
                  type="date"
                  value={activeForm.endDate}
                  min={minDate ?? undefined}
                  onChange={(event) => {
                    updateFormField('endDate', event.target.value);
                  }}
                />
              </FormField>
              {requiresCustomLabel ? (
                <FormField
                  id={`${type}-label`}
                  label={t('absences.manual.label')}
                >
                  <Input
                    id={`${type}-label`}
                    value={activeForm.label}
                    onChange={(event) => {
                      updateFormField('label', event.target.value);
                    }}
                  />
                </FormField>
              ) : null}
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  disabled={Boolean(submitDisabledReason)}
                  disabledReason={submitDisabledReason ?? undefined}
                  variant={isEditing ? 'default' : 'outline'}
                  className={
                    isEditing
                      ? 'bg-primary text-primary-contrast hover:bg-primary-shade'
                      : 'border-primary-tint'
                  }
                  onClick={() => {
                    onSubmit(activeForm).catch(() => undefined);
                  }}
                >
                  {!isEditing ? <Plus className="size-4" /> : null}
                  {isEditing ? t('absences.manual.update') : t('common.add')}
                </Button>
                {isEditing ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-primary-tint"
                    onClick={() => {
                      setForm(defaultManualAbsenceFormState);
                    }}
                  >
                    {t('absences.manual.cancelEdit')}
                  </Button>
                ) : null}
              </div>
            </div>
            <FormField id={`${type}-note`} label={t('absences.manual.note')}>
              <Textarea
                id={`${type}-note`}
                value={activeForm.note}
                onChange={(event) => {
                  updateFormField('note', event.target.value);
                }}
              />
            </FormField>
          </div>
        }
        items={items}
        emptyText={emptyText}
        getKey={getKey}
        renderItem={renderItem}
        renderActions={(item) => {
          const editableEntry = getEditableEntry(item);

          if (!editableEntry) {
            return null;
          }

          const entryDisabledReason =
            getEntryDisabledReason?.(editableEntry) ?? null;

          return (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={Boolean(entryDisabledReason)}
                disabledReason={entryDisabledReason ?? undefined}
                aria-label={t('absences.manual.editEntry', {
                  type: titleLabel,
                })}
                title={t('absences.manual.editEntry', {
                  type: titleLabel,
                })}
                onClick={() => {
                  onEdit(editableEntry);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={Boolean(entryDisabledReason)}
                disabledReason={entryDisabledReason ?? undefined}
                aria-label={t('absences.manual.deleteEntry', {
                  type: titleLabel,
                })}
                title={t('absences.manual.deleteEntry', {
                  type: titleLabel,
                })}
                onClick={() => {
                  setPendingDeleteEntry(editableEntry);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          );
        }}
        listClassName="max-h-72 overflow-auto pr-1"
        itemClassName="items-start"
      />
      <AlertDialog
        open={Boolean(pendingDeleteEntry)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteEntry(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('absences.confirmDelete.title', {
                type: titleLabel,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteEntry
                ? t('absences.confirmDelete.description', {
                    type: titleLabel,
                    value: pendingDeleteEntry.label || titleLabel,
                  })
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('absences.confirmDelete.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={(event) => {
                event.preventDefault();

                if (!pendingDeleteEntry) {
                  return;
                }

                onDelete(pendingDeleteEntry).catch(() => undefined);
                setPendingDeleteEntry(null);
              }}
            >
              {t('absences.confirmDelete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
