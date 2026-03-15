import { DayTypeValue, SchoolLessonInput } from '@/renderer/lib/report-values';

export type DailyReportFormState = {
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
