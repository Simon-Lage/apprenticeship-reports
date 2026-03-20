import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiAlertTriangle,
  FiFileText,
  FiRotateCcw,
  FiSave,
  FiSend,
} from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import { appRoutes } from '@/renderer/lib/app-routes';
import {
  parseAbsenceSettings,
  resolveOnboardingSubdivisionCode,
} from '@/shared/absence/settings';
import {
  parseUiSettings,
  parseOnboardingTrainingPeriod,
  parseOnboardingWorkplace,
} from '@/renderer/lib/app-settings';
import {
  buildWeeklyAggregates,
  listWeekDates,
  parseWeeklyReportValues,
} from '@/renderer/lib/report-values';
import {
  formatConflictDayTypeLabel,
  formatConflictReasonLabel,
  listDailyReportAbsenceConflicts,
} from '@/renderer/lib/report-conflicts';
import {
  resolveDayKey,
  resolveInitialWeeklyReportRange,
} from '@/renderer/pages/DailyReportPage/components/date-logic';
import { resolveAutoDayType } from '@/renderer/pages/DailyReportPage/components/day-type-defaults';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type WeeklyFormState = {
  weekStart: string;
  weekEnd: string;
  area: string;
  supervisorEmail: string;
};

const defaultWeeklyFormState: WeeklyFormState = {
  weekStart: '',
  weekEnd: '',
  area: '',
  supervisorEmail: '',
};

function stringifyLines(values: string[]): string {
  if (!values.length) {
    return '-';
  }

  return values.join('\n');
}

function toDisplayDate(value: string): string {
  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

export default function WeeklyReportPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();
  const [form, setForm] = useState<WeeklyFormState>(defaultWeeklyFormState);
  const [isPending, setIsPending] = useState(false);
  const [isAutoFillingWeek, setIsAutoFillingWeek] = useState(false);

  const settingsValues = useMemo(
    () => settingsSnapshot.value?.values ?? {},
    [settingsSnapshot.value?.values],
  );

  const trainingPeriod = useMemo(
    () => parseOnboardingTrainingPeriod(settingsValues),
    [settingsValues],
  );
  const onboardingWorkplace = useMemo(
    () => parseOnboardingWorkplace(settingsValues),
    [settingsValues],
  );
  const uiSettings = useMemo(
    () => parseUiSettings(settingsValues),
    [settingsValues],
  );
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
  const currentAggregates = useMemo(
    () => buildWeeklyAggregates(currentDailyReports),
    [currentDailyReports],
  );
  const currentWeeklyValues = useMemo(
    () => parseWeeklyReportValues(currentWeeklyReport?.values),
    [currentWeeklyReport?.values],
  );
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

  useEffect(() => {
    if (!requestedWeekRange || !reportsState.value) {
      return;
    }

    const exists = Object.values(reportsState.value.weeklyReports).some(
      (weeklyReport) =>
        weeklyReport.weekStart === requestedWeekRange.weekStart &&
        weeklyReport.weekEnd === requestedWeekRange.weekEnd,
    );

    if (!exists) {
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
      trainingStart: trainingPeriod.trainingStart,
      reportsSince: trainingPeriod.reportsSince,
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
    trainingPeriod.reportsSince,
    trainingPeriod.trainingStart,
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
              dayKey && uiSettings.timetable[dayKey].length > 0
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('weeklyReport.title')}
        description={
          form.weekStart && form.weekEnd
            ? `${toDisplayDate(form.weekStart)} - ${toDisplayDate(form.weekEnd)}`
            : t('weeklyReport.description')
        }
      />

      <SectionCard
        title={
          form.weekStart && form.weekEnd
            ? t('weeklyReport.sections.metadata.titleWithRange', {
                start: toDisplayDate(form.weekStart),
                end: toDisplayDate(form.weekEnd),
              })
            : t('weeklyReport.sections.metadata.title')
        }
      >
        <form onSubmit={onSave} className="space-y-4">
          <FormField id="area" label={t('weeklyReport.form.area')}>
            <Input
              id="area"
              value={form.area}
              onChange={(e) =>
                setForm((current) => ({ ...current, area: e.target.value }))
              }
              disabled={currentWeeklyValues.submitted}
              placeholder={fallbackArea}
            />
          </FormField>

          <FormField
            id="supervisorEmail"
            label={t('weeklyReport.form.supervisorEmail')}
          >
            <Input
              id="supervisorEmail"
              type="email"
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
                disabled={isPending || !isWeekComplete}
                onClick={() =>
                  navigate(
                    `${appRoutes.sendWeeklyReport}?weekStart=${form.weekStart}&weekEnd=${form.weekEnd}`,
                  )
                }
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
                    date: toDisplayDate(conflict.date),
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

      <div className="grid gap-6">
        <SectionCard title={t('weeklyReport.sections.operational.title')}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-text-color/70">
            {stringifyLines(currentAggregates.workActivities)}
          </div>
        </SectionCard>

        <SectionCard title={t('weeklyReport.sections.instructional.title')}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-text-color/70">
            {stringifyLines(currentAggregates.trainings)}
          </div>
        </SectionCard>

        <SectionCard title={t('weeklyReport.sections.school.title')}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-text-color/70">
            {stringifyLines(currentAggregates.schoolTopics)}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title={t('weeklyReport.sections.summary.title')}
        description={t('weeklyReport.sections.summary.description')}
      >
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                isWeekComplete ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            />
            <span className="font-medium">
              {t('weeklyReport.stats.trackedDays', {
                count: trackedDaysCount,
                total: weekDates.length,
              })}
            </span>
          </div>
          {currentWeeklyValues.submitted && (
            <div className="flex items-center gap-2 text-primary font-medium">
              <FiFileText className="h-4 w-4" />
              {t('weeklyReport.status.submitted')}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
