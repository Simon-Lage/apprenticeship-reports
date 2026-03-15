import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiFileText, FiRotateCcw, FiSave, FiSend } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

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
  listWeeksWithDailyReports,
  parseWeeklyReportValues,
  WeekWithReports,
} from '@/renderer/lib/report-values';
import { resolveWeekRangeForDate } from '@/renderer/pages/DailyReportPage/components/date-logic';
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

function isWeekend(dateValue: string): boolean {
  const [year, month, day] = dateValue.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const weekDay = parsed.getUTCDay();

  return weekDay === 0 || weekDay === 6;
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

function resolveInitialWeekRange(input: {
  weeksWithDailyReports: WeekWithReports[];
  baselineDate: string | null;
  now: Date;
}): { weekStart: string; weekEnd: string } {
  const baselineWeekStart = input.baselineDate
    ? (resolveWeekRangeForDate(input.baselineDate)?.weekStart ?? null)
    : null;
  const candidateWeeks = input.weeksWithDailyReports
    .filter((week) =>
      baselineWeekStart
        ? week.weeklyReport.weekStart >= baselineWeekStart
        : true,
    )
    .sort((left, right) =>
      left.weeklyReport.weekStart.localeCompare(right.weeklyReport.weekStart),
    );
  const firstUnsubmittedWeek = candidateWeeks.find((week) => {
    const parsed = parseWeeklyReportValues(week.weeklyReport.values);
    return !parsed.submitted;
  });

  if (firstUnsubmittedWeek) {
    return {
      weekStart: firstUnsubmittedWeek.weeklyReport.weekStart,
      weekEnd: firstUnsubmittedWeek.weeklyReport.weekEnd,
    };
  }

  if (candidateWeeks.length) {
    const latestWeek = candidateWeeks[candidateWeeks.length - 1];
    return {
      weekStart: latestWeek.weeklyReport.weekStart,
      weekEnd: latestWeek.weeklyReport.weekEnd,
    };
  }

  const todayIso = input.now.toISOString().slice(0, 10);
  const weekRange = resolveWeekRangeForDate(todayIso);

  if (weekRange) {
    return weekRange;
  }

  return {
    weekStart: todayIso,
    weekEnd: todayIso,
  };
}

export default function WeeklyReportPage() {
  const { t } = useTranslation();
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
  const weeksWithDailyReports = useMemo(
    () =>
      reportsState.value ? listWeeksWithDailyReports(reportsState.value) : [],
    [reportsState.value],
  );
  const currentWeek = useMemo(
    () =>
      weeksWithDailyReports.find(
        (week) =>
          week.weeklyReport.weekStart === form.weekStart &&
          week.weeklyReport.weekEnd === form.weekEnd,
      ) ?? null,
    [form.weekEnd, form.weekStart, weeksWithDailyReports],
  );
  const currentWeeklyValues = useMemo(
    () =>
      currentWeek
        ? parseWeeklyReportValues(currentWeek.weeklyReport.values)
        : null,
    [currentWeek],
  );
  const currentAggregates = useMemo(
    () =>
      currentWeek ? buildWeeklyAggregates(currentWeek.dailyReports) : null,
    [currentWeek],
  );
  const weekDates = useMemo(
    () =>
      form.weekStart && form.weekEnd
        ? listWeekDates(form.weekStart, form.weekEnd)
        : [],
    [form.weekEnd, form.weekStart],
  );
  const reportedDateSet = useMemo(
    () => new Set((currentWeek?.dailyReports ?? []).map((entry) => entry.date)),
    [currentWeek],
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
    if (!currentWeek) {
      return false;
    }

    const parsed = parseWeeklyReportValues(currentWeek.weeklyReport.values);
    const referenceArea = parsed.area || fallbackArea;
    const referenceSupervisor =
      parsed.supervisorEmailPrimary || fallbackSupervisor;

    return (
      form.area.trim() !== referenceArea.trim() ||
      form.supervisorEmail.trim() !== referenceSupervisor.trim()
    );
  }, [
    currentWeek,
    fallbackArea,
    fallbackSupervisor,
    form.area,
    form.supervisorEmail,
  ]);

  useEffect(() => {
    if (!weeksWithDailyReports.length) {
      return;
    }

    if (form.weekStart && form.weekEnd) {
      return;
    }

    const baselineDate = resolveBaselineDate({
      trainingStart: trainingPeriod.trainingStart,
      reportsSince: trainingPeriod.reportsSince,
    });
    const weekRange = resolveInitialWeekRange({
      weeksWithDailyReports,
      baselineDate,
      now: new Date(),
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
    weeksWithDailyReports,
  ]);

  useEffect(() => {
    if (!currentWeek) {
      return;
    }

    const parsed = parseWeeklyReportValues(currentWeek.weeklyReport.values);
    setForm((current) => ({
      ...current,
      area: parsed.area || fallbackArea,
      supervisorEmail: parsed.supervisorEmailPrimary || fallbackSupervisor,
    }));
  }, [currentWeek, fallbackArea, fallbackSupervisor]);

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
      !currentWeek ||
      !weekDates.length ||
      !subdivisionCode ||
      isAutoFillingWeek
    ) {
      return;
    }

    const missingDates = weekDates.filter((date) => !reportedDateSet.has(date));
    const autoFillDates = missingDates.filter((date) => {
      if (isWeekend(date)) {
        return true;
      }

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
              freeReason: isWeekend(date)
                ? weekendReason
                : autoDayType.freeReason || weekendReason,
              activities: [],
              trainings: [],
              schoolTopics: [],
              lessons: [],
            };

            await runtime.api?.upsertDailyReport({
              weekStart: currentWeek.weeklyReport.weekStart,
              weekEnd: currentWeek.weeklyReport.weekEnd,
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
    currentWeek,
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
    if (!runtime.api || !form.weekStart || !form.weekEnd || !currentWeek) {
      toast.error(t('weeklyReport.feedback.missingRange'));
      return;
    }

    setIsPending(true);

    try {
      const aggregates = buildWeeklyAggregates(currentWeek.dailyReports);
      const existingValues = parseWeeklyReportValues(
        currentWeek.weeklyReport.values,
      );

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
    if (!currentWeek) {
      return;
    }

    const parsed = parseWeeklyReportValues(currentWeek.weeklyReport.values);
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
              {currentWeek ? (
                <>
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
                </>
              ) : (
                <p className="text-text-color/70">
                  {t('weeklyReport.meta.noWeek')}
                </p>
              )}
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
                disabled={isPending || !currentWeek || isAutoFillingWeek}
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
