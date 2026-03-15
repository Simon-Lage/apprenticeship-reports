import { DayTypeValue, SchoolLessonInput } from '@/renderer/lib/report-values';

export type DailyReportFormState = {
  weekStart: string;
  weekEnd: string;
  date: string;
  dayType: DayTypeValue;
  freeReason: string;
  activityDraft: string;
  trainingDraft: string;
  schoolTopicDraft: string;
  activities: string[];
  trainings: string[];
  schoolTopics: string[];
  lessons: SchoolLessonInput[];
};

export const defaultDailyReportFormState: DailyReportFormState = {
  weekStart: '',
  weekEnd: '',
  date: '',
  dayType: 'work',
  freeReason: '',
  activityDraft: '',
  trainingDraft: '',
  schoolTopicDraft: '',
  activities: [],
  trainings: [],
  schoolTopics: [],
  lessons: [],
};

export function toDayKey(dateValue: string) {
  if (!dateValue) {
    return null;
  }
  const day = new Date(dateValue).getDay();
  if (day === 1) return 'monday';
  if (day === 2) return 'tuesday';
  if (day === 3) return 'wednesday';
  if (day === 4) return 'thursday';
  if (day === 5) return 'friday';
  return null;
}
