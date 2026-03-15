import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import { parseUiSettings } from '@/renderer/lib/app-settings';
import {
  collectActivitySuggestions,
  dayTypeValues,
  DayTypeValue,
  normalizeLessons,
  parseDailyReportValues,
} from '@/renderer/lib/report-values';
import {
  DailyReportFormState,
  defaultDailyReportFormState,
  toDayKey,
} from '@/renderer/pages/DailyReportPage/components/form-model';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function DailyReportPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();
  const [form, setForm] = useState<DailyReportFormState>(
    defaultDailyReportFormState,
  );
  const [isPending, setIsPending] = useState(false);

  const uiSettings = useMemo(
    () => parseUiSettings(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const suggestions = useMemo(
    () =>
      reportsState.value
        ? collectActivitySuggestions(reportsState.value, form.dayType)
        : [],
    [form.dayType, reportsState.value],
  );

  const currentDailyReport = useMemo(() => {
    if (!reportsState.value || !form.weekStart || !form.weekEnd || !form.date) {
      return null;
    }
    const weeklyReport = Object.values(reportsState.value.weeklyReports).find(
      (report) =>
        report.weekStart === form.weekStart && report.weekEnd === form.weekEnd,
    );
    if (!weeklyReport) {
      return null;
    }
    return weeklyReport.dailyReportIds
      .map((dailyReportId) => reportsState.value?.dailyReports[dailyReportId])
      .find((dailyReport) => dailyReport?.date === form.date);
  }, [form.date, form.weekEnd, form.weekStart, reportsState.value]);

  useEffect(() => {
    if (!currentDailyReport) {
      return;
    }
    const parsed = parseDailyReportValues(currentDailyReport.values);
    setForm((current) => ({
      ...current,
      dayType: parsed.dayType,
      freeReason: parsed.freeReason,
      activities: parsed.activities,
      trainings: parsed.trainings,
      schoolTopics: parsed.schoolTopics,
      lessons: parsed.lessons,
    }));
  }, [currentDailyReport]);

  useEffect(() => {
    if (form.dayType !== 'school' || form.lessons.length > 0 || !form.date) {
      return;
    }
    const dayKey = toDayKey(form.date);
    if (!dayKey) {
      return;
    }
    const preset = uiSettings.timetable[dayKey].map((slot) => ({
      ...slot,
      topic: '',
    }));
    setForm((current) => ({ ...current, lessons: preset }));
  }, [form.date, form.dayType, form.lessons.length, uiSettings.timetable]);

  function appendListValue(
    key: 'activities' | 'trainings' | 'schoolTopics',
    draftKey: 'activityDraft' | 'trainingDraft' | 'schoolTopicDraft',
  ) {
    const draft = form[draftKey].trim();
    if (!draft.length) {
      return;
    }
    if (form[key].includes(draft)) {
      return;
    }
    setForm((current) => ({
      ...current,
      [key]: [...current[key], draft],
      [draftKey]: '',
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runtime.api) {
      return;
    }

    if (!form.weekStart || !form.weekEnd || !form.date) {
      toast.error(t('dailyReport.feedback.missingDates'));
      return;
    }

    setIsPending(true);

    try {
      const values = {
        dayType: form.dayType,
        freeReason: form.dayType === 'free' ? form.freeReason.trim() : '',
        activities: form.activities,
        trainings: form.trainings,
        schoolTopics: form.dayType === 'work' ? [] : form.schoolTopics,
        lessons:
          form.dayType === 'school' ? normalizeLessons(form.lessons) : [],
      };

      await runtime.api.upsertDailyReport({
        weekStart: form.weekStart,
        weekEnd: form.weekEnd,
        date: form.date,
        values,
      });
      await runtime.refresh();
      await reportsState.refresh();
      toast.success(t('dailyReport.feedback.saved'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('dailyReport.feedback.saveError'), message);
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!runtime.api || !currentDailyReport) {
      return;
    }

    setIsPending(true);

    try {
      await runtime.api.deleteDailyReport({
        weekStart: form.weekStart,
        weekEnd: form.weekEnd,
        date: form.date,
      });
      await runtime.refresh();
      await reportsState.refresh();
      setForm((current) => ({
        ...current,
        dayType: 'work',
        freeReason: '',
        activities: [],
        trainings: [],
        schoolTopics: [],
        lessons: [],
      }));
      toast.info(t('dailyReport.feedback.deleted'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('dailyReport.feedback.saveError'), message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('dailyReport.title')}
        description={t('dailyReport.description')}
      />
      <form className="space-y-4 pb-24" onSubmit={handleSubmit}>
        <SectionCard
          title={t('dailyReport.meta.title')}
          description={t('dailyReport.meta.description')}
          className="border-primary-tint bg-white"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FormField id="week-start" label={t('dailyReport.meta.weekStart')}>
              <Input
                id="week-start"
                type="date"
                value={form.weekStart}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    weekStart: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField id="week-end" label={t('dailyReport.meta.weekEnd')}>
              <Input
                id="week-end"
                type="date"
                value={form.weekEnd}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    weekEnd: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField id="report-date" label={t('dailyReport.meta.date')}>
              <Input
                id="report-date"
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField id="day-type" label={t('dailyReport.meta.dayType')}>
              <select
                id="day-type"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={form.dayType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dayType: event.target.value as DayTypeValue,
                  }))
                }
              >
                {dayTypeValues.map((dayType) => (
                  <option key={dayType} value={dayType}>
                    {t(`dailyReport.dayTypes.${dayType}`)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </SectionCard>
        {form.dayType === 'free' ? (
          <SectionCard
            title={t('dailyReport.freeDay.title')}
            className="border-primary-tint bg-white"
          >
            <FormField id="free-reason" label={t('dailyReport.freeDay.reason')}>
              <Textarea
                id="free-reason"
                value={form.freeReason}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    freeReason: event.target.value,
                  }))
                }
              />
            </FormField>
          </SectionCard>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard
                title={t('dailyReport.activities.title')}
                description={t('dailyReport.activities.description')}
                className="border-primary-tint bg-white"
              >
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={form.activityDraft}
                      list="activity-suggestions"
                      placeholder={t('dailyReport.activities.placeholder')}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          activityDraft: event.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-primary-tint"
                      onClick={() =>
                        appendListValue('activities', 'activityDraft')
                      }
                    >
                      {t('common.add')}
                    </Button>
                  </div>
                  <ul className="max-h-56 space-y-2 overflow-auto pr-1">
                    {form.activities.map((activity) => (
                      <li
                        key={activity}
                        className="flex items-center justify-between rounded-md border border-primary-tint/70 px-3 py-2 text-sm"
                      >
                        {activity}
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              activities: current.activities.filter(
                                (item) => item !== activity,
                              ),
                            }))
                          }
                        >
                          {t('common.remove')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </SectionCard>
              <SectionCard
                title={t('dailyReport.trainings.title')}
                description={t('dailyReport.trainings.description')}
                className="border-primary-tint bg-white"
              >
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={form.trainingDraft}
                      placeholder={t('dailyReport.trainings.placeholder')}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          trainingDraft: event.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-primary-tint"
                      onClick={() =>
                        appendListValue('trainings', 'trainingDraft')
                      }
                    >
                      {t('common.add')}
                    </Button>
                  </div>
                  <ul className="max-h-56 space-y-2 overflow-auto pr-1">
                    {form.trainings.map((training) => (
                      <li
                        key={training}
                        className="flex items-center justify-between rounded-md border border-primary-tint/70 px-3 py-2 text-sm"
                      >
                        {training}
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              trainings: current.trainings.filter(
                                (item) => item !== training,
                              ),
                            }))
                          }
                        >
                          {t('common.remove')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </SectionCard>
            </div>
            {form.dayType === 'school' ? (
              <SectionCard
                title={t('dailyReport.school.title')}
                description={t('dailyReport.school.description')}
                className="border-primary-tint bg-white"
              >
                <div className="max-h-[46vh] space-y-2 overflow-auto pr-1">
                  {form.lessons.map((lesson, index) => (
                    <div
                      key={`${lesson.lesson}-${lesson.subject}-${lesson.teacher}-${lesson.topic}`}
                      className="grid gap-2 rounded-md border border-primary-tint/70 p-3 md:grid-cols-4"
                    >
                      <Input
                        value={String(lesson.lesson)}
                        onChange={(event) =>
                          setForm((current) => {
                            const nextLessons = [...current.lessons];
                            nextLessons[index] = {
                              ...nextLessons[index],
                              lesson: Number(
                                event.target.value || lesson.lesson,
                              ),
                            };
                            return { ...current, lessons: nextLessons };
                          })
                        }
                      />
                      <Input
                        value={lesson.subject}
                        list="subject-suggestions"
                        onChange={(event) =>
                          setForm((current) => {
                            const nextLessons = [...current.lessons];
                            nextLessons[index] = {
                              ...nextLessons[index],
                              subject: event.target.value,
                            };
                            return { ...current, lessons: nextLessons };
                          })
                        }
                      />
                      <Input
                        value={lesson.teacher}
                        list="teacher-suggestions"
                        onChange={(event) =>
                          setForm((current) => {
                            const nextLessons = [...current.lessons];
                            nextLessons[index] = {
                              ...nextLessons[index],
                              teacher: event.target.value,
                            };
                            return { ...current, lessons: nextLessons };
                          })
                        }
                      />
                      <Input
                        value={lesson.topic}
                        placeholder={t('dailyReport.school.topicPlaceholder')}
                        onChange={(event) =>
                          setForm((current) => {
                            const nextLessons = [...current.lessons];
                            nextLessons[index] = {
                              ...nextLessons[index],
                              topic: event.target.value,
                            };
                            return { ...current, lessons: nextLessons };
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}
          </>
        )}
        <div className="sticky bottom-3 z-20 rounded-xl border border-primary-tint/75 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
            >
              {isPending ? t('common.loading') : t('dailyReport.actions.save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-primary-tint"
              disabled={!currentDailyReport || isPending}
              onClick={() => {
                handleDelete().catch(() => undefined);
              }}
            >
              {t('dailyReport.actions.delete')}
            </Button>
          </div>
        </div>
      </form>
      <datalist id="activity-suggestions">
        {suggestions.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </datalist>
      <datalist id="teacher-suggestions">
        {uiSettings.teachers.map((teacher) => (
          <option key={teacher} value={teacher}>
            {teacher}
          </option>
        ))}
      </datalist>
      <datalist id="subject-suggestions">
        {uiSettings.subjects.map((subject) => (
          <option key={subject} value={subject}>
            {subject}
          </option>
        ))}
      </datalist>
    </div>
  );
}
