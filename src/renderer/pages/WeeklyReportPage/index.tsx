import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiFileText, FiRotateCcw, FiSave, FiSend } from 'react-icons/fi';
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
  isWeekendDate,
  resolveInitialDailyReportDate,
  resolveWeekRangeForDate,
} from '@/renderer/pages/DailyReportPage/components/date-logic';
import { resolveAutoDayType } from '@/renderer/pages/DailyReportPage/components/day-type-defaults';
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

function resolveBaselineDate(input: {
  trainingStart: string | null;
  reportsSince: string | null;
}): string | null {
  if (input.reportsSince) {
    return input.reportsSince;
  }

  if (input.trainingStart) {
    return input.trainingStart;
  }

  return null;
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
  const currentWeeklyValues = useMemo(
    () =>
      currentWeeklyReport
        ? parseWeeklyReportValues(currentWeeklyReport.values)
        : null,
    [currentWeeklyReport],
  );
  const currentAggregates = useMemo(
    () => buildWeeklyAggregates(currentDailyReports),
    [currentDailyReports],
  );
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

    const initialDate = resolveInitialDailyReportDate({
      reportsState: reportsState.value ?? null,
      trainingStart: trainingPeriod.trainingStart,
      trainingEnd: trainingPeriod.trainingEnd,
      reportsSince:
        resolveBaselineDate({
          trainingStart: trainingPeriod.trainingStart,
          reportsSince: trainingPeriod.reportsSince,
        }) ?? null,
      isAutoEnteredDate: (date) =>
        resolveAutoDayType({
          date,
          uiSettings,
          absenceSettings,
          currentYear: new Date(date).getUTCFullYear(),
        }).dayType === 'free',
    });
    const weekRange = resolveWeekRangeForDate(initialDate) ?? {
      weekStart: initialDate,
      weekEnd: initialDate,
    };

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
    trainingPeriod.trainingEnd,
    trainingPeriod.trainingStart,
    reportsState.value,
    settingsSnapshot.value,
    uiSettings,
    absenceSettings,
  ]);

  useEffect(() => {
    if (!currentWeeklyReport) {
      return;
    }

    const parsed = parseWeeklyReportValues(currentWeeklyReport.values);
    setForm((current) => ({
      ...current,
      area: parsed.area || fallbackArea,
      supervisorEmail: parsed.supervisorEmailPrimary || fallbackSupervisor,
    }));
  }, [currentWeeklyReport, fallbackArea, fallbackSupervisor]);

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
      isAutoFillingWeek
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

    setIsAutoFillingWeek(true);

    (async () => {
      try {
        await Promise.all(
          autoFillDates.map(async (date) => {
            const autoDayType = resolveAutoDayType({
              date,
              uiSettings,
              absenceSettings,
              currentYear: new Date(date).getUTCFullYear(),
            });
            const weekendReason = t('weeklyReport.meta.weekendAutoReason');
            const values = {
              dayType: 'free',
              freeReason:
                autoDayType.reason.kind === 'weekend' || isWeekendDate(date)
                  ? weekendReason
                  : autoDayType.freeReason,
              activities: [],
              trainings: [],
              schoolTopics: [],
              lessons: [],
            };

            await runtime.api?.upsertDailyReport({
              weekStart: form.weekStart,
              weekEnd: form.weekEnd,
              date,
              values,
            });
          }),
        );
        await runtime.refresh();
        await reportsState.refresh();
      } finally {
        setIsAutoFillingWeek(false);
      }
    })().catch(() => undefined);
  }, [
    absenceSettings,
    form.weekEnd,
    form.weekStart,
    isAutoFillingWeek,
    reportedDateSet,
    reportsState,
    runtime,
    subdivisionCode,
    t,
    uiSettings,
    weekDates,
  ]);

  async function saveWeeklyReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runtime.api || !form.weekStart || !form.weekEnd) {
      toast.error(t('weeklyReport.feedback.missingRange'));
      return;
    }

    setIsPending(true);

    try {
      const aggregates = buildWeeklyAggregates(currentDailyReports);
      const existingValues = currentWeeklyReport
        ? parseWeeklyReportValues(currentWeeklyReport.values)
        : parseWeeklyReportValues({});

      await runtime.api.upsertWeeklyReport({
        weekStart: form.weekStart,
        weekEnd: form.weekEnd,
        values: {
          reportDate: '',
          area: form.area.trim(),
          supervisorEmailPrimary: form.supervisorEmail.trim(),
          supervisorEmailSecondary: '',
          submitted: existingValues.submitted,
          submittedToEmail: existingValues.submittedToEmail,
          workActivities: aggregates.workActivities,
          schoolTopics: aggregates.schoolTopics,
          trainings: aggregates.trainings,
          notes: '',
        },
      });
      await runtime.refresh();
      await reportsState.refresh();
      toast.success(t('weeklyReport.feedback.saved'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('weeklyReport.feedback.saveError'), message);
    } finally {
      setIsPending(false);
    }
  }

  function handleReset() {
    const parsed = currentWeeklyReport
      ? parseWeeklyReportValues(currentWeeklyReport.values)
      : parseWeeklyReportValues({});
    setForm((current) => ({
      ...current,
      area: parsed.area || fallbackArea,
      supervisorEmail: parsed.supervisorEmailPrimary || fallbackSupervisor,
    }));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('weeklyReport.title')}
        description={t('weeklyReport.description')}
      />
      <form className="space-y-4 pb-24" onSubmit={saveWeeklyReport}>
        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <SectionCard
            title={t('weeklyReport.meta.title')}
            className="border-primary-tint bg-white"
          >
            <div className="space-y-3 text-sm text-text-color">
              <p className="text-xl font-extrabold text-text-color">
                {form.weekStart && form.weekEnd
                  ? t('weeklyReport.meta.weekHeadline', {
                      start: toDisplayDate(form.weekStart),
                      end: toDisplayDate(form.weekEnd),
                    })
                  : '-'}
              </p>
              <p>
                <strong>{t('weeklyReport.meta.weekRange')}:</strong>{' '}
                {form.weekStart && form.weekEnd
                  ? `${toDisplayDate(form.weekStart)} - ${toDisplayDate(form.weekEnd)}`
                  : '-'}
              </p>
              <FormField id="weekly-area" label={t('weeklyReport.meta.area')}>
                <Input
                  id="weekly-area"
                  value={form.area}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      area: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField
                id="weekly-supervisor"
                label={t('weeklyReport.meta.supervisorPrimary')}
              >
                <Input
                  id="weekly-supervisor"
                  type="email"
                  value={form.supervisorEmail}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      supervisorEmail: event.target.value,
                    }))
                  }
                />
              </FormField>
              <p>
                <strong>{t('weeklyReport.meta.submitted')}:</strong>{' '}
                {currentWeeklyValues?.submitted
                  ? t('common.yes')
                  : t('common.no')}
              </p>
              <p className="text-base font-extrabold text-text-color">
                {t('weeklyReport.meta.daysTrackedHeadline', {
                  done: trackedDaysCount,
                  total: weekDates.length || 7,
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                {weekDates.map((date) => {
                  const isDone = reportedDateSet.has(date);

                  return (
                    <Button
                      key={date}
                      type="button"
                      size="sm"
                      variant="outline"
                      className={
                        isDone
                          ? 'border-primary bg-primary text-primary-contrast'
                          : 'border-primary-tint bg-white text-text-color'
                      }
                      onClick={() => {
                        navigate(
                          `${appRoutes.dailyReport}?date=${encodeURIComponent(date)}`,
                        );
                      }}
                    >
                      <span>{toDisplayDate(date)}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </SectionCard>
          <div className="space-y-4">
            <SectionCard
              title={t('weeklyReport.sections.work')}
              className="border-primary-tint bg-white"
            >
              <pre className="font-sans whitespace-pre-wrap text-sm text-text-color">
                {stringifyLines(currentAggregates?.workActivities ?? [])}
              </pre>
            </SectionCard>
            <SectionCard
              title={t('weeklyReport.sections.training')}
              className="border-primary-tint bg-white"
            >
              <pre className="font-sans whitespace-pre-wrap text-sm text-text-color">
                {stringifyLines(currentAggregates?.trainings ?? [])}
              </pre>
            </SectionCard>
            <SectionCard
              title={t('weeklyReport.sections.school')}
              className="border-primary-tint bg-white"
            >
              <pre className="font-sans whitespace-pre-wrap text-sm text-text-color">
                {stringifyLines(currentAggregates?.schoolTopics ?? [])}
              </pre>
            </SectionCard>
          </div>
        </div>
        <div className="sticky bottom-3 z-20 rounded-xl border border-primary-tint/75 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-primary-tint"
              disabled={!hasEditableChanges || isPending || isAutoFillingWeek}
              onClick={() => {
                handleReset();
              }}
            >
              <FiRotateCcw className="size-4" />
              {t('weeklyReport.actions.reset')}
            </Button>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <Button
                type="submit"
                disabled={
                  isPending ||
                  !form.weekStart ||
                  !form.weekEnd ||
                  isAutoFillingWeek
                }
                className="bg-primary text-primary-contrast hover:bg-primary-shade"
              >
                <FiSave className="size-4" />
                {isPending
                  ? t('common.loading')
                  : t('weeklyReport.actions.save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-primary-tint"
                disabled={!isWeekComplete || isPending || isAutoFillingWeek}
                onClick={() => {
                  navigate(appRoutes.weeklyReportPdf);
                }}
              >
                <FiFileText className="size-4" />
                {t('weeklyReport.actions.exportPdf')}
              </Button>
              <Button
                type="button"
                className="bg-primary text-primary-contrast hover:bg-primary-shade"
                disabled={!isWeekComplete || isPending || isAutoFillingWeek}
                onClick={() => {
                  navigate(appRoutes.sendWeeklyReport);
                }}
              >
                <FiSend className="size-4" />
                {t('weeklyReport.actions.send')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
