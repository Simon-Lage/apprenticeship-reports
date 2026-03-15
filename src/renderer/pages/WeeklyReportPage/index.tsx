import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

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
  parseOnboardingTrainingPeriod,
  parseOnboardingWorkplace,
} from '@/renderer/lib/app-settings';
import {
  buildWeeklyAggregates,
  listWeeksWithDailyReports,
  parseWeeklyReportValues,
  WeekWithReports,
} from '@/renderer/lib/report-values';
import { resolveWeekRangeForDate } from '@/renderer/pages/DailyReportPage/components/date-logic';
import { Badge } from '@/components/ui/badge';
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
  const runtime = useAppRuntime();
  const toast = useToastController();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();
  const [form, setForm] = useState<WeeklyFormState>(defaultWeeklyFormState);
  const [isPending, setIsPending] = useState(false);

  const trainingPeriod = useMemo(
    () => parseOnboardingTrainingPeriod(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const onboardingWorkplace = useMemo(
    () => parseOnboardingWorkplace(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
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
      area: current.area || onboardingWorkplace.department || '',
      supervisorEmail:
        current.supervisorEmail || onboardingWorkplace.trainerEmail || '',
    }));
  }, [
    form.weekEnd,
    form.weekStart,
    onboardingWorkplace.department,
    onboardingWorkplace.trainerEmail,
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
      area: parsed.area || onboardingWorkplace.department || current.area,
      supervisorEmail:
        parsed.supervisorEmailPrimary ||
        onboardingWorkplace.trainerEmail ||
        current.supervisorEmail,
    }));
  }, [
    currentWeek,
    onboardingWorkplace.department,
    onboardingWorkplace.trainerEmail,
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
      area: parsed.area || onboardingWorkplace.department || '',
      supervisorEmail:
        parsed.supervisorEmailPrimary || onboardingWorkplace.trainerEmail || '',
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
              <p>
                <strong>{t('weeklyReport.meta.weekRange')}:</strong>{' '}
                {form.weekStart && form.weekEnd
                  ? `${form.weekStart} - ${form.weekEnd}`
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
                <Badge className="bg-primary-tint text-text-color">
                  {currentWeek.dailyReports.length}{' '}
                  {t('weeklyReport.meta.daysTracked')}
                </Badge>
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
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-primary-tint"
              onClick={() => {
                handleReset();
              }}
            >
              {t('weeklyReport.actions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isPending || !currentWeek}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
            >
              {isPending ? t('common.loading') : t('weeklyReport.actions.save')}
            </Button>
            <Button
              asChild
              type="button"
              variant="outline"
              className="border-primary-tint"
            >
              <Link to={appRoutes.weeklyReportPdf}>
                {t('weeklyReport.actions.exportPdf')}
              </Link>
            </Button>
            <Button
              asChild
              type="button"
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
            >
              <Link to={appRoutes.sendWeeklyReport}>
                {t('weeklyReport.actions.send')}
              </Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
