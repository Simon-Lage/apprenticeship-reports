import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { de } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  FiAlertTriangle,
  FiCalendar,
  FiEdit3,
  FiLock,
  FiRotateCcw,
  FiSave,
  FiTrash2,
} from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import DayTypeBadge from '@/renderer/components/app/DayTypeBadge';
import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import UnsavedChangesDialog from '@/renderer/components/app/UnsavedChangesDialog';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import useUnsavedChangesGuard from '@/renderer/hooks/useUnsavedChangesGuard';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import {
  parseOnboardingTrainingPeriod,
  parseUiSettings,
} from '@/renderer/lib/app-settings';
import { appRoutes } from '@/renderer/lib/app-routes';
import formatDailyReportDayTypeLabel from '@/renderer/lib/daily-report-labels';
import handleEnterAction from '@/renderer/lib/keyboard';
import {
  collectActivitySuggestions,
  dayTypeValues,
  normalizeLessons,
  parseDailyReportValues,
  parseWeeklyReportValues,
} from '@/renderer/lib/report-values';
import {
  formatConflictDayTypeLabel,
  formatConflictReasonLabel,
  resolveDailyReportAbsenceConflict,
} from '@/renderer/lib/report-conflicts';
import {
  DailyReportFormState,
  defaultDailyReportFormState,
} from '@/renderer/pages/DailyReportPage/components/form-model';
import {
  buildDailyReportCalendarStatusMap,
  isDateWithinDailyReportCalendarRange,
  resolveDailyReportCalendarRange,
} from '@/renderer/pages/DailyReportPage/components/calendar-status';
import {
  resolveDayKey,
  resolveInitialDailyReportDate,
  resolveWeekRangeForDate,
} from '@/renderer/pages/DailyReportPage/components/date-logic';
import { resolveAutoDayType } from '@/renderer/pages/DailyReportPage/components/day-type-defaults';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { parseAbsenceSettings } from '@/shared/absence/settings';

function toDisplayDate(dateValue: string): string {
  const [year, month, day] = dateValue.split('-');

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${day}.${month}.${year}`;
}

function toDisplayDateTime(dateValue: string): string {
  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function toCalendarDate(dateValue: string): Date | undefined {
  const [year, month, day] = dateValue.split('-').map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function toCalendarIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function listMissingLessonNumbers(lessons: { lesson: number }[]): number[] {
  const used = new Set(lessons.map((lesson) => lesson.lesson));

  return Array.from({ length: 10 }, (_, index) => index + 1).filter(
    (lessonNumber) => !used.has(lessonNumber),
  );
}

function listInsertOptions(input: {
  lessons: { lesson: number }[];
  insertIndex: number;
}): number[] {
  const missing = listMissingLessonNumbers(input.lessons);

  if (!missing.length) {
    return [];
  }

  const previousLesson = input.lessons[input.insertIndex - 1]?.lesson ?? 0;
  const nextLesson = input.lessons[input.insertIndex]?.lesson ?? 11;

  return missing.filter(
    (lessonNumber) =>
      lessonNumber > previousLesson && lessonNumber < nextLesson,
  );
}

function serializeDailyFormState(form: DailyReportFormState): string {
  return JSON.stringify({
    date: form.date,
    dayType: form.dayType,
    freeReason: form.freeReason,
    activities: form.activities,
    trainings: form.trainings,
    schoolTopics: form.schoolTopics,
    lessons: normalizeLessons(form.lessons),
    activityDraft: form.activityDraft,
    trainingDraft: form.trainingDraft,
    schoolTopicDraft: form.schoolTopicDraft,
  });
}

export default function DailyReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();
  const [form, setForm] = useState<DailyReportFormState>(
    defaultDailyReportFormState,
  );
  const [isPending, setIsPending] = useState(false);
  const [dragLessonNumber, setDragLessonNumber] = useState<number | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(
    undefined,
  );
  const [lessonTopicDrafts, setLessonTopicDrafts] = useState<
    Record<number, string>
  >({});
  const [lessonInsertSelection, setLessonInsertSelection] = useState<
    Record<number, number>
  >({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);

  const uiSettings = useMemo(
    () => parseUiSettings(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const trainingPeriod = useMemo(
    () => parseOnboardingTrainingPeriod(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const absenceSettings = useMemo(
    () => parseAbsenceSettings(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const selectedWeekRange = useMemo(
    () => resolveWeekRangeForDate(form.date),
    [form.date],
  );
  const requestedDate = useMemo(() => {
    const search = new URLSearchParams(location.search);
    const candidate = search.get('date');

    if (!candidate || !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
      return null;
    }

    return candidate;
  }, [location.search]);
  const autoDayType = useMemo(() => {
    if (!form.date) {
      return null;
    }

    return resolveAutoDayType({
      date: form.date,
      uiSettings,
      absenceSettings,
      currentYear: new Date(form.date).getUTCFullYear(),
    });
  }, [absenceSettings, form.date, uiSettings]);
  const autoReasonText = useMemo(() => {
    if (!autoDayType) {
      return null;
    }

    if (autoDayType.reason.kind === 'public-holiday') {
      return t('dailyReport.auto.reasonPublicHoliday', {
        name: autoDayType.reason.name,
      });
    }

    if (autoDayType.reason.kind === 'weekend') {
      return t('dailyReport.auto.reasonWeekend');
    }

    if (autoDayType.reason.kind === 'sick') {
      return t('dailyReport.auto.reasonSick', {
        name: autoDayType.reason.label ?? '-',
      });
    }

    if (autoDayType.reason.kind === 'vacation') {
      return t('dailyReport.auto.reasonVacation', {
        name: autoDayType.reason.label ?? '-',
      });
    }

    if (autoDayType.reason.kind === 'school-holiday') {
      return t('dailyReport.auto.reasonSchoolHoliday', {
        name: autoDayType.reason.name,
      });
    }

    return t(
      autoDayType.reason.base === 'school'
        ? 'dailyReport.auto.reasonBaseSchool'
        : 'dailyReport.auto.reasonBaseWork',
    );
  }, [autoDayType, t]);
  const activitySuggestions = useMemo(
    () =>
      reportsState.value
        ? collectActivitySuggestions(reportsState.value, form.dayType)
        : [],
    [form.dayType, reportsState.value],
  );
  const trainingSuggestions = useMemo(() => {
    if (!reportsState.value) {
      return [];
    }

    const values = new Set<string>();
    Object.values(reportsState.value.dailyReports).forEach((dailyReport) => {
      const parsed = parseDailyReportValues(dailyReport.values);
      parsed.trainings.forEach((training) => values.add(training));
    });

    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [reportsState.value]);
  const lessonTopicSuggestions = useMemo(() => {
    if (!reportsState.value) {
      return [];
    }

    const values = new Set<string>();
    Object.values(reportsState.value.dailyReports).forEach((dailyReport) => {
      const parsed = parseDailyReportValues(dailyReport.values);
      parsed.lessons.forEach((lesson) => {
        lesson.topics.forEach((topic) => values.add(topic));
      });
    });

    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [reportsState.value]);

  const currentWeeklyReport = useMemo(() => {
    if (!reportsState.value || !selectedWeekRange || !form.date) {
      return null;
    }

    return (
      Object.values(reportsState.value.weeklyReports).find(
        (report) =>
          report.weekStart === selectedWeekRange.weekStart &&
          report.weekEnd === selectedWeekRange.weekEnd,
      ) ?? null
    );
  }, [form.date, reportsState.value, selectedWeekRange]);
  const currentDailyReport = useMemo(() => {
    if (!reportsState.value || !currentWeeklyReport || !form.date) {
      return null;
    }

    return currentWeeklyReport.dailyReportIds
      .map((dailyReportId) => reportsState.value?.dailyReports[dailyReportId])
      .find((dailyReport) => dailyReport?.date === form.date);
  }, [currentWeeklyReport, form.date, reportsState.value]);
  const currentDailyValues = useMemo(
    () => parseDailyReportValues(currentDailyReport?.values),
    [currentDailyReport],
  );
  const isEditing = Boolean(currentDailyReport);
  const currentWeeklyValues = useMemo(
    () => parseWeeklyReportValues(currentWeeklyReport?.values),
    [currentWeeklyReport],
  );
  const isSubmittedDailyReport = Boolean(
    currentDailyReport && currentWeeklyValues.submitted,
  );
  const isContentReadOnly = isSubmittedDailyReport;
  const calendarStatusMap = useMemo(
    () => buildDailyReportCalendarStatusMap(reportsState.value ?? null),
    [reportsState.value],
  );
  const calendarRange = useMemo(
    () =>
      resolveDailyReportCalendarRange({
        reportsSince: trainingPeriod.reportsSince,
        trainingStart: trainingPeriod.trainingStart,
        trainingEnd: trainingPeriod.trainingEnd,
      }),
    [
      trainingPeriod.reportsSince,
      trainingPeriod.trainingEnd,
      trainingPeriod.trainingStart,
    ],
  );
  const selectedCalendarDate = useMemo(
    () => toCalendarDate(form.date),
    [form.date],
  );
  const dailyPageTitle = useMemo(() => {
    if (!form.date) {
      return t('dailyReport.title');
    }

    return `${formatDailyReportDayTypeLabel(t, {
      dayType: form.dayType,
      freeReason: form.freeReason,
    })} ${toDisplayDate(form.date)}`;
  }, [form.date, form.dayType, form.freeReason, t]);
  const metaCardTitle = useMemo(() => {
    if (!form.date) {
      return t('dailyReport.meta.title');
    }

    return t('dailyReport.meta.titleWithValues', {
      dayType: formatDailyReportDayTypeLabel(t, {
        dayType: form.dayType,
        freeReason: form.freeReason,
      }),
      date: toDisplayDate(form.date),
    });
  }, [form.date, form.dayType, form.freeReason, t]);
  const dailyPageDescription = useMemo(() => {
    if (!form.date) {
      return t('dailyReport.description');
    }

    if (isSubmittedDailyReport) {
      return t('dailyReport.meta.submittedDescription', {
        date: toDisplayDate(form.date),
      });
    }

    if (isEditing) {
      return t('dailyReport.meta.editingDescription', {
        date: toDisplayDate(form.date),
      });
    }

    return t('dailyReport.meta.creatingDescription', {
      date: toDisplayDate(form.date),
    });
  }, [form.date, isEditing, isSubmittedDailyReport, t]);
  const submitLabel = useMemo(() => {
    if (isPending) {
      return t('common.loading');
    }

    return isEditing
      ? t('dailyReport.actions.saveChanges')
      : t('dailyReport.actions.save');
  }, [isEditing, isPending, t]);
  const absenceConflict = useMemo(() => {
    if (!currentDailyReport || currentWeeklyValues.submitted) {
      return null;
    }

    return resolveDailyReportAbsenceConflict({
      date: currentDailyReport.date,
      values: currentDailyReport.values,
      absenceSettings,
    });
  }, [absenceSettings, currentDailyReport, currentWeeklyValues.submitted]);
  const activeStatusBanner = useMemo(() => {
    if (!form.date || !currentDailyReport) {
      return null;
    }

    if (isSubmittedDailyReport) {
      return {
        tone: 'submitted' as const,
        icon: FiLock,
        title: t('dailyReport.status.submittedTitle'),
        description: t('dailyReport.status.submittedDescription'),
        meta: currentWeeklyReport?.updatedAt
          ? t('dailyReport.status.submittedAt', {
              date: toDisplayDateTime(currentWeeklyReport.updatedAt),
            })
          : null,
      };
    }

    return {
      tone: 'editing' as const,
      icon: FiEdit3,
      title: t('dailyReport.status.editingTitle'),
      description: t('dailyReport.status.editingDescription', {
        date: toDisplayDate(form.date),
      }),
      meta: null,
    };
  }, [
    currentDailyReport,
    currentWeeklyReport?.updatedAt,
    form.date,
    isSubmittedDailyReport,
    t,
  ]);
  const baselineFormSnapshot = useMemo(() => {
    if (!form.date) {
      return serializeDailyFormState(defaultDailyReportFormState);
    }

    if (currentDailyReport) {
      return serializeDailyFormState({
        ...defaultDailyReportFormState,
        date: currentDailyReport.date,
        dayType: currentDailyValues.dayType,
        freeReason: currentDailyValues.freeReason,
        activities: currentDailyValues.activities,
        trainings: currentDailyValues.trainings,
        schoolTopics: currentDailyValues.schoolTopics,
        lessons: currentDailyValues.lessons,
      });
    }

    if (!autoDayType) {
      return serializeDailyFormState({
        ...defaultDailyReportFormState,
        date: form.date,
      });
    }

    const lessonDefaults =
      autoDayType.dayType === 'school'
        ? (() => {
            const dayKey = resolveDayKey(form.date);

            if (!dayKey) {
              return [];
            }

            return uiSettings.timetable[dayKey].map((slot) => ({
              ...slot,
              topics: [],
            }));
          })()
        : [];

    return serializeDailyFormState({
      ...defaultDailyReportFormState,
      date: form.date,
      dayType: autoDayType.dayType,
      freeReason: autoDayType.dayType === 'free' ? autoDayType.freeReason : '',
      lessons: lessonDefaults,
    });
  }, [
    autoDayType,
    currentDailyReport,
    currentDailyValues,
    form.date,
    uiSettings.timetable,
  ]);
  const currentFormSnapshot = useMemo(
    () => serializeDailyFormState(form),
    [form],
  );
  const isDirty = currentFormSnapshot !== baselineFormSnapshot;

  useEffect(() => {
    if (form.date || !settingsSnapshot.value) {
      return;
    }

    const initialDate = resolveInitialDailyReportDate({
      reportsState: reportsState.value ?? null,
      trainingStart: trainingPeriod.trainingStart,
      trainingEnd: trainingPeriod.trainingEnd,
      reportsSince: trainingPeriod.reportsSince,
      isAutoEnteredDate: (date) =>
        resolveAutoDayType({
          date,
          uiSettings,
          absenceSettings,
          currentYear: new Date(date).getUTCFullYear(),
        }).dayType === 'free',
    });
    setForm((current) => ({
      ...current,
      date: initialDate,
    }));
  }, [
    form.date,
    reportsState.value,
    settingsSnapshot.value,
    absenceSettings,
    trainingPeriod.reportsSince,
    trainingPeriod.trainingEnd,
    trainingPeriod.trainingStart,
    uiSettings,
  ]);

  useEffect(() => {
    if (!requestedDate || requestedDate === form.date) {
      return;
    }

    setForm((current) => ({
      ...current,
      date: requestedDate,
    }));
  }, [form.date, requestedDate]);

  useEffect(() => {
    if (!selectedCalendarDate) {
      return;
    }

    setCalendarMonth(selectedCalendarDate);
  }, [selectedCalendarDate]);

  useEffect(() => {
    if (!currentDailyReport) {
      return;
    }
    setForm((current) => ({
      ...current,
      dayType: currentDailyValues.dayType,
      freeReason: currentDailyValues.freeReason,
      activities: currentDailyValues.activities,
      trainings: currentDailyValues.trainings,
      schoolTopics: currentDailyValues.schoolTopics,
      lessons: currentDailyValues.lessons,
    }));
  }, [currentDailyReport, currentDailyValues]);

  useEffect(() => {
    if (!form.date || currentDailyReport || !autoDayType) {
      return;
    }

    setForm((current) => ({
      ...current,
      dayType: autoDayType.dayType,
      freeReason: autoDayType.dayType === 'free' ? autoDayType.freeReason : '',
    }));
  }, [autoDayType, currentDailyReport, form.date]);

  useEffect(() => {
    if (form.dayType !== 'school' || form.lessons.length > 0 || !form.date) {
      return;
    }
    const dayKey = resolveDayKey(form.date);
    if (!dayKey) {
      return;
    }
    const preset = uiSettings.timetable[dayKey].map((slot) => ({
      ...slot,
      topics: [],
    }));
    setForm((current) => ({ ...current, lessons: preset }));
  }, [form.date, form.dayType, form.lessons.length, uiSettings.timetable]);

  function selectDate(dateValue: string) {
    const nextCalendarDate = toCalendarDate(dateValue);

    if (nextCalendarDate) {
      setCalendarMonth(nextCalendarDate);
    }

    setIsDatePickerOpen(false);

    setForm((current) => ({
      ...current,
      date: dateValue,
    }));
  }

  function appendListValue(
    key: 'activities' | 'trainings' | 'schoolTopics',
    draftKey: 'activityDraft' | 'trainingDraft' | 'schoolTopicDraft',
  ) {
    const draft = form[draftKey].trim();
    if (!draft.length) {
      return;
    }
    if (form[key].includes(draft)) {
      if (key === 'activities' && form.date) {
        toast.info(
          t('dailyReport.feedback.duplicateActivityForDate', {
            date: toDisplayDate(form.date),
          }),
        );
      }
      return;
    }
    setForm((current) => ({
      ...current,
      [key]: [...current[key], draft],
      [draftKey]: '',
    }));
  }

  function buildDailyReportPayload() {
    const lessons =
      form.dayType === 'school' ? normalizeLessons(form.lessons) : [];
    const freeDayCategory =
      form.dayType === 'free'
        ? (currentDailyValues.freeDayCategory ??
          (() => {
            const dayKey = resolveDayKey(form.date);

            if (dayKey && uiSettings.timetable[dayKey].length > 0) {
              return 'school';
            }

            return 'work';
          })())
        : null;
    const values = {
      entryMode: 'manual' as const,
      dayType: form.dayType,
      freeReason: form.dayType === 'free' ? form.freeReason.trim() : '',
      freeDayCategory,
      activities: form.activities,
      trainings: form.trainings,
      schoolTopics: form.dayType === 'work' ? [] : form.schoolTopics,
      lessons,
    };

    return values;
  }

  function validateDailyReportPayload(
    payload: ReturnType<typeof buildDailyReportPayload>,
  ) {
    if (payload.dayType === 'free' && !payload.freeReason.trim()) {
      return 'dailyReport.feedback.missingFreeReason';
    }

    if (
      payload.dayType === 'work' &&
      !payload.activities.length &&
      !payload.trainings.length
    ) {
      return 'dailyReport.feedback.missingWorkEntries';
    }

    if (
      payload.dayType === 'school' &&
      (!payload.lessons.length ||
        payload.lessons.some((lesson) => !lesson.topics.length))
    ) {
      return 'dailyReport.feedback.missingSchoolLessonTopics';
    }

    return null;
  }

  async function saveDailyReport(): Promise<boolean> {
    if (!runtime.api) {
      return false;
    }

    if (!form.date || !selectedWeekRange) {
      toast.error(t('dailyReport.feedback.missingDates'));
      return false;
    }

    const values = buildDailyReportPayload();
    const validationErrorKey = validateDailyReportPayload(values);

    if (validationErrorKey) {
      toast.error(t(validationErrorKey));
      return false;
    }

    setIsPending(true);

    try {
      await runtime.api.upsertDailyReport({
        weekStart: selectedWeekRange.weekStart,
        weekEnd: selectedWeekRange.weekEnd,
        date: form.date,
        values,
      });
      await runtime.refresh();
      await reportsState.refresh();
      toast.success(t('dailyReport.feedback.saved'));
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('dailyReport.feedback.saveError'), message);
      return false;
    } finally {
      setIsPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveDailyReport();
  }

  async function saveDraftFromGuard(): Promise<boolean> {
    return saveDailyReport();
  }

  function resetToBaseline() {
    if (currentDailyReport) {
      setForm((current) => ({
        ...current,
        date: currentDailyReport.date,
        dayType: currentDailyValues.dayType,
        freeReason: currentDailyValues.freeReason,
        activities: currentDailyValues.activities,
        trainings: currentDailyValues.trainings,
        schoolTopics: currentDailyValues.schoolTopics,
        lessons: currentDailyValues.lessons,
        activityDraft: '',
        trainingDraft: '',
        schoolTopicDraft: '',
      }));
      setLessonTopicDrafts({});
      return;
    }

    if (!autoDayType) {
      return;
    }

    const fallbackLessons =
      autoDayType.dayType === 'school'
        ? (() => {
            const dayKey = resolveDayKey(form.date);
            if (!dayKey) {
              return [];
            }
            return uiSettings.timetable[dayKey].map((slot) => ({
              ...slot,
              topics: [],
            }));
          })()
        : [];

    setForm((current) => ({
      ...current,
      dayType: autoDayType.dayType,
      freeReason: autoDayType.dayType === 'free' ? autoDayType.freeReason : '',
      activities: [],
      trainings: [],
      schoolTopics: [],
      lessons: fallbackLessons,
      activityDraft: '',
      trainingDraft: '',
      schoolTopicDraft: '',
    }));
    setLessonTopicDrafts({});
  }

  async function handleDeleteDailyReport() {
    if (
      !runtime.api ||
      !selectedWeekRange ||
      !form.date ||
      !currentDailyReport
    ) {
      return;
    }

    setIsDeletePending(true);

    try {
      await runtime.api.deleteDailyReport({
        weekStart: selectedWeekRange.weekStart,
        weekEnd: selectedWeekRange.weekEnd,
        date: form.date,
      });
      await runtime.refresh();
      await reportsState.refresh();
      setIsDeleteDialogOpen(false);
      toast.info(t('dailyReport.feedback.deleted'));
      navigate(appRoutes.dailyReport);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('dailyReport.feedback.saveError'), message);
    } finally {
      setIsDeletePending(false);
    }
  }

  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    onSave: async () => saveDraftFromGuard(),
  });

  function updateLessonField(
    lessonNumber: number,
    key: 'subject' | 'teacher',
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.map((lesson) =>
        lesson.lesson === lessonNumber ? { ...lesson, [key]: value } : lesson,
      ),
    }));
  }

  function updateLessonNumber(
    currentLessonNumber: number,
    nextLessonNumber: number,
  ) {
    if (currentLessonNumber === nextLessonNumber) {
      return;
    }

    setForm((current) => {
      const alreadyUsed = current.lessons.some(
        (lesson) => lesson.lesson === nextLessonNumber,
      );

      if (alreadyUsed) {
        return current;
      }

      return {
        ...current,
        lessons: current.lessons.map((lesson) =>
          lesson.lesson === currentLessonNumber
            ? { ...lesson, lesson: nextLessonNumber }
            : lesson,
        ),
      };
    });

    setLessonTopicDrafts((current) => {
      const draft = current[currentLessonNumber] ?? '';
      const next = { ...current };
      delete next[currentLessonNumber];
      next[nextLessonNumber] = draft;
      return next;
    });
  }

  function addLessonAt(insertIndex: number, lessonNumber: number) {
    setForm((current) => {
      if (current.lessons.some((lesson) => lesson.lesson === lessonNumber)) {
        return current;
      }

      const nextLessons = [...current.lessons];
      nextLessons.splice(insertIndex, 0, {
        lesson: lessonNumber,
        subject: '',
        teacher: '',
        topics: [],
      });

      return {
        ...current,
        lessons: nextLessons,
      };
    });
  }

  function removeLesson(lessonNumber: number) {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.filter(
        (lesson) => lesson.lesson !== lessonNumber,
      ),
    }));

    setLessonTopicDrafts((current) => {
      const next = { ...current };
      delete next[lessonNumber];
      return next;
    });
  }

  function moveLesson(sourceLessonNumber: number, targetLessonNumber: number) {
    if (sourceLessonNumber === targetLessonNumber) {
      return;
    }

    setForm((current) => {
      const sourceIndex = current.lessons.findIndex(
        (lesson) => lesson.lesson === sourceLessonNumber,
      );
      const targetIndex = current.lessons.findIndex(
        (lesson) => lesson.lesson === targetLessonNumber,
      );

      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }

      const nextLessons = [...current.lessons];
      const [moved] = nextLessons.splice(sourceIndex, 1);
      nextLessons.splice(targetIndex, 0, moved);

      return {
        ...current,
        lessons: nextLessons,
      };
    });
  }

  function appendLessonTopic(lessonNumber: number) {
    const draft = lessonTopicDrafts[lessonNumber]?.trim() ?? '';

    if (!draft.length) {
      return;
    }

    setForm((current) => ({
      ...current,
      lessons: current.lessons.map((lesson) => {
        if (lesson.lesson !== lessonNumber) {
          return lesson;
        }

        return {
          ...lesson,
          topics: Array.from(new Set([...lesson.topics, draft])),
        };
      }),
    }));

    setLessonTopicDrafts((current) => ({
      ...current,
      [lessonNumber]: '',
    }));
  }

  function removeLessonTopic(lessonNumber: number, topic: string) {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.map((lesson) =>
        lesson.lesson === lessonNumber
          ? {
              ...lesson,
              topics: lesson.topics.filter((entry) => entry !== topic),
            }
          : lesson,
      ),
    }));
  }

  return (
    <div className="space-y-4">
      <PageHeader title={dailyPageTitle} description={dailyPageDescription} />
      <form className="space-y-4 " onSubmit={handleSubmit}>
        <SectionCard
          title={metaCardTitle}
          action={
            form.date ? (
              <div className="inline-flex items-center rounded-full border border-primary-tint/70 bg-primary-tint/15 px-3 py-1.5 text-sm text-text-color">
                <DayTypeBadge
                  dayType={form.dayType}
                  freeReason={form.freeReason}
                  labelClassName="font-medium"
                />
              </div>
            ) : null
          }
          className="border-primary-tint bg-white"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField id="report-date" label={t('dailyReport.meta.date')}>
              <Popover
                open={isDatePickerOpen}
                onOpenChange={setIsDatePickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="group h-10 w-full justify-between border-primary-tint text-left font-normal transition-colors enabled:cursor-pointer hover:bg-primary hover:text-primary-contrast"
                  >
                    <span>{form.date ? toDisplayDate(form.date) : '-'}</span>
                    <FiCalendar className="size-4 text-text-color/70 transition-colors group-hover:text-primary-contrast" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-auto border-primary-tint p-2"
                >
                  <div className="space-y-3">
                    <Calendar
                      locale={de}
                      mode="single"
                      selected={selectedCalendarDate}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      onSelect={(date) => {
                        if (!date) {
                          return;
                        }

                        selectDate(toCalendarIsoDate(date));
                      }}
                      modifiers={{
                        submitted: (date) =>
                          calendarStatusMap.get(toCalendarIsoDate(date)) ===
                          'submitted',
                        draft: (date) =>
                          calendarStatusMap.get(toCalendarIsoDate(date)) ===
                          'draft',
                        missing: (date) =>
                          isDateWithinDailyReportCalendarRange(
                            toCalendarIsoDate(date),
                            calendarRange,
                          ) && !calendarStatusMap.has(toCalendarIsoDate(date)),
                      }}
                      modifiersClassNames={{
                        submitted:
                          'border border-emerald-500/25 bg-emerald-500/10 text-emerald-900 shadow-sm',
                        draft:
                          'border border-sky-500/25 bg-sky-500/10 text-sky-900 shadow-sm',
                        missing:
                          'border border-transparent bg-primary-tint/20 text-text-color/85',
                      }}
                      className="mx-auto"
                    />
                    <div className="grid gap-2 px-3 pb-2">
                      <div className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-sm text-emerald-900">
                        {t('dailyReport.calendar.legendSubmitted')}
                      </div>
                      <div className="inline-flex items-center rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-sm text-sky-900">
                        {t('dailyReport.calendar.legendDraft')}
                      </div>
                      <div className="inline-flex items-center rounded-full border border-primary-tint/70 bg-primary-tint/20 px-2.5 py-1 text-sm text-text-color">
                        {t('dailyReport.calendar.legendEmpty')}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </FormField>
            <FormField id="day-type" label={t('dailyReport.meta.dayType')}>
              <div
                id="day-type"
                role="radiogroup"
                aria-label={t('dailyReport.meta.dayType')}
                className="grid gap-2 sm:grid-cols-3"
              >
                {dayTypeValues.map((dayType) => (
                  <button
                    key={dayType}
                    type="button"
                    role="radio"
                    aria-checked={form.dayType === dayType}
                    disabled={isContentReadOnly || isPending || isDeletePending}
                    className={`flex min-h-11 items-center justify-start rounded-xl border px-3 py-2 text-left text-sm transition-colors enabled:cursor-pointer ${
                      form.dayType === dayType
                        ? 'border-primary bg-primary text-primary-contrast'
                        : 'border-primary-tint/70 bg-white text-text-color hover:bg-primary-tint/10'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        dayType,
                      }))
                    }
                  >
                    <DayTypeBadge
                      dayType={dayType}
                      freeReason={
                        dayType === 'free' && form.dayType === 'free'
                          ? form.freeReason
                          : ''
                      }
                      iconClassName={
                        form.dayType === dayType
                          ? 'text-primary-contrast'
                          : 'text-primary'
                      }
                      labelClassName="font-medium"
                    />
                  </button>
                ))}
              </div>
            </FormField>
          </div>
          {activeStatusBanner ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 ${
                activeStatusBanner.tone === 'submitted'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                  : 'border-sky-300 bg-sky-50 text-sky-950'
              }`}
            >
              <div className="flex items-start gap-3">
                <activeStatusBanner.icon className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    {activeStatusBanner.title}
                  </p>
                  <p className="text-sm">{activeStatusBanner.description}</p>
                  {activeStatusBanner.meta ? (
                    <p className="text-xs text-current/75">
                      {activeStatusBanner.meta}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          {autoReasonText ? (
            <p className="mt-3 text-xs text-text-color/70">{autoReasonText}</p>
          ) : null}
        </SectionCard>
        {absenceConflict ? (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950">
            <FiAlertTriangle className="size-4" />
            <AlertTitle>{t('reportConflicts.dailyTitle')}</AlertTitle>
            <AlertDescription>
              <p>{t('reportConflicts.dailyDescription')}</p>
              <p>
                {t('reportConflicts.storedState', {
                  value: formatConflictDayTypeLabel(t, {
                    dayType: absenceConflict.storedDayType,
                    freeReason: absenceConflict.storedFreeReason,
                  }),
                })}
              </p>
              <p>
                {t('reportConflicts.expectedState', {
                  value: formatConflictDayTypeLabel(t, {
                    dayType: absenceConflict.expectedDayType,
                    freeReason: absenceConflict.expectedFreeReason,
                  }),
                })}
              </p>
              <p>
                {t('reportConflicts.reason', {
                  value: formatConflictReasonLabel(t, absenceConflict.reason),
                })}
              </p>
            </AlertDescription>
          </Alert>
        ) : null}
        <fieldset
          disabled={isContentReadOnly || isPending || isDeletePending}
          className={isContentReadOnly ? 'space-y-4 opacity-80' : 'space-y-4'}
        >
          {form.dayType === 'free' ? (
            <SectionCard
              title={t('dailyReport.freeDay.title')}
              className="border-primary-tint bg-white"
            >
              <FormField
                id="free-reason"
                label={t('dailyReport.freeDay.reason')}
              >
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
                  title={
                    form.dayType === 'school'
                      ? t('dailyReport.activities.workTitleForSchoolDay')
                      : t('dailyReport.activities.title')
                  }
                  preserveDescriptionSpace
                  className="border-primary-tint bg-white"
                >
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={form.activityDraft}
                        list="activity-suggestions"
                        placeholder={t('dailyReport.activities.placeholder')}
                        onKeyDown={(event) =>
                          handleEnterAction(event, () =>
                            appendListValue('activities', 'activityDraft'),
                          )
                        }
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
                    <ul className="space-y-2">
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
                        list="training-suggestions"
                        placeholder={t('dailyReport.trainings.placeholder')}
                        onKeyDown={(event) =>
                          handleEnterAction(event, () =>
                            appendListValue('trainings', 'trainingDraft'),
                          )
                        }
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
                    <ul className="space-y-2">
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
                  className="border-primary-tint bg-white"
                >
                  <div className="space-y-3">
                    {Array.from({ length: form.lessons.length + 1 }).map(
                      (_, insertIndex) => {
                        const insertOptions = listInsertOptions({
                          lessons: form.lessons,
                          insertIndex,
                        });
                        const insertKey = insertIndex;
                        const selectedInsertLesson =
                          lessonInsertSelection[insertKey] ?? insertOptions[0];

                        return (
                          <div
                            key={`insert-${insertKey}`}
                            className="space-y-2"
                          >
                            {insertOptions.length ? (
                              <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-primary-tint/80 bg-primary-tint/10 p-2">
                                <select
                                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                                  value={selectedInsertLesson}
                                  onChange={(event) =>
                                    setLessonInsertSelection((current) => ({
                                      ...current,
                                      [insertKey]: Number(event.target.value),
                                    }))
                                  }
                                >
                                  {insertOptions.map((lessonNumber) => (
                                    <option
                                      key={lessonNumber}
                                      value={lessonNumber}
                                    >
                                      {t(
                                        'dailyReport.school.lessonNumberOption',
                                        {
                                          lesson: lessonNumber,
                                        },
                                      )}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="border-primary-tint"
                                  onClick={() => {
                                    if (!selectedInsertLesson) {
                                      return;
                                    }

                                    addLessonAt(
                                      insertIndex,
                                      selectedInsertLesson,
                                    );
                                  }}
                                >
                                  {t('dailyReport.school.addLesson')}
                                </Button>
                              </div>
                            ) : null}
                            {insertIndex < form.lessons.length ? (
                              <div
                                key={`lesson-${form.lessons[insertIndex].lesson}`}
                                draggable
                                onDragStart={() => {
                                  setDragLessonNumber(
                                    form.lessons[insertIndex].lesson,
                                  );
                                }}
                                onDragOver={(
                                  event: DragEvent<HTMLDivElement>,
                                ) => {
                                  event.preventDefault();
                                }}
                                onDrop={(event: DragEvent<HTMLDivElement>) => {
                                  event.preventDefault();
                                  if (dragLessonNumber === null) {
                                    return;
                                  }

                                  moveLesson(
                                    dragLessonNumber,
                                    form.lessons[insertIndex].lesson,
                                  );
                                  setDragLessonNumber(null);
                                }}
                                onDragEnd={() => {
                                  setDragLessonNumber(null);
                                }}
                                className="space-y-3 rounded-md border border-primary-tint/70 p-3"
                              >
                                <div className="grid gap-2 md:grid-cols-[120px_1fr_1fr_auto]">
                                  <select
                                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                                    value={form.lessons[insertIndex].lesson}
                                    onChange={(event) =>
                                      updateLessonNumber(
                                        form.lessons[insertIndex].lesson,
                                        Number(event.target.value),
                                      )
                                    }
                                  >
                                    {[
                                      form.lessons[insertIndex].lesson,
                                      ...listMissingLessonNumbers(form.lessons),
                                    ]
                                      .sort((left, right) => left - right)
                                      .map((lessonNumber) => (
                                        <option
                                          key={lessonNumber}
                                          value={lessonNumber}
                                        >
                                          {t(
                                            'dailyReport.school.lessonNumberOption',
                                            {
                                              lesson: lessonNumber,
                                            },
                                          )}
                                        </option>
                                      ))}
                                  </select>
                                  <Input
                                    value={form.lessons[insertIndex].subject}
                                    list="subject-suggestions"
                                    placeholder={t(
                                      'dailyReport.school.subjectPlaceholder',
                                    )}
                                    onChange={(event) =>
                                      updateLessonField(
                                        form.lessons[insertIndex].lesson,
                                        'subject',
                                        event.target.value,
                                      )
                                    }
                                  />
                                  <Input
                                    value={form.lessons[insertIndex].teacher}
                                    list="teacher-suggestions"
                                    placeholder={t(
                                      'dailyReport.school.teacherPlaceholder',
                                    )}
                                    onChange={(event) =>
                                      updateLessonField(
                                        form.lessons[insertIndex].lesson,
                                        'teacher',
                                        event.target.value,
                                      )
                                    }
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-9 px-2 text-xs"
                                    onClick={() => {
                                      removeLesson(
                                        form.lessons[insertIndex].lesson,
                                      );
                                    }}
                                  >
                                    {t('common.remove')}
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <Input
                                      value={
                                        lessonTopicDrafts[
                                          form.lessons[insertIndex].lesson
                                        ] ?? ''
                                      }
                                      list="lesson-topic-suggestions"
                                      placeholder={t(
                                        'dailyReport.school.topicPlaceholder',
                                      )}
                                      onKeyDown={(event) =>
                                        handleEnterAction(event, () =>
                                          appendLessonTopic(
                                            form.lessons[insertIndex].lesson,
                                          ),
                                        )
                                      }
                                      onChange={(event) =>
                                        setLessonTopicDrafts((current) => ({
                                          ...current,
                                          [form.lessons[insertIndex].lesson]:
                                            event.target.value,
                                        }))
                                      }
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="border-primary-tint"
                                      onClick={() => {
                                        appendLessonTopic(
                                          form.lessons[insertIndex].lesson,
                                        );
                                      }}
                                    >
                                      {t('common.add')}
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {form.lessons[insertIndex].topics.map(
                                      (topic) => (
                                        <span
                                          key={`${form.lessons[insertIndex].lesson}-${topic}`}
                                          className="inline-flex items-center gap-2 rounded-md border border-primary-tint/70 bg-primary-tint/20 px-2 py-1 text-xs text-text-color"
                                        >
                                          {topic}
                                          <button
                                            type="button"
                                            className="text-text-color/70"
                                            onClick={() => {
                                              removeLessonTopic(
                                                form.lessons[insertIndex]
                                                  .lesson,
                                                topic,
                                              );
                                            }}
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      },
                    )}
                  </div>
                </SectionCard>
              ) : null}
            </>
          )}
        </fieldset>
        <div className="sticky bottom-0 z-20 rounded-xl border border-primary-tint/75 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-primary-tint"
                disabled={isPending || isDeletePending || !isDirty}
                onClick={() => {
                  resetToBaseline();
                }}
              >
                <FiRotateCcw className="size-4" />
                {t('dailyReport.actions.cancel')}
              </Button>
              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary-tint"
                  disabled={isPending || isDeletePending || isContentReadOnly}
                  onClick={() => {
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <FiTrash2 className="size-4" />
                  {t('dailyReport.actions.delete')}
                </Button>
              ) : null}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="submit"
                disabled={
                  isPending || isDeletePending || isContentReadOnly || !isDirty
                }
                className="bg-primary text-primary-contrast hover:bg-primary-shade"
              >
                <FiSave className="size-4" />
                {submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </form>
      <datalist id="activity-suggestions">
        {activitySuggestions.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </datalist>
      <datalist id="training-suggestions">
        {trainingSuggestions.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </datalist>
      <datalist id="lesson-topic-suggestions">
        {lessonTopicSuggestions.map((value) => (
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
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dailyReport.deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dailyReport.deleteDialog.description', {
                date: form.date ? toDisplayDate(form.date) : '-',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletePending}>
              {t('common.no')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletePending}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={(event) => {
                event.preventDefault();
                handleDeleteDailyReport().catch(() => undefined);
              }}
            >
              {isDeletePending ? t('common.loading') : t('common.yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <UnsavedChangesDialog
        open={unsavedChangesGuard.isOpen}
        isPending={unsavedChangesGuard.isPending}
        onCancel={unsavedChangesGuard.cancel}
        onDiscard={unsavedChangesGuard.discard}
        onSave={() => {
          unsavedChangesGuard.saveAndProceed().catch(() => undefined);
        }}
      />
    </div>
  );
}
