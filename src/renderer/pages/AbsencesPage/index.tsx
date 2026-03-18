import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/renderer/lib/utils';
import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import UnsavedChangesDialog from '@/renderer/components/app/UnsavedChangesDialog';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import useUnsavedChangesGuard from '@/renderer/hooks/useUnsavedChangesGuard';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
import AbsenceSyncDialog from '@/renderer/components/absence/AbsenceSyncDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createCatalogYearKey,
  getStaleAbsenceCatalogYears,
  hasStaleAbsenceCatalogs,
  listAbsenceCatalogYears,
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
  const [isPublicCatalogCollapsed, setIsPublicCatalogCollapsed] =
    useState(true);
  const [isSchoolCatalogCollapsed, setIsSchoolCatalogCollapsed] =
    useState(true);

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
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false);
  const catalogYears = useMemo(
    () => listAbsenceCatalogYears(absenceSettings),
    [absenceSettings],
  );
  const staleCatalogYears = useMemo(
    () => getStaleAbsenceCatalogYears(absenceSettings, currentYear),
    [absenceSettings, currentYear],
  );
  const staleCatalogYearSet = useMemo(
    () => new Set(staleCatalogYears),
    [staleCatalogYears],
  );
  const hasStaleCatalogs = useMemo(
    () => hasStaleAbsenceCatalogs(absenceSettings, currentYear),
    [absenceSettings, currentYear],
  );
  const hasPublicCatalogEntries = useMemo(
    () =>
      catalogYears.some((year) => {
        const catalog =
          absenceSettings.catalogsByYear[createCatalogYearKey(year)];
        return catalog.publicHolidays.length > 0;
      }),
    [absenceSettings.catalogsByYear, catalogYears],
  );
  const hasSchoolCatalogEntries = useMemo(
    () =>
      catalogYears.some((year) => {
        const catalog =
          absenceSettings.catalogsByYear[createCatalogYearKey(year)];
        return catalog.schoolHolidays.length > 0;
      }),
    [absenceSettings.catalogsByYear, catalogYears],
  );
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

  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    onSave: async () => submitManualAbsence(),
  });

  function renderCatalogContent(
    catalogType: 'publicHolidays' | 'schoolHolidays',
  ) {
    return (
      <div className="space-y-4 pr-1">
        {catalogYears.map((year) => {
          const catalog =
            absenceSettings.catalogsByYear[createCatalogYearKey(year)];
          const entries = catalog[catalogType];

          if (!entries.length) {
            return null;
          }

          return (
            <div key={`${catalogType}-${year}`} className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text-color">{year}</p>
                {staleCatalogYearSet.has(year) ? (
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-100 text-amber-800"
                  >
                    {t('absences.catalog.outdated')}
                  </Badge>
                ) : null}
              </div>
              <ul className="space-y-2">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-md border border-primary-tint/80 bg-primary-tint/20 px-3 py-2 text-sm"
                  >
                    {entry.startDate} - {entry.endDate} | {entry.name}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('absences.title')}
        description={t('absences.description')}
      />

      {hasStaleCatalogs ? (
        <Alert className="border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-600"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <AlertTitle className="text-amber-800 font-semibold mb-0">
              {t('absences.sync.outdatedTitle')}
            </AlertTitle>
          </div>
          <AlertDescription className="text-amber-700 mt-1">
            {t('absences.sync.outdatedDescription', {
              years: staleCatalogYears.join(', '),
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      <SectionCard
        title={t('absences.sync.title')}
        description={t('absences.sync.description')}
        className="border-primary-tint bg-white"
        action={
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              disabled={isPending || !subdivisionCode}
              className="bg-primary text-primary-contrast hover:bg-primary-shade h-9"
              onClick={() => {
                setShowSyncConfirmation(true);
              }}
            >
              {t('absences.sync.trigger')}
            </Button>
            {absenceSettings.lastSyncedAt && (
              <span className="text-xs text-text-color/70 font-medium whitespace-nowrap">
                {t('absences.sync.syncedAt')}:{' '}
                {new Date(absenceSettings.lastSyncedAt)
                  .toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  .replace(',', '')}
              </span>
            )}
          </div>
        }
      >
        <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
          <p className="text-sm text-text-color/80">
            <strong>{t('absences.sync.stateLabel')}:</strong>{' '}
            {subdivisionCode ?? '-'}
          </p>
          <p className="text-sm text-text-color/80">
            <strong>{t('absences.sync.currentYear')}:</strong> {currentYear}
          </p>
          <p className="text-sm text-text-color/80">
            <strong>{t('absences.sync.catalogYears')}:</strong>{' '}
            {catalogYears.length ? catalogYears.join(', ') : '-'}
          </p>
          <p className="text-sm text-text-color/80">
            <strong>{t('absences.sync.autoSyncSetting')}:</strong>{' '}
            {absenceSettings.autoSyncHolidays
              ? t('common.yes')
              : t('common.no')}
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
      <div className="grid gap-4 items-start lg:grid-cols-2">
        <SectionCard
          title={t('absences.catalog.publicTitle')}
          className="h-full border-primary-tint bg-white"
          contentClassName="p-0"
          onClick={() => setIsPublicCatalogCollapsed((current) => !current)}
          action={
            <div className="flex h-8 w-8 items-center justify-center">
              <div
                className={cn(
                  'transition-transform duration-200',
                  isPublicCatalogCollapsed ? '-rotate-90' : 'rotate-0',
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          }
        >
          <AnimatePresence initial={false}>
            {!isPublicCatalogCollapsed && (
              <motion.div
                key="public-catalog"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-4">
                  {hasPublicCatalogEntries ? (
                    renderCatalogContent('publicHolidays')
                  ) : (
                    <p className="text-sm text-text-color/70">
                      {t('absences.catalog.empty')}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SectionCard>
        <SectionCard
          title={t('absences.catalog.schoolTitle')}
          className="h-full border-primary-tint bg-white"
          contentClassName="p-0"
          onClick={() => setIsSchoolCatalogCollapsed((current) => !current)}
          action={
            <div className="flex h-8 w-8 items-center justify-center">
              <div
                className={cn(
                  'transition-transform duration-200',
                  isSchoolCatalogCollapsed ? '-rotate-90' : 'rotate-0',
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          }
        >
          <AnimatePresence initial={false}>
            {!isSchoolCatalogCollapsed && (
              <motion.div
                key="school-catalog"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-4">
                  {hasSchoolCatalogEntries ? (
                    renderCatalogContent('schoolHolidays')
                  ) : (
                    <p className="text-sm text-text-color/70">
                      {t('absences.catalog.empty')}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
      <AbsenceSyncDialog
        mode="manual"
        open={showSyncConfirmation}
        onOpenChange={setShowSyncConfirmation}
      />
    </div>
  );
}
