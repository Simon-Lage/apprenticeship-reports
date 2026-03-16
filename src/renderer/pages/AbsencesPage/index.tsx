import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import UnsavedChangesDialog from '@/renderer/components/app/UnsavedChangesDialog';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import useUnsavedChangesGuard from '@/renderer/hooks/useUnsavedChangesGuard';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createCatalogYearKey,
  ManualAbsence,
  ManualAbsenceType,
  manualAbsenceTypeValues,
  mergeAbsenceSettings,
  parseAbsenceSettings,
  resolveOnboardingSubdivisionCode,
} from '@/shared/absence/settings';

type ManualAbsenceFormState = {
  id: string | null;
  type: ManualAbsenceType;
  startDate: string;
  endDate: string;
  label: string;
  note: string;
};

const defaultManualAbsenceFormState: ManualAbsenceFormState = {
  id: null,
  type: 'sick',
  startDate: '',
  endDate: '',
  label: '',
  note: '',
};

function createManualAbsenceId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `absence-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toManualAbsenceTypeTranslationKey(type: ManualAbsenceType): string {
  if (type === 'public-holiday') {
    return 'absences.manual.types.publicHoliday';
  }

  if (type === 'school-holiday') {
    return 'absences.manual.types.schoolHoliday';
  }

  return `absences.manual.types.${type}`;
}

function serializeManualAbsenceForm(form: ManualAbsenceFormState): string {
  return JSON.stringify({
    id: form.id,
    type: form.type,
    startDate: form.startDate,
    endDate: form.endDate,
    label: form.label,
    note: form.note,
  });
}

export default function AbsencesPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const settingsSnapshot = useSettingsSnapshot();
  const [isPending, setIsPending] = useState(false);
  const [form, setForm] = useState<ManualAbsenceFormState>(
    defaultManualAbsenceFormState,
  );

  const absenceSettings = useMemo(
    () => parseAbsenceSettings(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const subdivisionCode = useMemo(
    () =>
      resolveOnboardingSubdivisionCode(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentCatalog =
    absenceSettings.catalogsByYear[createCatalogYearKey(currentYear)];
  const manualAbsences = useMemo(
    () =>
      [...absenceSettings.manualAbsences].sort((left, right) => {
        const byDate = left.startDate.localeCompare(right.startDate);
        if (byDate !== 0) {
          return byDate;
        }

        return left.id.localeCompare(right.id);
      }),
    [absenceSettings.manualAbsences],
  );
  const baselineForm = useMemo(() => {
    if (!form.id) {
      return defaultManualAbsenceFormState;
    }

    const existing = absenceSettings.manualAbsences.find(
      (entry) => entry.id === form.id,
    );

    if (!existing) {
      return defaultManualAbsenceFormState;
    }

    return {
      id: existing.id,
      type: existing.type,
      startDate: existing.startDate,
      endDate: existing.endDate,
      label: existing.label,
      note: existing.note ?? '',
    };
  }, [absenceSettings.manualAbsences, form.id]);
  const isDirty =
    serializeManualAbsenceForm(form) !==
    serializeManualAbsenceForm(baselineForm);

  async function persistManualAbsences(nextManualAbsences: ManualAbsence[]) {
    if (!runtime.api || !settingsSnapshot.value) {
      return;
    }

    setIsPending(true);

    try {
      const nextValues = mergeAbsenceSettings(settingsSnapshot.value.values, {
        ...absenceSettings,
        manualAbsences: nextManualAbsences,
      });
      await runtime.api.setSettingsValues(nextValues);
      await runtime.refresh();
      await settingsSnapshot.refresh();
      toast.success(t('absences.feedback.saved'));
      setForm(defaultManualAbsenceFormState);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('absences.feedback.saveError'), message);
    } finally {
      setIsPending(false);
    }
  }

  async function submitManualAbsence(): Promise<boolean> {
    if (!runtime.api || !settingsSnapshot.value) {
      return false;
    }

    if (!form.startDate || !form.endDate) {
      toast.error(t('absences.feedback.missingDate'));
      return false;
    }

    if (form.endDate < form.startDate) {
      toast.error(t('absences.feedback.invalidRange'));
      return false;
    }

    const now = new Date().toISOString();
    const existing = form.id
      ? absenceSettings.manualAbsences.find((entry) => entry.id === form.id)
      : null;
    const nextEntry: ManualAbsence = {
      id: form.id ?? createManualAbsenceId(),
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      label: form.label.trim(),
      note: form.note.trim().length ? form.note.trim() : null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const nextManualAbsences = form.id
      ? absenceSettings.manualAbsences.map((entry) =>
          entry.id === form.id ? nextEntry : entry,
        )
      : [...absenceSettings.manualAbsences, nextEntry];

    await persistManualAbsences(nextManualAbsences);
    return true;
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await submitManualAbsence();
  }

  async function handleDeleteManualAbsence(id: string) {
    const nextManualAbsences = absenceSettings.manualAbsences.filter(
      (entry) => entry.id !== id,
    );
    await persistManualAbsences(nextManualAbsences);
    toast.info(t('absences.feedback.deleted'));
  }

  async function handleSyncNow() {
    if (!runtime.api) {
      return;
    }

    setIsPending(true);
    try {
      await runtime.api.syncAbsenceCatalog();
      await runtime.refresh();
      await settingsSnapshot.refresh();
      toast.success(t('absences.feedback.syncSuccess'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('absences.feedback.syncError'), message);
    } finally {
      setIsPending(false);
    }
  }

  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    onSave: async () => submitManualAbsence(),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('absences.title')}
        description={t('absences.description')}
      />
      <SectionCard
        title={t('absences.sync.title')}
        description={t('absences.sync.description')}
        className="border-primary-tint bg-white"
        action={
          <Button
            type="button"
            disabled={isPending || !subdivisionCode}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={() => {
              handleSyncNow().catch(() => undefined);
            }}
          >
            {t('absences.sync.trigger')}
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <p className="text-sm text-text-color/80">
            <strong>{t('absences.sync.stateLabel')}:</strong>{' '}
            {subdivisionCode ?? '-'}
          </p>
          <p className="text-sm text-text-color/80">
            <strong>{t('absences.sync.currentYear')}:</strong> {currentYear}
          </p>
          <p className="text-sm text-text-color/80">
            <strong>{t('absences.sync.syncedAt')}:</strong>{' '}
            {absenceSettings.lastSyncedAt ?? '-'}
          </p>
          <p className="text-sm text-text-color/80">
            <strong>{t('absences.sync.lastError')}:</strong>{' '}
            {absenceSettings.lastSyncError ?? '-'}
          </p>
        </div>
      </SectionCard>
      <SectionCard
        title={t('absences.manual.title')}
        description={t('absences.manual.description')}
        className="border-primary-tint bg-white"
      >
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={handleManualSubmit}
        >
          <FormField id="absence-start" label={t('absences.manual.startDate')}>
            <Input
              id="absence-start"
              type="date"
              value={form.startDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField id="absence-end" label={t('absences.manual.endDate')}>
            <Input
              id="absence-end"
              type="date"
              value={form.endDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField id="absence-type" label={t('absences.manual.type')}>
            <select
              id="absence-type"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as ManualAbsenceType,
                }))
              }
            >
              {manualAbsenceTypeValues.map((typeValue) => (
                <option key={typeValue} value={typeValue}>
                  {t(toManualAbsenceTypeTranslationKey(typeValue))}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="absence-label" label={t('absences.manual.label')}>
            <Input
              id="absence-label"
              value={form.label}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField id="absence-note" label={t('absences.manual.note')}>
              <Textarea
                id="absence-note"
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </FormField>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
            >
              {form.id ? t('absences.manual.update') : t('absences.manual.add')}
            </Button>
            {form.id ? (
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
        </form>
        {manualAbsences.length ? (
          <ul className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
            {manualAbsences.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-primary-tint/80 bg-primary-tint/20 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text-color">
                    {entry.startDate} - {entry.endDate} |{' '}
                    {t(toManualAbsenceTypeTranslationKey(entry.type))}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-primary-tint"
                      onClick={() => {
                        setForm({
                          id: entry.id,
                          type: entry.type,
                          startDate: entry.startDate,
                          endDate: entry.endDate,
                          label: entry.label,
                          note: entry.note ?? '',
                        });
                      }}
                    >
                      {t('absences.manual.edit')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-primary-tint"
                      onClick={() => {
                        handleDeleteManualAbsence(entry.id).catch(
                          () => undefined,
                        );
                      }}
                    >
                      {t('absences.manual.delete')}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-text-color/75">
                  {entry.label || '-'}
                </p>
                <p className="text-sm text-text-color/70">
                  {entry.note || '-'}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-color/70">
            {t('absences.manual.empty')}
          </p>
        )}
      </SectionCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={t('absences.catalog.publicTitle')}
          className="border-primary-tint bg-white"
        >
          {currentCatalog?.publicHolidays.length ? (
            <ul className="max-h-80 space-y-2 overflow-auto pr-1">
              {currentCatalog.publicHolidays.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-md border border-primary-tint/80 bg-primary-tint/20 px-3 py-2 text-sm"
                >
                  {entry.startDate} - {entry.endDate} | {entry.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-color/70">
              {t('absences.catalog.empty')}
            </p>
          )}
        </SectionCard>
        <SectionCard
          title={t('absences.catalog.schoolTitle')}
          className="border-primary-tint bg-white"
        >
          {currentCatalog?.schoolHolidays.length ? (
            <ul className="max-h-80 space-y-2 overflow-auto pr-1">
              {currentCatalog.schoolHolidays.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-md border border-primary-tint/80 bg-primary-tint/20 px-3 py-2 text-sm"
                >
                  {entry.startDate} - {entry.endDate} | {entry.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-color/70">
              {t('absences.catalog.empty')}
            </p>
          )}
        </SectionCard>
      </div>
      <UnsavedChangesDialog
        open={unsavedChangesGuard.isOpen}
        isPending={unsavedChangesGuard.isPending}
        onCancel={unsavedChangesGuard.cancel}
        onDiscard={unsavedChangesGuard.discard}
        onSave={() => {
          unsavedChangesGuard.saveAndProceed().catch(() => undefined);
        }}
      />
    </div>
  );
}
