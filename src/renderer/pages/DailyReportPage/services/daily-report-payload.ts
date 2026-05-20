import { normalizeLessons } from '@/renderer/lib/report-values';
import { UiSettingsValues } from '@/renderer/lib/app-settings';
import { resolveDayKey } from '../utils/calendar-date-utils';
import normalizeEntryList from '../utils/entry-list';
import { DailyReportFormState } from '../utils/form-model';

function hasMatchingDoubleLessonPair(
  lessonsByNumber: Map<number, { subject: string; teacher: string }>,
  pairStart: number,
): boolean {
  const first = lessonsByNumber.get(pairStart);
  const second = lessonsByNumber.get(pairStart + 1);
  if (!first || !second) return false;

  return (
    first.subject.trim().length > 0 &&
    first.teacher.trim().length > 0 &&
    first.subject === second.subject &&
    first.teacher === second.teacher
  );
}

function listCollapsedDoubleLessonPairs(sourceForm: DailyReportFormState) {
  const expandedPairs = new Set(sourceForm.expandedDoubleLessonPairs);
  const lessonsByNumber = new Map(
    sourceForm.lessons.map((lesson) => [lesson.lesson, lesson]),
  );

  return [1, 3, 5, 7, 9, 11].filter((pairStart) => {
    if (expandedPairs.has(pairStart)) return false;
    if (!hasMatchingDoubleLessonPair(lessonsByNumber, pairStart)) return false;

    const first = lessonsByNumber.get(pairStart)!;
    const second = lessonsByNumber.get(pairStart + 1)!;
    return !first.topics.length || !second.topics.length;
  });
}

export function buildDailyReportPayload(
  sourceForm: DailyReportFormState,
  currentDailyValues: { freeDayCategory?: 'school' | 'work' | null },
  uiSettings: UiSettingsValues,
) {
  const lessons =
    sourceForm.dayType === 'school'
      ? normalizeLessons(
          sourceForm.lessons.map((lesson) => ({
            ...lesson,
            topics: normalizeEntryList(lesson.topics),
          })),
          {
            collapsedDoubleLessonPairs:
              listCollapsedDoubleLessonPairs(sourceForm),
          },
        )
      : [];
  const freeDayCategory =
    sourceForm.dayType === 'free'
      ? (currentDailyValues.freeDayCategory ??
        (() => {
          const dayKey = resolveDayKey(sourceForm.date);
          if (dayKey && uiSettings.timetable[dayKey].length > 0)
            return 'school';
          return 'work';
        })())
      : null;

  return {
    entryMode: 'manual' as const,
    dayType: sourceForm.dayType,
    freeReason:
      sourceForm.dayType === 'free' ? sourceForm.freeReason.trim() : '',
    freeDayCategory,
    activities: normalizeEntryList(sourceForm.activities),
    trainings: normalizeEntryList(sourceForm.trainings),
    schoolTopics:
      sourceForm.dayType === 'work'
        ? []
        : normalizeEntryList(sourceForm.schoolTopics),
    lessons,
  };
}

export function validateDailyReportPayload(
  payload: ReturnType<typeof buildDailyReportPayload>,
  options: { expandedDoubleLessonPairs?: number[] } = {},
): string | null {
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
  if (payload.dayType === 'school' && !payload.lessons.length) {
    return 'dailyReport.feedback.missingSchoolLessonTopics';
  }
  if (payload.dayType === 'school') {
    const expandedPairs = new Set(options.expandedDoubleLessonPairs ?? []);
    const lessonsByNumber = new Map(
      payload.lessons.map((lesson) => [lesson.lesson, lesson]),
    );
    const hasMissingTopics = payload.lessons.some((lesson) => {
      if (lesson.topics.length) return false;
      if (lesson.lesson % 2 !== 0) return true;

      const previousLesson = lessonsByNumber.get(lesson.lesson - 1);
      if (!previousLesson?.topics.length) return true;

      return (
        expandedPairs.has(lesson.lesson - 1) ||
        previousLesson.subject !== lesson.subject ||
        previousLesson.teacher !== lesson.teacher
      );
    });

    if (hasMissingTopics)
      return 'dailyReport.feedback.missingSchoolLessonTopics';
  }
  return null;
}
