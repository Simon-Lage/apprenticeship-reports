import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { formatGermanDate } from '@/renderer/lib/date-format';
import { normalizeIsoDate, toLocalIsoDate } from '@/renderer/lib/iso-date';
import { listCompleteTimetableSlots } from '@/renderer/lib/app-settings';
import {
  parseDailyReportValues,
  SchoolLessonInput,
} from '@/renderer/lib/report-values';
import {
  DailyReportFormState,
  defaultDailyReportFormState,
} from '../utils/form-model';
import {
  resolveDailyReportUpperLimit,
  resolveDayKey,
  resolveInitialDailyReportDate,
} from '../utils/calendar-date-utils';
import { resolveAutoDayType } from '../utils/day-type-defaults';
import serializeDailyFormState from '../utils/form-serialization';
import {
  buildLessonNumberReorderMap,
  normalizeDraftEntry,
} from '../utils/lesson-utils';
import useDailyReportData from './useDailyReportData';

export default function useDailyReportForm() {
  const { t } = useTranslation();
  const toast = useToastController();

  const [form, setForm] = useState<DailyReportFormState>(
    defaultDailyReportFormState,
  );
  const [isPending, setIsPending] = useState(false);
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
  const freeLessonCacheRef = useRef<Record<number, SchoolLessonInput>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);

  const data = useDailyReportData(form.date);
  const { requestedDate, autoDayType } = data;

  // Effects
  useEffect(() => {
    if (form.date || !data.settingsSnapshot.value) return;
    const initialDate = resolveInitialDailyReportDate({
      reportsState: data.reportsState.value ?? null,
      reportStartDate: data.reportStartDate,
      trainingEnd: data.trainingPeriod.trainingEnd,
      isAutoEnteredDate: (date) =>
        resolveAutoDayType({
          date,
          uiSettings: data.uiSettings,
          absenceSettings: data.absenceSettings,
          currentYear: new Date(date).getUTCFullYear(),
        }).dayType === 'free',
    });
    setForm({
      ...defaultDailyReportFormState,
      date: initialDate,
    });
  }, [
    form.date,
    data.reportsState.value,
    data.settingsSnapshot.value,
    data.absenceSettings,
    data.reportStartDate,
    data.trainingPeriod.trainingEnd,
    data.uiSettings,
  ]);

  useEffect(() => {
    if (!requestedDate || requestedDate === form.date) return;
    const today = toLocalIsoDate(new Date());
    const reportStartLimit = normalizeIsoDate(data.reportStartDate) ?? today;
    const dailyUpperLimit = resolveDailyReportUpperLimit({
      reportsState: data.reportsState.value ?? null,
      trainingEnd: data.trainingPeriod.trainingEnd,
    });

    if (requestedDate < reportStartLimit || requestedDate > dailyUpperLimit) {
      return;
    }

    setLessonTopicDrafts({});
    setLessonInsertSelection({});
    freeLessonCacheRef.current = {};
    setForm({
      ...defaultDailyReportFormState,
      date: requestedDate,
    });
  }, [
    data.reportStartDate,
    data.reportsState.value,
    data.trainingPeriod.trainingEnd,
    form.date,
    requestedDate,
  ]);

  useEffect(() => {
    if (!form.date) return;
    const date = new Date(form.date);
    if (!Number.isNaN(date.getTime())) setCalendarMonth(date);
  }, [form.date]);

  useEffect(() => {
    if (!data.currentDailyReport) return;
    const values = parseDailyReportValues(data.currentDailyReport.values);
    freeLessonCacheRef.current = {};
    setForm((current) => ({
      ...current,
      dayType: values.dayType,
      freeReason: values.freeReason,
      activities: values.activities,
      trainings: values.trainings,
      schoolTopics: values.schoolTopics,
      lessons: values.lessons,
      expandedDoubleLessonPairs: [],
    }));
  }, [data.currentDailyReport]);

  useEffect(() => {
    if (!form.date || data.currentDailyReport || !autoDayType) return;
    setForm((current) => ({
      ...current,
      dayType: autoDayType.dayType,
      freeReason: autoDayType.dayType === 'free' ? autoDayType.freeReason : '',
      expandedDoubleLessonPairs: [],
    }));
  }, [autoDayType, data.currentDailyReport, form.date]);

  useEffect(() => {
    if (form.dayType !== 'school' || form.lessons.length > 0 || !form.date)
      return;
    const dayKey = resolveDayKey(form.date);
    if (!dayKey) return;
    const preset = listCompleteTimetableSlots(data.uiSettings, dayKey).map(
      (slot) => ({
        ...slot,
        topics: [],
      }),
    );
    setForm((current) => ({ ...current, lessons: preset }));
  }, [form.date, form.dayType, form.lessons.length, data.uiSettings]);

  // Handlers
  const selectDate = useCallback((dateValue: string) => {
    setIsDatePickerOpen(false);
    setLessonTopicDrafts({});
    setLessonInsertSelection({});
    freeLessonCacheRef.current = {};
    setForm({
      ...defaultDailyReportFormState,
      date: dateValue,
    });
  }, []);

  const appendListValue = useCallback(
    (
      key: 'activities' | 'trainings' | 'schoolTopics',
      draftKey: 'activityDraft' | 'trainingDraft' | 'schoolTopicDraft',
      options: { notifyDuplicate: boolean } = { notifyDuplicate: true },
    ) => {
      const draft = normalizeDraftEntry(form[draftKey]);
      if (!draft) return;
      if (form[key].includes(draft)) {
        if (options.notifyDuplicate && key === 'activities' && form.date) {
          toast.info(
            t('dailyReport.feedback.duplicateActivityForDate', {
              date: formatGermanDate(form.date),
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
    },
    [form, toast, t],
  );

  const appendLessonTopic = useCallback(
    (lessonNumber: number) => {
      const draft = normalizeDraftEntry(lessonTopicDrafts[lessonNumber] ?? '');
      if (!draft) return;
      setForm((current) => ({
        ...current,
        lessons: current.lessons.map((lesson) =>
          lesson.lesson === lessonNumber
            ? {
                ...lesson,
                topics: Array.from(new Set([...lesson.topics, draft])),
              }
            : lesson,
        ),
      }));
      setLessonTopicDrafts((current) => ({ ...current, [lessonNumber]: '' }));
    },
    [lessonTopicDrafts],
  );

  const updateLessonField = useCallback(
    (lessonNumber: number, key: 'subject' | 'teacher', value: string) => {
      setForm((current) => ({
        ...current,
        lessons: current.lessons.map((lesson) =>
          lesson.lesson === lessonNumber ? { ...lesson, [key]: value } : lesson,
        ),
      }));
    },
    [],
  );

  const updateLessonNumber = useCallback(
    (currentLessonNumber: number, nextLessonNumber: number) => {
      if (currentLessonNumber === nextLessonNumber) return;
      setForm((current) => {
        const alreadyUsed = current.lessons.some(
          (lesson) => lesson.lesson === nextLessonNumber,
        );
        if (alreadyUsed) return current;
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
    },
    [],
  );

  const addLessonAt = useCallback(
    (insertIndex: number, lessonNumber: number) => {
      setForm((current) => {
        if (current.lessons.some((lesson) => lesson.lesson === lessonNumber))
          return current;
        const nextLessons = [...current.lessons];
        nextLessons.splice(insertIndex, 0, {
          lesson: lessonNumber,
          subject: '',
          teacher: '',
          topics: [],
        });
        return { ...current, lessons: nextLessons };
      });
    },
    [],
  );

  const removeLesson = useCallback((lessonNumber: number) => {
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
  }, []);

  const setLessonFreeState = useCallback(
    (lessonNumber: number, isFreeLesson: boolean) => {
      setForm((current) => {
        const currentLesson = current.lessons.find(
          (lesson) => lesson.lesson === lessonNumber,
        );

        if (isFreeLesson) {
          if (currentLesson) {
            freeLessonCacheRef.current = {
              ...freeLessonCacheRef.current,
              [lessonNumber]: currentLesson,
            };
          }

          return {
            ...current,
            lessons: current.lessons.filter(
              (lesson) => lesson.lesson !== lessonNumber,
            ),
            expandedDoubleLessonPairs: current.expandedDoubleLessonPairs.filter(
              (pairStart) =>
                pairStart !== lessonNumber && pairStart !== lessonNumber - 1,
            ),
          };
        }

        if (currentLesson) return current;

        return {
          ...current,
          lessons: [
            ...current.lessons,
            freeLessonCacheRef.current[lessonNumber] ?? {
              lesson: lessonNumber,
              subject: '',
              teacher: '',
              topics: [],
            },
          ].sort((left, right) => left.lesson - right.lesson),
        };
      });
    },
    [],
  );

  const setDoubleLessonState = useCallback(
    (pairStart: number, isDoubleLesson: boolean) => {
      setForm((current) => {
        if (!isDoubleLesson) {
          return {
            ...current,
            expandedDoubleLessonPairs: Array.from(
              new Set([...current.expandedDoubleLessonPairs, pairStart]),
            ),
          };
        }

        const first = current.lessons.find(
          (lesson) => lesson.lesson === pairStart,
        );
        const second = current.lessons.find(
          (lesson) => lesson.lesson === pairStart + 1,
        );
        if (!first || !second) return current;

        return {
          ...current,
          expandedDoubleLessonPairs: current.expandedDoubleLessonPairs.filter(
            (lessonNumber) => lessonNumber !== pairStart,
          ),
          lessons: current.lessons.map((lesson) => {
            if (lesson.lesson === pairStart) {
              return {
                ...lesson,
                topics: Array.from(
                  new Set([...first.topics, ...second.topics]),
                ),
              };
            }
            if (lesson.lesson === pairStart + 1) {
              return { ...lesson, topics: [] };
            }
            return lesson;
          }),
        };
      });
    },
    [],
  );

  const moveLesson = useCallback(
    (sourceLessonNumber: number, targetLessonNumber: number) => {
      if (sourceLessonNumber === targetLessonNumber) return;
      setForm((current) => {
        const sourceIndex = current.lessons.findIndex(
          (l) => l.lesson === sourceLessonNumber,
        );
        const targetIndex = current.lessons.findIndex(
          (l) => l.lesson === targetLessonNumber,
        );
        if (sourceIndex < 0 || targetIndex < 0) return current;
        const nextLessons = [...current.lessons];
        const [moved] = nextLessons.splice(sourceIndex, 1);
        nextLessons.splice(targetIndex, 0, moved);
        return { ...current, lessons: nextLessons };
      });
    },
    [],
  );

  const reorderLesson = useCallback(
    (
      sourceLessonNumber: number,
      targetLessonNumber: number,
      lessonCount = 1,
    ) => {
      setForm((current) => {
        const hasSourceLesson = current.lessons.some(
          (lesson) => lesson.lesson === sourceLessonNumber,
        );
        if (
          !hasSourceLesson ||
          sourceLessonNumber === targetLessonNumber ||
          targetLessonNumber < 1 ||
          targetLessonNumber > 13
        ) {
          return current;
        }
        const lessonNumberMap = buildLessonNumberReorderMap(
          sourceLessonNumber,
          targetLessonNumber,
          lessonCount,
        );

        return {
          ...current,
          expandedDoubleLessonPairs: current.expandedDoubleLessonPairs
            .map((lessonNumber) => lessonNumberMap.get(lessonNumber))
            .filter(
              (lessonNumber): lessonNumber is number =>
                typeof lessonNumber === 'number' && lessonNumber % 2 === 1,
            ),
          lessons: current.lessons.map((lesson) => ({
            ...lesson,
            lesson: lessonNumberMap.get(lesson.lesson) ?? lesson.lesson,
          })),
        };
      });

      setLessonTopicDrafts((current) => {
        if (!Object.keys(current).length) return current;
        const lessonNumberMap = buildLessonNumberReorderMap(
          sourceLessonNumber,
          targetLessonNumber,
          lessonCount,
        );
        const next: Record<number, string> = {};
        Object.entries(current).forEach(([lessonKey, draft]) => {
          const lessonNumber = Number(lessonKey);
          next[lessonNumberMap.get(lessonNumber) ?? lessonNumber] = draft;
        });
        return next;
      });
    },
    [],
  );

  const removeLessonTopic = useCallback(
    (lessonNumber: number, topic: string) => {
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
    },
    [],
  );

  const resetToBaseline = useCallback(() => {
    freeLessonCacheRef.current = {};

    if (data.currentDailyReport) {
      const values = parseDailyReportValues(data.currentDailyReport.values);
      setForm((current) => ({
        ...current,
        date: data.currentDailyReport!.date,
        dayType: values.dayType,
        freeReason: values.freeReason,
        activities: values.activities,
        trainings: values.trainings,
        schoolTopics: values.schoolTopics,
        lessons: values.lessons,
        expandedDoubleLessonPairs: [],
        activityDraft: '',
        trainingDraft: '',
        schoolTopicDraft: '',
      }));
      setLessonTopicDrafts({});
      return;
    }
    if (!autoDayType) return;
    const fallbackLessons =
      autoDayType.dayType === 'school'
        ? (() => {
            const dayKey = resolveDayKey(form.date);
            if (!dayKey) return [];
            return listCompleteTimetableSlots(data.uiSettings, dayKey).map(
              (slot) => ({
                ...slot,
                topics: [],
              }),
            );
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
      expandedDoubleLessonPairs: [],
      activityDraft: '',
      trainingDraft: '',
      schoolTopicDraft: '',
    }));
    setLessonTopicDrafts({});
  }, [data.currentDailyReport, autoDayType, form.date, data.uiSettings]);

  // Dirty check
  const baselineFormSnapshot = useMemo(() => {
    if (!form.date) return serializeDailyFormState(defaultDailyReportFormState);
    if (data.currentDailyReport) {
      const values = parseDailyReportValues(data.currentDailyReport.values);
      return serializeDailyFormState({
        ...defaultDailyReportFormState,
        date: data.currentDailyReport.date,
        dayType: values.dayType,
        freeReason: values.freeReason,
        activities: values.activities,
        trainings: values.trainings,
        schoolTopics: values.schoolTopics,
        lessons: values.lessons,
        expandedDoubleLessonPairs: [],
      });
    }
    if (!data.autoDayType) {
      return serializeDailyFormState({
        ...defaultDailyReportFormState,
        date: form.date,
      });
    }
    const lessonDefaults =
      data.autoDayType.dayType === 'school'
        ? (() => {
            const dayKey = resolveDayKey(form.date);
            if (!dayKey) return [];
            return listCompleteTimetableSlots(data.uiSettings, dayKey).map(
              (slot) => ({
                ...slot,
                topics: [],
              }),
            );
          })()
        : [];
    return serializeDailyFormState({
      ...defaultDailyReportFormState,
      date: form.date,
      dayType: data.autoDayType.dayType,
      freeReason:
        data.autoDayType.dayType === 'free' ? data.autoDayType.freeReason : '',
      lessons: lessonDefaults,
      expandedDoubleLessonPairs: [],
    });
  }, [form.date, data.currentDailyReport, data.autoDayType, data.uiSettings]);

  const currentFormSnapshot = useMemo(
    () => serializeDailyFormState(form),
    [form],
  );
  const isDirty = currentFormSnapshot !== baselineFormSnapshot;

  // Disabled reasons
  const resolveContentDisabledReason = useCallback(() => {
    if (data.isContentReadOnly)
      return t('common.disabledReasons.submittedReport');
    if (isDeletePending) return t('common.disabledReasons.deletionPending');
    if (isPending) return t('common.disabledReasons.pending');
    return null;
  }, [data.isContentReadOnly, isDeletePending, isPending, t]);

  const resolveCancelDisabledReason = useCallback(() => {
    if (isDeletePending) return t('common.disabledReasons.deletionPending');
    if (isPending) return t('common.disabledReasons.pending');
    if (!isDirty) return t('common.disabledReasons.noChanges');
    return undefined;
  }, [isDeletePending, isPending, isDirty, t]);

  const resolveDeleteDisabledReason = useCallback(() => {
    if (data.isContentReadOnly)
      return t('common.disabledReasons.submittedReport');
    if (isDeletePending) return t('common.disabledReasons.deletionPending');
    if (isPending) return t('common.disabledReasons.pending');
    return undefined;
  }, [data.isContentReadOnly, isDeletePending, isPending, t]);

  const resolveSubmitDisabledReason = useCallback(() => {
    if (data.isContentReadOnly)
      return t('common.disabledReasons.submittedReport');
    if (isDeletePending) return t('common.disabledReasons.deletionPending');
    if (isPending) return t('common.disabledReasons.pending');
    if (!isDirty) return t('common.disabledReasons.noChanges');
    return undefined;
  }, [data.isContentReadOnly, isDeletePending, isPending, isDirty, t]);

  return {
    form,
    setForm,
    isPending,
    setIsPending,
    isDatePickerOpen,
    setIsDatePickerOpen,
    calendarMonth,
    setCalendarMonth,
    lessonTopicDrafts,
    setLessonTopicDrafts,
    lessonInsertSelection,
    setLessonInsertSelection,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isDeletePending,
    setIsDeletePending,
    ...data,
    isDirty,
    resolveContentDisabledReason,
    resolveCancelDisabledReason,
    resolveDeleteDisabledReason,
    resolveSubmitDisabledReason,
    selectDate,
    appendListValue,
    appendLessonTopic,
    updateLessonField,
    updateLessonNumber,
    addLessonAt,
    removeLesson,
    setLessonFreeState,
    setDoubleLessonState,
    moveLesson,
    reorderLesson,
    removeLessonTopic,
    resetToBaseline,
    baselineFormSnapshot,
    currentFormSnapshot,
  };
}
