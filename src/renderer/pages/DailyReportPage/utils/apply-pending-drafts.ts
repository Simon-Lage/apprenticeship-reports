import { DailyReportFormState } from './form-model';
import { normalizeDraftEntry } from './lesson-utils';

function resolveDraftKey(
  key: 'activities' | 'trainings' | 'schoolTopics',
): 'activityDraft' | 'trainingDraft' | 'schoolTopicDraft' {
  if (key === 'activities') return 'activityDraft';
  if (key === 'trainings') return 'trainingDraft';
  return 'schoolTopicDraft';
}

export default function applyPendingDrafts(input: {
  sourceForm: DailyReportFormState;
  sourceLessonTopicDrafts: Record<number, string>;
}): {
  form: DailyReportFormState;
  lessonTopicDrafts: Record<number, string>;
  changed: boolean;
} {
  const nextForm: DailyReportFormState = {
    ...input.sourceForm,
    activities: [...input.sourceForm.activities],
    trainings: [...input.sourceForm.trainings],
    schoolTopics: [...input.sourceForm.schoolTopics],
    lessons: input.sourceForm.lessons.map((lesson) => ({
      ...lesson,
      topics: [...lesson.topics],
    })),
  };
  const nextLessonTopicDrafts = { ...input.sourceLessonTopicDrafts };
  let changed = false;

  (['activities', 'trainings', 'schoolTopics'] as const).forEach((key) => {
    const draftKey = resolveDraftKey(key);
    const normalizedDraft = normalizeDraftEntry(nextForm[draftKey]);
    if (normalizedDraft && !nextForm[key].includes(normalizedDraft)) {
      nextForm[key] = [...nextForm[key], normalizedDraft];
      changed = true;
    }
    if (nextForm[draftKey] !== '') {
      nextForm[draftKey] = '';
      changed = true;
    }
  });

  nextForm.lessons.forEach((lesson) => {
    const normalizedDraft = normalizeDraftEntry(
      nextLessonTopicDrafts[lesson.lesson] ?? '',
    );
    if (normalizedDraft && !lesson.topics.includes(normalizedDraft)) {
      lesson.topics = [...lesson.topics, normalizedDraft];
      changed = true;
    }
    if (
      Object.prototype.hasOwnProperty.call(
        nextLessonTopicDrafts,
        lesson.lesson,
      ) &&
      nextLessonTopicDrafts[lesson.lesson] !== ''
    ) {
      nextLessonTopicDrafts[lesson.lesson] = '';
      changed = true;
    }
  });

  return { form: nextForm, lessonTopicDrafts: nextLessonTopicDrafts, changed };
}
