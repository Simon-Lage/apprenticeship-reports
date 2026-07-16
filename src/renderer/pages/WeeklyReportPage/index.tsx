import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiAlertTriangle,
  FiCopy,
  FiFileText,
  FiRotateCcw,
  FiSave,
  FiSend,
} from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import { FormField } from '@/renderer/components/app/FormField';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import WeeklyReportSectionCards from '@/renderer/components/weekly-report/WeeklyReportSectionCards';
import WeeklyReportStickyHeader from '@/renderer/components/weekly-report/WeeklyReportStickyHeader';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import {
  formatGermanDate,
  formatGermanDateShort,
} from '@/renderer/lib/date-format';
import { appRoutes } from '@/renderer/lib/app-routes';
import { notifyReportsStateChanged } from '@/renderer/lib/report-state-events';
import {
  parseAbsenceSettings,
  resolveOnboardingSubdivisionCode,
} from '@/shared/absence/settings';
import {
  isSchoolDayFromTimetable,
  parseOnboardingTrainingPeriod,
  parseUiSettings,
  parseOnboardingWorkplace,
} from '@/renderer/lib/app-settings';
import { toLocalIsoDate } from '@/renderer/lib/iso-date';
import {
  listWeekDates,
  parseWeeklyReportValues,
} from '@/renderer/lib/report-values';
import {
  buildWeeklyDocumentSections,
  createWeeklyDocumentTranslations,
  serializeWeeklyDocumentSectionEntries,
} from '@/renderer/lib/weekly-report-document';
import {
  formatConflictDayTypeLabel,
  formatConflictReasonLabel,
  listDailyReportAbsenceConflicts,
} from '@/renderer/lib/report-conflicts';
import {
  resolveDayKey,
  resolveInitialWeeklyReportRange,
} from '@/renderer/pages/DailyReportPage/utils/calendar-date-utils';
import { resolveAutoDayType } from '@/renderer/pages/DailyReportPage/utils/day-type-defaults';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resolveReportStartDateFromSettings } from '@/shared/settings/report-start-date';
import { resolveWeeklyReportSubmissionBlock } from '@/shared/reports/edit-locks';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type WeeklyFormState = {
  weekStart: string;
  weekEnd: string;
  area: string;
  supervisorEmail: string;
};

type WeekTrackingStatus = 'automatic' | 'manual' | 'missing';

const defaultWeeklyFormState: WeeklyFormState = {
  weekStart: '',
  weekEnd: '',
  area: '',
  supervisorEmail: '',
};

const enableWeeklyReportCopyButtons = false;

const weeklyProgressItemClasses: Record<WeekTrackingStatus, string> = {
  automatic: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  manual: 'border-sky-300 bg-sky-100 text-sky-900',
  missing: 'border-amber-300 bg-amber-100 text-amber-900',
};

const weeklyProgressDotClasses: Record<WeekTrackingStatus, string> = {
  automatic: 'bg-emerald-500',
  manual: 'bg-sky-500',
  missing: 'bg-amber-500',
};

function resolveWeekdayTranslationKey(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return 'reportsOverview.table.weekdays.monday';
  }

  const day = parsed.getUTCDay();

  if (day === 0) {
    return 'reportsOverview.table.weekdays.sunday';
  }
  if (day === 1) {
    return 'reportsOverview.table.weekdays.monday';
  }
  if (day === 2) {
    return 'reportsOverview.table.weekdays.tuesday';
  }
  if (day === 3) {
    return 'reportsOverview.table.weekdays.wednesday';
  }
  if (day === 4) {
    return 'reportsOverview.table.weekdays.thursday';
  }
  if (day === 5) {
    return 'reportsOverview.table.weekdays.friday';
  }

  return 'reportsOverview.table.weekdays.saturday';
}

function resolveWeekTrackingStatus(values: unknown): WeekTrackingStatus {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return 'manual';
  }

  const { entryMode } = values as Record<string, unknown>;

  return entryMode === 'automatic' ? 'automatic' : 'manual';
}

function createWeeklyReportRoute(weekStart: string, weekEnd: string): string {
  return `${appRoutes.weeklyReport}?weekStart=${encodeURIComponent(weekStart)}&weekEnd=${encodeURIComponent(weekEnd)}`;
}

function createSendWeeklyReportRoute(
  weekStart: string,
  weekEnd: string,
): string {
  return `${appRoutes.sendWeeklyReport}?weekStart=${encodeURIComponent(weekStart)}&weekEnd=${encodeURIComponent(weekEnd)}`;
}

function createDailyReportRoute(date: string): string {
  return `${appRoutes.dailyReport}?date=${encodeURIComponent(date)}`;
}

export default function WeeklyReportPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const reportsState = useReportsState();
  const refreshReportsState = reportsState.refresh;
  const settingsSnapshot = useSettingsSnapshot();
  const [form, setForm] = useState<WeeklyFormState>(defaultWeeklyFormState);
  const [isPending, setIsPending] = useState(false);
  const [isAutoFillingWeek, setIsAutoFillingWeek] = useState(false);
  const [isSendOrderDialogOpen, setIsSendOrderDialogOpen] = useState(false);

  const settingsValues = useMemo(
    () => settingsSnapshot.value?.values ?? {},
    [settingsSnapshot.value?.values],
  );
  const today = toLocalIsoDate(new Date());

  const reportStartDate = useMemo(
    () => resolveReportStartDateFromSettings(settingsValues),
    [settingsValues],
  );
  const onboardingWorkplace = useMemo(
    () => parseOnboardingWorkplace(settingsValues),
    [settingsValues],
  );
  const trainingPeriod = useMemo(
    () => parseOnboardingTrainingPeriod(settingsValues),
    [settingsValues],
  );
  const uiSettings = useMemo(
    () => parseUiSettings(settingsValues),
    [settingsValues],
  );
  const allowEarlyWeeklyReportSubmission =
    uiSettings.allowEarlyWeeklyReportSubmission;
  const absenceSettings = useMemo(
    () => parseAbsenceSettings(settingsValues),
    [settingsValues],
  );
  const subdivisionCode = useMemo(
    () => resolveOnboardingSubdivisionCode(settingsValues),
    [settingsValues],
  );
  const requestedWeekRange = useMemo(() => {
    const search = new URLSearchParams(location.search);
    const weekStart = search.get('weekStart');
    const weekEnd = search.get('weekEnd');

    if (
      !weekStart ||
      !weekEnd ||
      !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(weekEnd)
    ) {
      return null;
    }

    return {
      weekStart,
      weekEnd,
    };
  }, [location.search]);
  const currentWeeklyReport = useMemo(() => {
    if (!reportsState.value || !form.weekStart || !form.weekEnd) {
      return null;
    }

    return (
      Object.values(reportsState.value.weeklyReports).find(
        (weeklyReport) =>
          weeklyReport.weekStart === form.weekStart &&
          weeklyReport.weekEnd === form.weekEnd,
      ) ?? null
    );
  }, [form.weekEnd, form.weekStart, reportsState.value]);
  const currentDailyReports = useMemo(() => {
    if (!reportsState.value || !currentWeeklyReport) {
      return [];
    }

    return currentWeeklyReport.dailyReportIds
      .map((dailyReportId) => reportsState.value?.dailyReports[dailyReportId])
      .filter((dailyReport): dailyReport is NonNullable<typeof dailyReport> =>
        Boolean(dailyReport),
      )
      .sort((left, right) => left.date.localeCompare(right.date));
  }, [currentWeeklyReport, reportsState.value]);
  const weeklyDocumentTranslations = useMemo(
    () => createWeeklyDocumentTranslations(t),
    [t],
  );
  const weeklyDocumentSections = useMemo(
    () =>
      buildWeeklyDocumentSections({
        dailyReports: currentDailyReports,
        translations: weeklyDocumentTranslations,
      }),
    [currentDailyReports, weeklyDocumentTranslations],
  );
  const currentWeeklyValues = useMemo(
    () => parseWeeklyReportValues(currentWeeklyReport?.values),
    [currentWeeklyReport?.values],
  );
  const weeklySubmissionBlock = useMemo(() => {
    if (!reportsState.value || !currentWeeklyReport) {
      return null;
    }

    return resolveWeeklyReportSubmissionBlock({
      reportsState: reportsState.value,
      reportStartDate,
      weekStart: currentWeeklyReport.weekStart,
      weekEnd: currentWeeklyReport.weekEnd,
      today,
      allowEarlySubmission: allowEarlyWeeklyReportSubmission,
    });
  }, [
    allowEarlyWeeklyReportSubmission,
    currentWeeklyReport,
    reportStartDate,
    reportsState.value,
    today,
  ]);
  const sendOrderBlocksCurrentWeek =
    weeklySubmissionBlock?.kind === 'previous-week-unsubmitted' &&
    !currentWeeklyValues.submitted;
  const futureWeekBlocksCurrentWeek =
    weeklySubmissionBlock?.kind === 'future-week' &&
    !currentWeeklyValues.submitted;
  const blockingUnsubmittedWeek =
    weeklySubmissionBlock?.kind === 'previous-week-unsubmitted'
      ? weeklySubmissionBlock.blockingWeek
      : null;
  const dailyConflicts = useMemo(() => {
    if (!currentDailyReports.length || currentWeeklyValues.submitted) {
      return [];
    }

    return listDailyReportAbsenceConflicts({
      dailyReports: currentDailyReports,
      absenceSettings,
    });
  }, [absenceSettings, currentDailyReports, currentWeeklyValues.submitted]);
  const weekDates = useMemo(
    () =>
      form.weekStart && form.weekEnd
        ? listWeekDates(form.weekStart, form.weekEnd)
        : [],
    [form.weekEnd, form.weekStart],
  );
  const reportsByDate = useMemo(
    () => new Map(currentDailyReports.map((entry) => [entry.date, entry])),
    [currentDailyReports],
  );
  const weekTracking = useMemo(
    () =>
      weekDates.map((date) => {
        const dailyReport = reportsByDate.get(date);

        if (!dailyReport) {
          return { date, status: 'missing' as WeekTrackingStatus };
        }

        return {
          date,
          status: resolveWeekTrackingStatus(dailyReport.values),
        };
      }),
    [reportsByDate, weekDates],
  );
  const weekTrackingCounts = useMemo(
    () =>
      weekTracking.reduce<Record<WeekTrackingStatus, number>>(
        (current, entry) => {
          current[entry.status] += 1;
          return current;
        },
        {
          automatic: 0,
          manual: 0,
          missing: 0,
        },
      ),
    [weekTracking],
  );
  const reportedDateSet = useMemo(
    () => new Set(currentDailyReports.map((entry) => entry.date)),
    [currentDailyReports],
  );
  const trackedDaysCount = useMemo(
    () => weekDates.filter((date) => reportedDateSet.has(date)).length,
    [reportedDateSet, weekDates],
  );
  const isWeekComplete = weekDates.length === 7 && trackedDaysCount === 7;
  const fallbackArea =
    uiSettings.defaultDepartment || onboardingWorkplace.department || '';
  const fallbackSupervisor =
    uiSettings.supervisorEmailPrimary || onboardingWorkplace.trainerEmail || '';
  const hasEditableChanges = useMemo(() => {
    const parsed = currentWeeklyReport
      ? parseWeeklyReportValues(currentWeeklyReport.values)
      : parseWeeklyReportValues({});
    const referenceArea = parsed.area || fallbackArea;
    const referenceSupervisor =
      parsed.supervisorEmailPrimary || fallbackSupervisor;

    return (
      form.area.trim() !== referenceArea.trim() ||
      form.supervisorEmail.trim() !== referenceSupervisor.trim()
    );
  }, [
    currentWeeklyReport,
    fallbackArea,
    fallbackSupervisor,
    form.area,
    form.supervisorEmail,
  ]);
  function resolveSaveDisabledReason() {
    if (isPending) {
      return t('common.disabledReasons.pending');
    }
    if (currentWeeklyValues.submitted) {
      return t('common.disabledReasons.submittedReport');
    }
    if (!form.weekStart || !form.weekEnd) {
      return t('common.disabledReasons.missingWeek');
    }
    if (!hasEditableChanges) {
      return t('common.disabledReasons.noChanges');
    }

    return undefined;
  }

  function resolveResetDisabledReason() {
    if (isPending) {
      return t('common.disabledReasons.pending');
    }
    if (currentWeeklyValues.submitted) {
      return t('common.disabledReasons.submittedReport');
    }
    if (!hasEditableChanges) {
      return t('common.disabledReasons.noChanges');
    }

    return undefined;
  }

  function resolveExportPdfDisabledReason() {
    if (isPending) {
      return t('common.disabledReasons.pending');
    }
    if (!isWeekComplete) {
      return t('common.disabledReasons.incompleteWeekPdf');
    }

    return undefined;
  }

  function resolveSendDisabledReason() {
    if (isPending) {
      return t('common.disabledReasons.pending');
    }
    if (currentWeeklyValues.submitted) {
      return t('common.disabledReasons.submittedReport');
    }
    if (!isWeekComplete) {
      return t('common.disabledReasons.incompleteWeekSend');
    }
    if (futureWeekBlocksCurrentWeek) {
      return t('common.disabledReasons.futureWeekSend');
    }
    if (sendOrderBlocksCurrentWeek) {
      return t('common.disabledReasons.sendOrderBlocked');
    }

    return undefined;
  }

  const saveDisabledReason = resolveSaveDisabledReason();
  const resetDisabledReason = resolveResetDisabledReason();
  const exportPdfDisabledReason = resolveExportPdfDisabledReason();
  const sendDisabledReason = resolveSendDisabledReason();
  const copyActionLabel = t('weeklyReport.actions.copy');
  const areaLabel = t('weeklyReport.form.area');
  const supervisorEmailLabel = t('weeklyReport.form.supervisorEmail');

  useEffect(() => {
    if (!requestedWeekRange || !reportsState.value) {
      return;
    }

    setForm((current) => {
      if (
        current.weekStart === requestedWeekRange.weekStart &&
        current.weekEnd === requestedWeekRange.weekEnd
      ) {
        return current;
      }

      return {
        ...current,
        weekStart: requestedWeekRange.weekStart,
        weekEnd: requestedWeekRange.weekEnd,
      };
    });
  }, [reportsState.value, requestedWeekRange]);

  useEffect(() => {
    if (form.weekStart && form.weekEnd) {
      return;
    }

    if (!settingsSnapshot.value) {
      return;
    }

    const weekRange = resolveInitialWeeklyReportRange({
      reportsState: reportsState.value ?? null,
      reportStartDate,
    });

    setForm((current) => ({
      ...current,
      weekStart: weekRange.weekStart,
      weekEnd: weekRange.weekEnd,
      area: current.area || fallbackArea,
      supervisorEmail: current.supervisorEmail || fallbackSupervisor,
    }));
  }, [
    fallbackArea,
    fallbackSupervisor,
    form.weekEnd,
    form.weekStart,
    reportStartDate,
    reportsState.value,
    settingsSnapshot.value,
  ]);

  useEffect(() => {
    if (!currentWeeklyReport) {
      return;
    }

    setForm((current) => ({
      ...current,
      area: currentWeeklyValues.area || fallbackArea,
      supervisorEmail:
        currentWeeklyValues.supervisorEmailPrimary || fallbackSupervisor,
    }));
  }, [
    currentWeeklyReport,
    currentWeeklyValues.area,
    currentWeeklyValues.supervisorEmailPrimary,
    fallbackArea,
    fallbackSupervisor,
  ]);

  useEffect(() => {
    if (!form.area.trim() || !form.supervisorEmail.trim()) {
      setForm((current) => ({
        ...current,
        area: current.area.trim() ? current.area : fallbackArea,
        supervisorEmail: current.supervisorEmail.trim()
          ? current.supervisorEmail
          : fallbackSupervisor,
      }));
    }
  }, [fallbackArea, fallbackSupervisor, form.area, form.supervisorEmail]);

  useEffect(() => {
    if (
      !runtime.api ||
      !form.weekStart ||
      !form.weekEnd ||
      !weekDates.length ||
      !subdivisionCode ||
      isAutoFillingWeek ||
      currentWeeklyValues.submitted
    ) {
      return;
    }

    const missingDates = weekDates.filter((date) => !reportedDateSet.has(date));
    const autoFillDates = missingDates.filter((date) => {
      const autoDayType = resolveAutoDayType({
        date,
        uiSettings,
        absenceSettings,
        currentYear: new Date(date).getUTCFullYear(),
      });

      return autoDayType.dayType === 'free';
    });

    if (!autoFillDates.length) {
      return;
    }

    async function applyAutoFill() {
      if (!runtime.api) {
        return;
      }

      setIsAutoFillingWeek(true);
      try {
        await Promise.all(
          autoFillDates.map((date) => {
            const autoDayType = resolveAutoDayType({
              date,
              uiSettings,
              absenceSettings,
              currentYear: new Date(date).getUTCFullYear(),
            });
            const dayKey = resolveDayKey(date);
            const freeDayCategory =
              dayKey && isSchoolDayFromTimetable(uiSettings, dayKey)
                ? 'school'
                : 'work';

            return runtime.api!.upsertDailyReport({
              weekStart: form.weekStart,
              weekEnd: form.weekEnd,
              date,
              values: {
                entryMode: 'automatic',
                dayType: autoDayType.dayType,
                freeReason: autoDayType.freeReason,
                freeDayCategory,
                activities: [],
                trainings: [],
                schoolTopics: [],
                lessons: [],
              },
            });
          }),
        );
        await refreshReportsState();
        notifyReportsStateChanged();
      } catch {
        toast.error(t('weeklyReport.notifications.autoFillFailed'));
      } finally {
        setIsAutoFillingWeek(false);
      }
    }

    applyAutoFill();
  }, [
    absenceSettings,
    form.weekEnd,
    form.weekStart,
    isAutoFillingWeek,
    reportedDateSet,
    refreshReportsState,
    runtime.api,
    subdivisionCode,
    t,
    toast,
    uiSettings,
    weekDates,
    currentWeeklyValues.submitted,
  ]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();

    if (!runtime.api || !form.weekStart || !form.weekEnd) {
      return;
    }

    setIsPending(true);
    try {
      await runtime.api.upsertWeeklyReport({
        weekStart: form.weekStart,
        weekEnd: form.weekEnd,
        values: {
          area: form.area.trim() || null,
          supervisorEmailPrimary: form.supervisorEmail.trim() || null,
        },
      });
      await refreshReportsState();
      notifyReportsStateChanged();

      toast.success(t('weeklyReport.notifications.saved'));
    } catch {
      toast.error(t('weeklyReport.notifications.saveFailed'));
    } finally {
      setIsPending(false);
    }
  };

  const onReset = () => {
    if (!currentWeeklyReport) {
      setForm((current) => ({
        ...current,
        area: fallbackArea,
        supervisorEmail: fallbackSupervisor,
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      area: currentWeeklyValues.area || fallbackArea,
      supervisorEmail:
        currentWeeklyValues.supervisorEmailPrimary || fallbackSupervisor,
    }));
  };

  const openOldestUnsubmittedWeek = () => {
    if (!blockingUnsubmittedWeek) {
      return;
    }

    setIsSendOrderDialogOpen(false);
    navigate(
      createWeeklyReportRoute(
        blockingUnsubmittedWeek.weekStart,
        blockingUnsubmittedWeek.weekEnd,
      ),
    );
  };

  const openIhkLink = () => {
    if (!onboardingWorkplace.ihkLink) {
      return;
    }

    window.open(onboardingWorkplace.ihkLink, '_blank', 'noopener,noreferrer');
  };

  const handleSendClick = () => {
    if (!form.weekStart || !form.weekEnd) {
      return;
    }

    if (sendOrderBlocksCurrentWeek) {
      setIsSendOrderDialogOpen(true);
      return;
    }

    if (futureWeekBlocksCurrentWeek) {
      return;
    }

    openIhkLink();
    navigate(createSendWeeklyReportRoute(form.weekStart, form.weekEnd));
  };

  const copyText = useCallback(
    async (label: string, value: string) => {
      try {
        await navigator.clipboard.writeText(
          value.trim() || t('weeklyDocument.emptyValue'),
        );
        toast.success(t('weeklyReport.notifications.copied'), label);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('weeklyReport.notifications.copyFailed'), message);
      }
    },
    [t, toast],
  );

  const handleCopyArea = useCallback(() => {
    copyText(areaLabel, form.area.trim() || fallbackArea.trim());
  }, [areaLabel, copyText, fallbackArea, form.area]);

  const handleCopySupervisorEmail = useCallback(() => {
    copyText(
      supervisorEmailLabel,
      form.supervisorEmail.trim() || fallbackSupervisor.trim(),
    );
  }, [
    copyText,
    fallbackSupervisor,
    form.supervisorEmail,
    supervisorEmailLabel,
  ]);

  const handleCopySection = useCallback(
    (sectionIndex: number) => {
      const section = weeklyDocumentSections[sectionIndex];

      if (!section) {
        return;
      }

      const content = section.entries.length
        ? serializeWeeklyDocumentSectionEntries(section.entries)
        : section.emptyValue;

      copyText(section.title, content);
    },
    [copyText, weeklyDocumentSections],
  );

  return (
    <div className="space-y-6">
      <WeeklyReportStickyHeader
        weekStart={form.weekStart}
        weekEnd={form.weekEnd}
        reportStartDate={reportStartDate}
        trainingEnd={trainingPeriod.trainingEnd}
        isSubmitted={currentWeeklyValues.submitted}
        onNavigateWeek={(weekRange) => {
          navigate(
            createWeeklyReportRoute(weekRange.weekStart, weekRange.weekEnd),
          );
        }}
      />
      <SectionCard className="border-primary-tint bg-white">
        {weekTracking.length ? (
          <div className="mb-4 space-y-3 rounded-lg border border-primary-tint/70 bg-primary-tint/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-text-color">
                {t('weeklyReport.progress.title')}
              </p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
                  currentWeeklyValues.submitted
                    ? 'bg-primary text-primary-contrast'
                    : 'bg-primary-tint/90 text-white'
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    currentWeeklyValues.submitted
                      ? 'bg-emerald-400/50'
                      : 'bg-amber-400/50'
                  }`}
                />
                {t(
                  currentWeeklyValues.submitted
                    ? 'weeklyReport.status.submitted'
                    : 'weeklyReport.status.pending',
                )}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekTracking.map((entry) => (
                <div
                  key={entry.date}
                  className={`rounded-md border px-2 py-1.5 text-center ${weeklyProgressItemClasses[entry.status]}`}
                  aria-label={t('weeklyReport.progress.dayState', {
                    day: formatGermanDate(entry.date),
                    status: t(`weeklyReport.progress.states.${entry.status}`),
                  })}
                >
                  <p className="text-[11px] font-medium leading-none">
                    {t(resolveWeekdayTranslationKey(entry.date))}
                  </p>
                  <p className="mt-1 text-[11px] leading-none">
                    {formatGermanDateShort(entry.date)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-text-color/80">
              {(['automatic', 'manual', 'missing'] as WeekTrackingStatus[]).map(
                (status) => (
                  <span
                    key={status}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary-tint/70 bg-white px-2 py-1"
                  >
                    <span
                      className={`size-2 rounded-full ${weeklyProgressDotClasses[status]}`}
                    />
                    {t(`weeklyReport.progress.states.${status}`)}
                    <span className="text-text-color/60">
                      ({weekTrackingCounts[status]})
                    </span>
                  </span>
                ),
              )}
            </div>
          </div>
        ) : null}
        <form onSubmit={onSave} className="space-y-4">
          <FormField id="area" label={areaLabel}>
            <div className="relative">
              <Input
                id="area"
                className="pr-10"
                value={form.area}
                onChange={(e) =>
                  setForm((current) => ({ ...current, area: e.target.value }))
                }
                disabled={currentWeeklyValues.submitted}
                placeholder={fallbackArea}
              />
              {enableWeeklyReportCopyButtons ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-text-color/60 hover:bg-primary-tint/30 hover:text-text-color"
                  aria-label={`${copyActionLabel}: ${areaLabel}`}
                  onClick={handleCopyArea}
                >
                  <FiCopy className="size-4" />
                </Button>
              ) : null}
            </div>
          </FormField>

          <FormField id="supervisorEmail" label={supervisorEmailLabel}>
            <div className="relative">
              <Input
                id="supervisorEmail"
                type="email"
                className="pr-10"
                value={form.supervisorEmail}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    supervisorEmail: e.target.value,
                  }))
                }
                disabled={currentWeeklyValues.submitted}
                placeholder={fallbackSupervisor}
              />
              {enableWeeklyReportCopyButtons ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-text-color/60 hover:bg-primary-tint/30 hover:text-text-color"
                  aria-label={`${copyActionLabel}: ${supervisorEmailLabel}`}
                  onClick={handleCopySupervisorEmail}
                >
                  <FiCopy className="size-4" />
                </Button>
              ) : null}
            </div>
          </FormField>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              disabled={
                isPending ||
                !form.weekStart ||
                !form.weekEnd ||
                !hasEditableChanges ||
                currentWeeklyValues.submitted
              }
              disabledReason={saveDisabledReason}
            >
              <FiSave className="mr-2 h-4 w-4" />
              {t('weeklyReport.actions.save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={
                isPending ||
                !hasEditableChanges ||
                currentWeeklyValues.submitted
              }
              disabledReason={resetDisabledReason}
              onClick={onReset}
            >
              <FiRotateCcw className="mr-2 h-4 w-4" />
              {t('weeklyReport.actions.reset')}
            </Button>
            {currentWeeklyReport && (
              <Button
                type="button"
                variant="outline"
                disabled={isPending || !isWeekComplete}
                disabledReason={exportPdfDisabledReason}
                onClick={() =>
                  navigate(
                    `${appRoutes.weeklyReportPdf}?weekStart=${form.weekStart}&weekEnd=${form.weekEnd}`,
                  )
                }
              >
                <FiFileText className="mr-2 h-4 w-4" />
                {t('weeklyReport.actions.exportPdf')}
              </Button>
            )}
            {currentWeeklyReport && (
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isPending ||
                  !isWeekComplete ||
                  currentWeeklyValues.submitted ||
                  futureWeekBlocksCurrentWeek ||
                  sendOrderBlocksCurrentWeek
                }
                disabledReason={sendDisabledReason}
                className="bg-slate-700 text-white hover:bg-slate-800"
                onClick={handleSendClick}
              >
                <FiSend className="mr-2 h-4 w-4" />
                {t('weeklyReport.actions.send')}
              </Button>
            )}
          </div>
        </form>
      </SectionCard>
      {dailyConflicts.length ? (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <FiAlertTriangle className="size-4" />
          <AlertTitle>
            {t('reportConflicts.weeklyTitle', {
              count: dailyConflicts.length,
            })}
          </AlertTitle>
          <AlertDescription>
            <p>{t('reportConflicts.weeklyDescription')}</p>
            <ul className="list-disc pl-5">
              {dailyConflicts.map((conflict) => (
                <li key={conflict.date}>
                  {t('reportConflicts.weeklyItem', {
                    date: formatGermanDate(conflict.date),
                    stored: formatConflictDayTypeLabel(t, {
                      dayType: conflict.storedDayType,
                      freeReason: conflict.storedFreeReason,
                    }),
                    expected: formatConflictDayTypeLabel(t, {
                      dayType: conflict.expectedDayType,
                      freeReason: conflict.expectedFreeReason,
                    }),
                    reason: formatConflictReasonLabel(t, conflict.reason),
                  })}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <WeeklyReportSectionCards
        sections={weeklyDocumentSections}
        copyActionLabel={
          enableWeeklyReportCopyButtons ? copyActionLabel : undefined
        }
        onCopySection={
          enableWeeklyReportCopyButtons ? handleCopySection : undefined
        }
        getEntryRoute={createDailyReportRoute}
      />

      <Dialog
        open={isSendOrderDialogOpen}
        onOpenChange={setIsSendOrderDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('weeklyReport.sendOrderDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('weeklyReport.sendOrderDialog.description')}
            </DialogDescription>
          </DialogHeader>
          {blockingUnsubmittedWeek ? (
            <p className="rounded-md border border-primary-tint/70 bg-primary-tint/15 p-3 text-sm text-text-color">
              {t('weeklyReport.sendOrderDialog.oldestWeek', {
                start: formatGermanDate(blockingUnsubmittedWeek.weekStart),
                end: formatGermanDate(blockingUnsubmittedWeek.weekEnd),
              })}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button type="button" onClick={openOldestUnsubmittedWeek}>
              {t('weeklyReport.sendOrderDialog.openOldest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
