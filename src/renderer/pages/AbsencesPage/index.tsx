import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CollectionAccordion from '@/renderer/components/app/CollectionAccordion';
import EditableAbsenceCollection, {
  defaultManualAbsenceFormState,
  ManualAbsenceFormState,
} from '@/renderer/components/absence/EditableAbsenceCollection';
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
import {
  createCatalogYearKey,
  getStaleAbsenceCatalogYears,
  hasStaleAbsenceCatalogs,
  listAbsenceCatalogYears,
  ManualAbsence,
  ManualAbsenceType,
  mergeAbsenceSettings,
  parseAbsenceSettings,
  resolveOnboardingSubdivisionCode,
} from '@/shared/absence/settings';

type CatalogListItem = {
  id: string;
  source: 'catalog' | 'manual';
  startDate: string;
  endDate: string;
  title: string;
  note: string | null;
  year: number | null;
  isOutdated: boolean;
  manualEntry: ManualAbsence | null;
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
  if (
    !form.id &&
    !form.startDate &&
    !form.endDate &&
    !form.label.trim() &&
    !form.note.trim()
  ) {
    return JSON.stringify(defaultManualAbsenceFormState);
  }

  return JSON.stringify({
    id: form.id,
    type: form.type,
    startDate: form.startDate,
    endDate: form.endDate,
    label: form.label,
    note: form.note,
  });
}

const manualAbsenceGroupOrder = ['sick', 'vacation'] as const;

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
  const manualAbsenceGroups = useMemo(
    () =>
      manualAbsenceGroupOrder.map((type) => ({
        type,
        entries: manualAbsences.filter((entry) => entry.type === type),
      })),
    [manualAbsences],
  );
  const publicHolidayItems = useMemo<CatalogListItem[]>(
    () =>
      [
        ...catalogYears.flatMap((year) => {
          const catalog =
            absenceSettings.catalogsByYear[createCatalogYearKey(year)];

          return catalog.publicHolidays.map((entry) => ({
            id: `catalog-${entry.id}`,
            source: 'catalog' as const,
            startDate: entry.startDate,
            endDate: entry.endDate,
            title: entry.name,
            note: null,
            year,
            isOutdated: staleCatalogYearSet.has(year),
            manualEntry: null,
          }));
        }),
        ...manualAbsences
          .filter((entry) => entry.type === 'public-holiday')
          .map((entry) => ({
            id: `manual-${entry.id}`,
            source: 'manual' as const,
            startDate: entry.startDate,
            endDate: entry.endDate,
            title:
              entry.label.trim() ||
              t(toManualAbsenceTypeTranslationKey(entry.type)),
            note: entry.note,
            year: entry.startDate ? Number(entry.startDate.slice(0, 4)) : null,
            isOutdated: false,
            manualEntry: entry,
          })),
      ].sort((left, right) => {
        const byDate = left.startDate.localeCompare(right.startDate);

        if (byDate !== 0) {
          return byDate;
        }

        return left.id.localeCompare(right.id);
      }),
    [
      absenceSettings.catalogsByYear,
      catalogYears,
      manualAbsences,
      staleCatalogYearSet,
      t,
    ],
  );
  const schoolHolidayItems = useMemo<CatalogListItem[]>(
    () =>
      [
        ...catalogYears.flatMap((year) => {
          const catalog =
            absenceSettings.catalogsByYear[createCatalogYearKey(year)];

          return catalog.schoolHolidays.map((entry) => ({
            id: `catalog-${entry.id}`,
            source: 'catalog' as const,
            startDate: entry.startDate,
            endDate: entry.endDate,
            title: entry.name,
            note: null,
            year,
            isOutdated: staleCatalogYearSet.has(year),
            manualEntry: null,
          }));
        }),
        ...manualAbsences
          .filter((entry) => entry.type === 'school-holiday')
          .map((entry) => ({
            id: `manual-${entry.id}`,
            source: 'manual' as const,
            startDate: entry.startDate,
            endDate: entry.endDate,
            title:
              entry.label.trim() ||
              t(toManualAbsenceTypeTranslationKey(entry.type)),
            note: entry.note,
            year: entry.startDate ? Number(entry.startDate.slice(0, 4)) : null,
            isOutdated: false,
            manualEntry: entry,
          })),
      ].sort((left, right) => {
        const byDate = left.startDate.localeCompare(right.startDate);

        if (byDate !== 0) {
          return byDate;
        }

        return left.id.localeCompare(right.id);
      }),
    [
      absenceSettings.catalogsByYear,
      catalogYears,
      manualAbsences,
      staleCatalogYearSet,
      t,
    ],
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

  async function submitManualAbsence(
    nextForm: ManualAbsenceFormState = form,
  ): Promise<boolean> {
    if (!runtime.api || !settingsSnapshot.value) {
      return false;
    }

    if (!nextForm.startDate || !nextForm.endDate) {
      toast.error(t('absences.feedback.missingDate'));
      return false;
    }

    if (nextForm.endDate < nextForm.startDate) {
      toast.error(t('absences.feedback.invalidRange'));
      return false;
    }

    if (
      (nextForm.type === 'public-holiday' ||
        nextForm.type === 'school-holiday') &&
      !nextForm.label.trim()
    ) {
      toast.error(t('absences.feedback.labelRequiredForHolidayType'));
      return false;
    }

    const now = new Date().toISOString();
    const existing = nextForm.id
      ? absenceSettings.manualAbsences.find((entry) => entry.id === nextForm.id)
      : null;
    const nextEntry: ManualAbsence = {
      id: nextForm.id ?? createManualAbsenceId(),
      type: nextForm.type,
      startDate: nextForm.startDate,
      endDate: nextForm.endDate,
      label: nextForm.label.trim(),
      note: nextForm.note.trim().length ? nextForm.note.trim() : null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const nextManualAbsences = nextForm.id
      ? absenceSettings.manualAbsences.map((entry) =>
          entry.id === nextForm.id ? nextEntry : entry,
        )
      : [...absenceSettings.manualAbsences, nextEntry];

    await persistManualAbsences(nextManualAbsences);
    return true;
  }

  async function handleDeleteManualAbsence(entry: ManualAbsence) {
    const nextManualAbsences = absenceSettings.manualAbsences.filter(
      (candidate) => candidate.id !== entry.id,
    );
    await persistManualAbsences(nextManualAbsences);
    toast.info(t('absences.feedback.deleted'));
  }

  function beginManualAbsenceEdit(entry: ManualAbsence) {
    setForm({
      id: entry.id,
      type: entry.type,
      startDate: entry.startDate,
      endDate: entry.endDate,
      label: entry.label,
      note: entry.note ?? '',
    });
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
        <CollectionAccordion summary={t('absences.manual.summary')} defaultOpen>
          {manualAbsenceGroups.map(({ type, entries }) => (
            <EditableAbsenceCollection
              key={type}
              type={type}
              title={t(toManualAbsenceTypeTranslationKey(type))}
              items={entries}
              form={form}
              isPending={isPending}
              emptyText={t('absences.manual.emptyType', {
                type: t(toManualAbsenceTypeTranslationKey(type)),
              })}
              getKey={(entry) => entry.id}
              getEditableEntry={(entry) => entry}
              renderItem={(entry) => (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-color">
                    {entry.startDate} - {entry.endDate}
                  </p>
                  <p className="text-sm text-text-color/75">
                    {entry.label || '-'}
                  </p>
                  <p className="text-sm text-text-color/70">
                    {entry.note || '-'}
                  </p>
                </div>
              )}
              setForm={setForm}
              onSubmit={submitManualAbsence}
              onEdit={beginManualAbsenceEdit}
              onDelete={handleDeleteManualAbsence}
            />
          ))}
        </CollectionAccordion>
      </SectionCard>
      <SectionCard
        title={t('absences.catalog.title')}
        description={t('absences.catalog.description')}
        className="border-primary-tint bg-white"
      >
        <CollectionAccordion
          summary={t('absences.catalog.summary')}
          defaultOpen
        >
          <EditableAbsenceCollection
            type="public-holiday"
            title={t('absences.catalog.publicTitle')}
            items={publicHolidayItems}
            form={form}
            isPending={isPending}
            emptyText={t('absences.catalog.emptyType', {
              type: t('absences.catalog.publicTitle'),
            })}
            getKey={(entry) => entry.id}
            getEditableEntry={(entry) => entry.manualEntry}
            renderItem={(entry) => (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-text-color">
                    {entry.startDate} - {entry.endDate} | {entry.title}
                  </p>
                  {entry.year ? (
                    <Badge
                      variant="outline"
                      className="border-primary-tint/70 bg-primary-tint/15 text-text-color"
                    >
                      {entry.year}
                    </Badge>
                  ) : null}
                  <Badge
                    variant="outline"
                    className={
                      entry.source === 'manual'
                        ? 'border-sky-300 bg-sky-50 text-sky-900'
                        : 'border-primary-tint/70 bg-primary-tint/15 text-text-color'
                    }
                  >
                    {entry.source === 'manual'
                      ? t('absences.catalog.sources.manual')
                      : t('absences.catalog.sources.synced')}
                  </Badge>
                  {entry.isOutdated ? (
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-100 text-amber-800"
                    >
                      {t('absences.catalog.outdated')}
                    </Badge>
                  ) : null}
                </div>
                {entry.note ? (
                  <p className="text-sm text-text-color/70">{entry.note}</p>
                ) : null}
              </div>
            )}
            setForm={setForm}
            onSubmit={submitManualAbsence}
            onEdit={beginManualAbsenceEdit}
            onDelete={handleDeleteManualAbsence}
          />
          <EditableAbsenceCollection
            type="school-holiday"
            title={t('absences.catalog.schoolTitle')}
            items={schoolHolidayItems}
            form={form}
            isPending={isPending}
            emptyText={t('absences.catalog.emptyType', {
              type: t('absences.catalog.schoolTitle'),
            })}
            getKey={(entry) => entry.id}
            getEditableEntry={(entry) => entry.manualEntry}
            renderItem={(entry) => (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-text-color">
                    {entry.startDate} - {entry.endDate} | {entry.title}
                  </p>
                  {entry.year ? (
                    <Badge
                      variant="outline"
                      className="border-primary-tint/70 bg-primary-tint/15 text-text-color"
                    >
                      {entry.year}
                    </Badge>
                  ) : null}
                  <Badge
                    variant="outline"
                    className={
                      entry.source === 'manual'
                        ? 'border-sky-300 bg-sky-50 text-sky-900'
                        : 'border-primary-tint/70 bg-primary-tint/15 text-text-color'
                    }
                  >
                    {entry.source === 'manual'
                      ? t('absences.catalog.sources.manual')
                      : t('absences.catalog.sources.synced')}
                  </Badge>
                  {entry.isOutdated ? (
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-100 text-amber-800"
                    >
                      {t('absences.catalog.outdated')}
                    </Badge>
                  ) : null}
                </div>
                {entry.note ? (
                  <p className="text-sm text-text-color/70">{entry.note}</p>
                ) : null}
              </div>
            )}
            setForm={setForm}
            onSubmit={submitManualAbsence}
            onEdit={beginManualAbsenceEdit}
            onDelete={handleDeleteManualAbsence}
          />
        </CollectionAccordion>
      </SectionCard>
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
