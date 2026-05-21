import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import CollectionAccordion from '@/renderer/components/app/CollectionAccordion';
import EditableAbsenceCollection, {
  defaultManualAbsenceFormState,
  ManualAbsenceFormState,
} from '@/renderer/components/absence/EditableAbsenceCollection';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import UnsavedChangesDialog from '@/renderer/components/app/UnsavedChangesDialog';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import useUnsavedChangesGuard from '@/renderer/hooks/useUnsavedChangesGuard';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import AbsenceSyncDialog from '@/renderer/components/absence/AbsenceSyncDialog';
import {
  formatGermanDate,
  formatGermanDateTime,
} from '@/renderer/lib/date-format';
import {
  hasDismissedIntroDialog,
  markIntroDialogDismissed,
} from '@/renderer/lib/first-run-dialogs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarDays, PartyPopper, Plane, Thermometer } from 'lucide-react';
import {
  createCatalogYearKey,
  getMissingAbsenceCatalogYears,
  listAbsenceCatalogYears,
  ManualAbsence,
  ManualAbsenceType,
  mergeAbsenceSettings,
  parseAbsenceSettings,
  resolveRequiredAbsenceCatalogYears,
  resolveOnboardingSubdivisionCode,
} from '@/shared/absence/settings';
import {
  isDateRangeLockedBySubmittedReports,
  resolveFirstEditableDateAfterSubmittedReports,
} from '@/shared/reports/edit-locks';

type CatalogListItem = {
  id: string;
  source: 'catalog' | 'manual';
  startDate: string;
  endDate: string;
  title: string;
  note: string | null;
  year: number | null;
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

function titleWithIcon(icon: ReactNode, title: string) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      <span>{title}</span>
    </span>
  );
}

function getManualAbsenceIcon(type: (typeof manualAbsenceGroupOrder)[number]) {
  if (type === 'sick') {
    return <Thermometer className="size-4 text-primary" />;
  }

  return <Plane className="size-4 text-primary" />;
}

function getManualAbsenceKey(entry: ManualAbsence): string {
  return entry.id;
}

function getCatalogListItemKey(entry: CatalogListItem): string {
  return entry.id;
}

function getManualEditableEntry(entry: ManualAbsence): ManualAbsence {
  return entry;
}

function getCatalogEditableEntry(entry: CatalogListItem): ManualAbsence | null {
  return entry.manualEntry;
}

function compareManualAbsenceByNewestEndDate(
  left: ManualAbsence,
  right: ManualAbsence,
): number {
  const byEndDate = right.endDate.localeCompare(left.endDate);

  if (byEndDate !== 0) {
    return byEndDate;
  }

  const byStartDate = right.startDate.localeCompare(left.startDate);

  if (byStartDate !== 0) {
    return byStartDate;
  }

  return left.id.localeCompare(right.id);
}

export default function AbsencesPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const settingsSnapshot = useSettingsSnapshot();
  const reportsState = useReportsState();
  const [isPending, setIsPending] = useState(false);
  const [isCatalogSyncPending, setIsCatalogSyncPending] = useState(false);
  const autoSyncAttemptKeyRef = useRef<string | null>(null);
  const [form, setForm] = useState<ManualAbsenceFormState>(
    defaultManualAbsenceFormState,
  );
  const [isIntroOpen, setIsIntroOpen] = useState(false);

  const absenceSettings = useMemo(
    () => parseAbsenceSettings(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const subdivisionCode = useMemo(
    () =>
      resolveOnboardingSubdivisionCode(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const currentYear = new Date().getFullYear();
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false);
  const requiredCatalogYears = useMemo(
    () =>
      resolveRequiredAbsenceCatalogYears({
        values: settingsSnapshot.value?.values ?? {},
        currentYear,
      }),
    [currentYear, settingsSnapshot.value?.values],
  );
  const missingCatalogYears = useMemo(
    () =>
      subdivisionCode
        ? getMissingAbsenceCatalogYears({
            absence: absenceSettings,
            subdivisionCode,
            requiredYears: requiredCatalogYears,
          })
        : [],
    [absenceSettings, requiredCatalogYears, subdivisionCode],
  );
  const hasMissingCatalogYears = missingCatalogYears.length > 0;
  const missingCatalogYearsKey = missingCatalogYears.join(',');
  const catalogYears = useMemo(
    () => listAbsenceCatalogYears(absenceSettings),
    [absenceSettings],
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
        entries: manualAbsences
          .filter((entry) => entry.type === type)
          .sort(compareManualAbsenceByNewestEndDate),
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
            manualEntry: entry,
          })),
      ].sort((left, right) => {
        const byDate = left.startDate.localeCompare(right.startDate);

        if (byDate !== 0) {
          return byDate;
        }

        return left.id.localeCompare(right.id);
      }),
    [absenceSettings.catalogsByYear, catalogYears, manualAbsences, t],
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
            manualEntry: entry,
          })),
      ].sort((left, right) => {
        const byDate = left.startDate.localeCompare(right.startDate);

        if (byDate !== 0) {
          return byDate;
        }

        return left.id.localeCompare(right.id);
      }),
    [absenceSettings.catalogsByYear, catalogYears, manualAbsences, t],
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
  const firstEditableAbsenceDate = useMemo(
    () => resolveFirstEditableDateAfterSubmittedReports(reportsState.value),
    [reportsState.value],
  );
  const submittedReportEditDisabledReason = useMemo(
    () =>
      firstEditableAbsenceDate
        ? t('absences.feedback.submittedReportLocked', {
            date: formatGermanDate(firstEditableAbsenceDate),
          })
        : null,
    [firstEditableAbsenceDate, t],
  );
  const isManualAbsenceLocked = useCallback(
    (entry: Pick<ManualAbsence, 'startDate' | 'endDate'>) =>
      isDateRangeLockedBySubmittedReports({
        startDate: entry.startDate,
        endDate: entry.endDate,
        reportsState: reportsState.value,
      }),
    [reportsState.value],
  );
  const getManualAbsenceDisabledReason = useCallback(
    (entry: Pick<ManualAbsence, 'startDate' | 'endDate'>) =>
      isManualAbsenceLocked(entry) ? submittedReportEditDisabledReason : null,
    [isManualAbsenceLocked, submittedReportEditDisabledReason],
  );
  const getManualAbsenceFormDisabledReason = useCallback(
    (nextForm: ManualAbsenceFormState) => {
      if (!nextForm.startDate || !nextForm.endDate) {
        return null;
      }

      return getManualAbsenceDisabledReason(nextForm);
    },
    [getManualAbsenceDisabledReason],
  );
  const showSubmittedReportLockToast = useCallback(() => {
    toast.error(
      t('common.disabledReasons.submittedReport'),
      submittedReportEditDisabledReason ?? undefined,
    );
  }, [submittedReportEditDisabledReason, t, toast]);

  useEffect(() => {
    if (!hasDismissedIntroDialog('absences')) {
      setIsIntroOpen(true);
    }
  }, []);

  useEffect(() => {
    if (
      !runtime.api ||
      !settingsSnapshot.value ||
      !absenceSettings.autoSyncHolidays ||
      !subdivisionCode ||
      !hasMissingCatalogYears ||
      isCatalogSyncPending
    ) {
      return;
    }

    const attemptKey = `${subdivisionCode}:${missingCatalogYearsKey}`;

    if (autoSyncAttemptKeyRef.current === attemptKey) {
      return;
    }

    autoSyncAttemptKeyRef.current = attemptKey;
    setIsCatalogSyncPending(true);
    const syncMissingCatalogYears = async () => {
      try {
        await runtime.api!.syncAbsenceCatalog();
        await Promise.all([runtime.refresh(), settingsSnapshot.refresh()]);
      } catch (error) {
        toast.error(
          t('absences.feedback.syncError'),
          error instanceof Error ? error.message : t('common.errors.unknown'),
        );
      } finally {
        setIsCatalogSyncPending(false);
      }
    };

    syncMissingCatalogYears().catch(() => undefined);
  }, [
    absenceSettings.autoSyncHolidays,
    hasMissingCatalogYears,
    isCatalogSyncPending,
    missingCatalogYearsKey,
    runtime,
    settingsSnapshot,
    subdivisionCode,
    t,
    toast,
  ]);

  const persistManualAbsences = useCallback(
    async (nextManualAbsences: ManualAbsence[]) => {
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
    },
    [absenceSettings, runtime, settingsSnapshot, t, toast],
  );

  const submitManualAbsence = useCallback(
    async (nextForm: ManualAbsenceFormState = form): Promise<boolean> => {
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
        ? absenceSettings.manualAbsences.find(
            (entry) => entry.id === nextForm.id,
          )
        : null;

      if (
        (existing && isManualAbsenceLocked(existing)) ||
        isManualAbsenceLocked(nextForm)
      ) {
        showSubmittedReportLockToast();
        return false;
      }

      const nextEntry: ManualAbsence = {
        id: nextForm.id ?? createManualAbsenceId(),
        type: nextForm.type,
        startDate: nextForm.startDate,
        endDate: nextForm.endDate,
        label:
          nextForm.type === 'public-holiday' ||
          nextForm.type === 'school-holiday'
            ? nextForm.label.trim()
            : '',
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
    },
    [
      absenceSettings.manualAbsences,
      form,
      isManualAbsenceLocked,
      persistManualAbsences,
      runtime.api,
      settingsSnapshot.value,
      showSubmittedReportLockToast,
      t,
      toast,
    ],
  );

  const handleDeleteManualAbsence = useCallback(
    async (entry: ManualAbsence) => {
      if (isManualAbsenceLocked(entry)) {
        showSubmittedReportLockToast();
        return;
      }

      const nextManualAbsences = absenceSettings.manualAbsences.filter(
        (candidate) => candidate.id !== entry.id,
      );
      await persistManualAbsences(nextManualAbsences);
      toast.info(t('absences.feedback.deleted'));
    },
    [
      absenceSettings.manualAbsences,
      isManualAbsenceLocked,
      persistManualAbsences,
      showSubmittedReportLockToast,
      t,
      toast,
    ],
  );

  const beginManualAbsenceEdit = useCallback(
    (entry: ManualAbsence) => {
      if (isManualAbsenceLocked(entry)) {
        showSubmittedReportLockToast();
        return;
      }

      setForm({
        id: entry.id,
        type: entry.type,
        startDate: entry.startDate,
        endDate: entry.endDate,
        label: entry.label,
        note: entry.note ?? '',
      });
    },
    [isManualAbsenceLocked, showSubmittedReportLockToast],
  );

  const handleUnsavedSave = useCallback(
    () => submitManualAbsence(),
    [submitManualAbsence],
  );

  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    onSave: handleUnsavedSave,
  });
  const handleOpenSyncConfirmation = useCallback(() => {
    setShowSyncConfirmation(true);
  }, []);
  const renderManualAbsenceItem = useCallback(
    (entry: ManualAbsence) => (
      <div className="space-y-1">
        <p className="text-sm font-medium text-text-color">
          {formatGermanDate(entry.startDate)} -{' '}
          {formatGermanDate(entry.endDate)}
        </p>
        <p className="text-sm text-text-color/75">
          {entry.label.trim() ||
            t(toManualAbsenceTypeTranslationKey(entry.type))}
        </p>
        <p className="text-sm text-text-color/70">{entry.note || '-'}</p>
      </div>
    ),
    [t],
  );
  const renderCatalogItem = useCallback(
    (entry: CatalogListItem) => (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-text-color">
            {formatGermanDate(entry.startDate)} -{' '}
            {formatGermanDate(entry.endDate)} | {entry.title}
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
        </div>
        {entry.note ? (
          <p className="text-sm text-text-color/70">{entry.note}</p>
        ) : null}
      </div>
    ),
    [t],
  );
  const handleSaveAndProceed = useCallback(() => {
    unsavedChangesGuard.saveAndProceed().catch(() => undefined);
  }, [unsavedChangesGuard]);
  const closeIntroDialog = useCallback(() => {
    setIsIntroOpen(false);
  }, []);
  const dismissIntroDialogPermanently = useCallback(() => {
    markIntroDialogDismissed('absences');
    setIsIntroOpen(false);
  }, []);

  return (
    <div className="space-y-4">
      <Dialog
        open={isIntroOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsIntroOpen(true);
            return;
          }

          closeIntroDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('absences.intro.title')}</DialogTitle>
            <DialogDescription>
              {t('absences.intro.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-text-color/80">
            <p>{t('absences.intro.sync')}</p>
            <p>{t('absences.intro.manual')}</p>
            <p>{t('absences.intro.locked')}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={dismissIntroDialogPermanently}
            >
              {t('common.doNotShowAgain')}
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={closeIntroDialog}
            >
              {t('common.understood')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {hasMissingCatalogYears ? (
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
              {t('absences.sync.missingYearsTitle')}
            </AlertTitle>
          </div>
          <AlertDescription className="text-amber-700 mt-1">
            {absenceSettings.autoSyncHolidays
              ? t('absences.sync.missingYearsDescription', {
                  years: missingCatalogYears.join(', '),
                })
              : t('absences.sync.missingYearsAutoSyncDisabledDescription', {
                  years: missingCatalogYears.join(', '),
                })}
          </AlertDescription>
        </Alert>
      ) : null}

      <SectionCard
        title={t('absences.sync.title')}
        className="border-primary-tint bg-white"
        action={
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              disabled={isPending || isCatalogSyncPending || !subdivisionCode}
              disabledReason={
                isPending || isCatalogSyncPending
                  ? t('common.disabledReasons.pending')
                  : t('common.disabledReasons.missingSubdivision')
              }
              className="bg-primary text-primary-contrast hover:bg-primary-shade h-9"
              onClick={handleOpenSyncConfirmation}
            >
              {isCatalogSyncPending
                ? t('common.loading')
                : t('absences.sync.trigger')}
            </Button>
            {absenceSettings.lastSyncedAt && (
              <span className="text-xs text-text-color/70 font-medium whitespace-nowrap">
                {t('absences.sync.syncedAt')}:{' '}
                {formatGermanDateTime(absenceSettings.lastSyncedAt)}
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
            <strong>{t('absences.sync.requiredYears')}:</strong>{' '}
            {requiredCatalogYears.join(', ')}
          </p>
          <p className="text-sm text-text-color/80">
            <strong>{t('absences.sync.autoSyncSetting')}:</strong>{' '}
            {absenceSettings.autoSyncHolidays
              ? t('common.yes')
              : t('common.no')}
          </p>
        </div>
        {!absenceSettings.autoSyncHolidays ? (
          <p className="mt-2 text-xs text-text-color/70">
            {t('absences.sync.autoSyncDisabledHint', {
              years: requiredCatalogYears.join(', '),
            })}
          </p>
        ) : null}
      </SectionCard>
      <SectionCard
        title={t('absences.manual.title')}
        className="border-primary-tint bg-white"
      >
        <div className="flex flex-row w-full gap-4">
          {manualAbsenceGroups.map(({ type, entries }) => {
            const title = t(toManualAbsenceTypeTranslationKey(type));
            const titleNode = titleWithIcon(getManualAbsenceIcon(type), title);

            return (
              <CollectionAccordion
                key={type}
                summary={titleNode}
                defaultOpen
                contentClassName="md:grid-cols-1"
              >
                <EditableAbsenceCollection
                  type={type}
                  titleLabel={title}
                  items={entries}
                  form={form}
                  isPending={isPending}
                  emptyText={t('absences.manual.emptyType', {
                    type: title,
                  })}
                  getKey={getManualAbsenceKey}
                  getEditableEntry={getManualEditableEntry}
                  renderItem={renderManualAbsenceItem}
                  getEntryDisabledReason={getManualAbsenceDisabledReason}
                  getFormDisabledReason={getManualAbsenceFormDisabledReason}
                  minDate={firstEditableAbsenceDate}
                  setForm={setForm}
                  onSubmit={submitManualAbsence}
                  onEdit={beginManualAbsenceEdit}
                  onDelete={handleDeleteManualAbsence}
                />
              </CollectionAccordion>
            );
          })}
        </div>
      </SectionCard>
      <SectionCard
        title={titleWithIcon(
          <PartyPopper className="size-4 text-primary" />,
          t('absences.catalog.title'),
        )}
        className="border-primary-tint bg-white"
      >
        <CollectionAccordion
          summary={titleWithIcon(
            <CalendarDays className="size-4 text-primary" />,
            t('absences.catalog.summary'),
          )}
          defaultOpen
        >
          <EditableAbsenceCollection
            type="public-holiday"
            titleLabel={t('absences.catalog.publicTitle')}
            items={publicHolidayItems}
            form={form}
            isPending={isPending}
            emptyText={t('absences.catalog.emptyType', {
              type: t('absences.catalog.publicTitle'),
            })}
            getKey={getCatalogListItemKey}
            getEditableEntry={getCatalogEditableEntry}
            renderItem={renderCatalogItem}
            getEntryDisabledReason={getManualAbsenceDisabledReason}
            getFormDisabledReason={getManualAbsenceFormDisabledReason}
            minDate={firstEditableAbsenceDate}
            setForm={setForm}
            onSubmit={submitManualAbsence}
            onEdit={beginManualAbsenceEdit}
            onDelete={handleDeleteManualAbsence}
          />
          <EditableAbsenceCollection
            type="school-holiday"
            titleLabel={t('absences.catalog.schoolTitle')}
            items={schoolHolidayItems}
            form={form}
            isPending={isPending}
            emptyText={t('absences.catalog.emptyType', {
              type: t('absences.catalog.schoolTitle'),
            })}
            getKey={getCatalogListItemKey}
            getEditableEntry={getCatalogEditableEntry}
            renderItem={renderCatalogItem}
            getEntryDisabledReason={getManualAbsenceDisabledReason}
            getFormDisabledReason={getManualAbsenceFormDisabledReason}
            minDate={firstEditableAbsenceDate}
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
        onSave={handleSaveAndProceed}
      />
      <AbsenceSyncDialog
        mode="manual"
        open={showSyncConfirmation}
        onOpenChange={setShowSyncConfirmation}
      />
    </div>
  );
}
