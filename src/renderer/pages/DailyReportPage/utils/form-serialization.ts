import { normalizeLessons } from '@/renderer/lib/report-values';
import normalizeEntryList from './entry-list';
import { DailyReportFormState } from './form-model';

export default function serializeDailyFormState(
  form: DailyReportFormState,
): string {
  return JSON.stringify({
    date: form.date,
    dayType: form.dayType,
    freeReason: form.freeReason,
    activities: normalizeEntryList(form.activities),
    trainings: normalizeEntryList(form.trainings),
    schoolTopics: normalizeEntryList(form.schoolTopics),
    lessons: normalizeLessons(
      form.lessons.map((lesson) => ({
        ...lesson,
        topics: normalizeEntryList(lesson.topics),
      })),
    ),
    expandedDoubleLessonPairs: [...form.expandedDoubleLessonPairs].sort(
      (left, right) => left - right,
    ),
    activityDraft: form.activityDraft,
    trainingDraft: form.trainingDraft,
    schoolTopicDraft: form.schoolTopicDraft,
  });
}
