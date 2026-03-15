import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { useReportsState, useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
import { appRoutes } from '@/renderer/lib/app-routes';
import { parseUiSettings } from '@/renderer/lib/app-settings';
import {
  listWeeksWithDailyReports,
  parseDailyReportValues,
  parseWeeklyReportValues,
} from '@/renderer/lib/report-values';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type WeeklyFormState = {
  weekStart: string;
  weekEnd: string;
  reportDate: string;
  area: string;
  supervisorEmailPrimary: string;
  supervisorEmailSecondary: string;
  submitted: boolean;
  submittedToEmail: string;
  workActivities: string;
  schoolTopics: string;
  trainings: string;
  notes: string;
};

const defaultWeeklyFormState: WeeklyFormState = {
  weekStart: '',
  weekEnd: '',
  reportDate: '',
  area: '',
  supervisorEmailPrimary: '',
  supervisorEmailSecondary: '',
  submitted: false,
  submittedToEmail: '',
  workActivities: '',
  schoolTopics: '',
  trainings: '',
  notes: '',
};

function linesToArray(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function arrayToLines(value: string[]): string {
  return value.join('\n');
}

export default function WeeklyReportPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();
  const [form, setForm] = useState<WeeklyFormState>(defaultWeeklyFormState);
  const [isPending, setIsPending] = useState(false);

  const uiSettings = useMemo(
    () => parseUiSettings(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const weeksWithDailyReports = useMemo(
    () => (reportsState.value ? listWeeksWithDailyReports(reportsState.value) : []),
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

  useEffect(() => {
    if (!form.supervisorEmailPrimary && uiSettings.supervisorEmailPrimary) {
      setForm((current) => ({
        ...current,
        area: current.area || uiSettings.defaultDepartment,
        supervisorEmailPrimary:
          current.supervisorEmailPrimary || uiSettings.supervisorEmailPrimary,
        supervisorEmailSecondary:
          current.supervisorEmailSecondary || uiSettings.supervisorEmailSecondary,
      }));
    }
  }, [form.supervisorEmailPrimary, uiSettings.defaultDepartment, uiSettings.supervisorEmailPrimary, uiSettings.supervisorEmailSecondary]);

  useEffect(() => {
    if (!currentWeek) {
      return;
    }

    const parsed = parseWeeklyReportValues(currentWeek.weeklyReport.values);
    setForm((current) => ({
      ...current,
      reportDate: parsed.reportDate,
      area: parsed.area,
      supervisorEmailPrimary: parsed.supervisorEmailPrimary,
      supervisorEmailSecondary: parsed.supervisorEmailSecondary,
      submitted: parsed.submitted,
      submittedToEmail: parsed.submittedToEmail ?? '',
      workActivities: arrayToLines(parsed.workActivities),
      schoolTopics: arrayToLines(parsed.schoolTopics),
      trainings: arrayToLines(parsed.trainings),
      notes: parsed.notes,
    }));
  }, [currentWeek]);

  async function saveWeeklyReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runtime.api || !form.weekStart || !form.weekEnd) {
      toast.error(t('weeklyReport.feedback.missingRange'));
      return;
    }
    setIsPending(true);

    try {
      await runtime.api.upsertWeeklyReport({
        weekStart: form.weekStart,
        weekEnd: form.weekEnd,
        values: {
          reportDate: form.reportDate,
          area: form.area.trim(),
          supervisorEmailPrimary: form.supervisorEmailPrimary.trim(),
          supervisorEmailSecondary: form.supervisorEmailSecondary.trim(),
          submitted: form.submitted,
          submittedToEmail: form.submittedToEmail.trim() || null,
          workActivities: linesToArray(form.workActivities),
          schoolTopics: linesToArray(form.schoolTopics),
          trainings: linesToArray(form.trainings),
          notes: form.notes.trim(),
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

  async function registerHash() {
    if (!runtime.api || !currentWeek) {
      return;
    }

    setIsPending(true);

    try {
      await runtime.api.registerWeeklyReportHash({
        weeklyReportId: currentWeek.weeklyReport.id,
      });
      await runtime.refresh();
      toast.success(t('weeklyReport.feedback.hashRegistered'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('weeklyReport.feedback.saveError'), message);
    } finally {
      setIsPending(false);
    }
  }

  function importDailyData() {
    if (!currentWeek) {
      return;
    }
    const workActivities = new Set<string>();
    const schoolTopics = new Set<string>();
    const trainings = new Set<string>();

    currentWeek.dailyReports.forEach((dailyReport) => {
      const parsed = parseDailyReportValues(dailyReport.values);
      parsed.activities.forEach((value) => workActivities.add(value));
      parsed.schoolTopics.forEach((value) => schoolTopics.add(value));
      parsed.trainings.forEach((value) => trainings.add(value));
      parsed.lessons.forEach((lesson) => {
        if (lesson.topic.trim().length) {
          schoolTopics.add(`${lesson.subject}: ${lesson.topic}`);
        }
      });
    });

    setForm((current) => ({
      ...current,
      workActivities: arrayToLines(Array.from(workActivities)),
      schoolTopics: arrayToLines(Array.from(schoolTopics)),
      trainings: arrayToLines(Array.from(trainings)),
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('weeklyReport.title')}
        description={t('weeklyReport.description')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-primary-tint"
              onClick={importDailyData}
            >
              {t('weeklyReport.actions.importDailyData')}
            </Button>
            <Button
              type="button"
              disabled={!currentWeek || isPending}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                void registerHash();
              }}
            >
              {t('weeklyReport.actions.registerHash')}
            </Button>
            <Button asChild type="button" variant="outline" className="border-primary-tint">
              <Link to={appRoutes.weeklyReportPdf}>{t('weeklyReport.actions.openPdf')}</Link>
            </Button>
          </div>
        }
      />
      <form className="space-y-6" onSubmit={saveWeeklyReport}>
        <SectionCard
          title={t('weeklyReport.meta.title')}
          description={t('weeklyReport.meta.description')}
          className="border-primary-tint bg-white"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FormField id="week-start" label={t('weeklyReport.meta.weekStart')}>
              <Input
                id="week-start"
                type="date"
                value={form.weekStart}
                onChange={(event) =>
                  setForm((current) => ({ ...current, weekStart: event.target.value }))
                }
              />
            </FormField>
            <FormField id="week-end" label={t('weeklyReport.meta.weekEnd')}>
              <Input
                id="week-end"
                type="date"
                value={form.weekEnd}
                onChange={(event) =>
                  setForm((current) => ({ ...current, weekEnd: event.target.value }))
                }
              />
            </FormField>
            <FormField id="report-date" label={t('weeklyReport.meta.reportDate')}>
              <Input
                id="report-date"
                type="date"
                value={form.reportDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reportDate: event.target.value }))
                }
              />
            </FormField>
            <FormField id="area" label={t('weeklyReport.meta.area')}>
              <Input
                id="area"
                value={form.area}
                onChange={(event) =>
                  setForm((current) => ({ ...current, area: event.target.value }))
                }
              />
            </FormField>
            <FormField id="email-primary" label={t('weeklyReport.meta.supervisorPrimary')}>
              <Input
                id="email-primary"
                type="email"
                value={form.supervisorEmailPrimary}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    supervisorEmailPrimary: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField id="email-secondary" label={t('weeklyReport.meta.supervisorSecondary')}>
              <Input
                id="email-secondary"
                type="email"
                value={form.supervisorEmailSecondary}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    supervisorEmailSecondary: event.target.value,
                  }))
                }
              />
            </FormField>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-primary-tint/80 px-3 py-2">
              <label htmlFor="submitted" className="text-sm text-text-color">
                {t('weeklyReport.meta.submitted')}
              </label>
              <Switch
                id="submitted"
                checked={form.submitted}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, submitted: checked }))
                }
              />
            </div>
            <FormField id="submitted-email" label={t('weeklyReport.meta.submittedEmail')}>
              <Input
                id="submitted-email"
                type="email"
                value={form.submittedToEmail}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    submittedToEmail: event.target.value,
                  }))
                }
              />
            </FormField>
          </div>
        </SectionCard>
        <SectionCard title={t('weeklyReport.sections.work')} className="border-primary-tint bg-white">
          <Textarea
            value={form.workActivities}
            onChange={(event) =>
              setForm((current) => ({ ...current, workActivities: event.target.value }))
            }
            rows={5}
          />
        </SectionCard>
        <SectionCard title={t('weeklyReport.sections.school')} className="border-primary-tint bg-white">
          <Textarea
            value={form.schoolTopics}
            onChange={(event) =>
              setForm((current) => ({ ...current, schoolTopics: event.target.value }))
            }
            rows={5}
          />
        </SectionCard>
        <SectionCard title={t('weeklyReport.sections.training')} className="border-primary-tint bg-white">
          <Textarea
            value={form.trainings}
            onChange={(event) =>
              setForm((current) => ({ ...current, trainings: event.target.value }))
            }
            rows={5}
          />
        </SectionCard>
        <SectionCard title={t('weeklyReport.sections.notes')} className="border-primary-tint bg-white">
          <Textarea
            value={form.notes}
            onChange={(event) =>
              setForm((current) => ({ ...current, notes: event.target.value }))
            }
            rows={6}
          />
        </SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
          >
            {isPending ? t('common.loading') : t('weeklyReport.actions.save')}
          </Button>
          {currentWeek ? (
            <Badge className="bg-primary-tint text-text-color">
              {currentWeek.dailyReports.length} {t('weeklyReport.meta.daysTracked')}
            </Badge>
          ) : null}
        </div>
      </form>
    </div>
  );
}
