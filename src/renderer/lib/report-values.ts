import { z } from 'zod';

import {
  DailyReportRecord,
  ReportsState,
  WeeklyReportRecord,
} from '@/shared/reports/models';

export const dayTypeValues = ['work', 'school', 'free'] as const;
export type DayTypeValue = (typeof dayTypeValues)[number];

const schoolLessonSchema = z.object({
  lesson: z.number().int().min(1).max(12),
  subject: z.string().trim().max(120).default(''),
  teacher: z.string().trim().max(120).default(''),
  topic: z.string().trim().max(240).default(''),
});

const dailyReportValuesSchema = z.object({
  dayType: z.enum(dayTypeValues).default('work'),
  freeReason: z.string().trim().max(240).default(''),
  activities: z.array(z.string().trim().min(1).max(240)).default([]),
  schoolTopics: z.array(z.string().trim().min(1).max(240)).default([]),
  trainings: z.array(z.string().trim().min(1).max(240)).default([]),
  lessons: z.array(schoolLessonSchema).default([]),
});

const weeklyReportValuesSchema = z.object({
  reportDate: z.string().trim().max(30).default(''),
  area: z.string().trim().max(120).default(''),
  supervisorEmailPrimary: z.string().trim().max(320).default(''),
  supervisorEmailSecondary: z.string().trim().max(320).default(''),
  submitted: z.boolean().default(false),
  submittedToEmail: z.string().trim().max(320).nullable().default(null),
  workActivities: z.array(z.string().trim().min(1).max(240)).default([]),
  schoolTopics: z.array(z.string().trim().min(1).max(240)).default([]),
  trainings: z.array(z.string().trim().min(1).max(240)).default([]),
  notes: z.string().trim().max(4000).default(''),
});

export type DailyReportValues = z.infer<typeof dailyReportValuesSchema>;
export type WeeklyReportValues = z.infer<typeof weeklyReportValuesSchema>;
export type SchoolLessonInput = z.infer<typeof schoolLessonSchema>;

function uniqValues(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export function normalizeLessons(
  lessons: SchoolLessonInput[],
): SchoolLessonInput[] {
  const byLesson = [...lessons].sort(
    (left, right) => left.lesson - right.lesson,
  );
  const result: SchoolLessonInput[] = [];

  byLesson.forEach((lesson) => {
    const previous = result[result.length - 1];
    const normalized = schoolLessonSchema.parse(lesson);

    if (
      previous &&
      !normalized.topic.trim().length &&
      normalized.subject === previous.subject &&
      normalized.teacher === previous.teacher &&
      previous.topic.trim().length
    ) {
      result.push({
        ...normalized,
        topic: previous.topic,
      });
      return;
    }

    result.push(normalized);
  });

  return result;
}

export function parseDailyReportValues(values: unknown): DailyReportValues {
  const parsed = dailyReportValuesSchema.parse(values ?? {});

  return {
    ...parsed,
    activities: uniqValues(parsed.activities),
    schoolTopics: uniqValues(parsed.schoolTopics),
    trainings: uniqValues(parsed.trainings),
    lessons: normalizeLessons(parsed.lessons),
  };
}

export function parseWeeklyReportValues(values: unknown): WeeklyReportValues {
  const parsed = weeklyReportValuesSchema.parse(values ?? {});

  return {
    ...parsed,
    workActivities: uniqValues(parsed.workActivities),
    schoolTopics: uniqValues(parsed.schoolTopics),
    trainings: uniqValues(parsed.trainings),
  };
}

export type WeekWithReports = {
  weeklyReport: WeeklyReportRecord;
  dailyReports: DailyReportRecord[];
};

export type WeeklyAggregates = {
  workActivities: string[];
  trainings: string[];
  schoolTopics: string[];
};

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (parsed.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return parsed;
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function listWeekDates(weekStart: string, weekEnd: string): string[] {
  const startDate = parseIsoDate(weekStart);
  const endDate = parseIsoDate(weekEnd);

  if (!startDate || !endDate || weekStart > weekEnd) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(startDate.getTime());

  while (toIsoDate(cursor) <= weekEnd) {
    dates.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function buildWeeklyAggregates(
  dailyReports: DailyReportRecord[],
): WeeklyAggregates {
  const workActivities: string[] = [];
  const trainings: string[] = [];
  const schoolTopics: string[] = [];
  const seenWork = new Set<string>();
  const seenTraining = new Set<string>();
  const seenSchool = new Set<string>();

  dailyReports
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((dailyReport) => {
      const parsed = parseDailyReportValues(dailyReport.values);

      parsed.activities.forEach((value) => {
        if (!seenWork.has(value)) {
          seenWork.add(value);
          workActivities.push(value);
        }
      });

      parsed.trainings.forEach((value) => {
        if (!seenTraining.has(value)) {
          seenTraining.add(value);
          trainings.push(value);
        }
      });

      parsed.schoolTopics.forEach((value) => {
        if (!seenSchool.has(value)) {
          seenSchool.add(value);
          schoolTopics.push(value);
        }
      });

      parsed.lessons.forEach((lesson) => {
        const topic = lesson.topic.trim();

        if (!topic.length) {
          return;
        }

        const value = `${lesson.subject}: ${topic}`;
        if (!seenSchool.has(value)) {
          seenSchool.add(value);
          schoolTopics.push(value);
        }
      });
    });

  return {
    workActivities,
    trainings,
    schoolTopics,
  };
}

export function listWeeksWithDailyReports(
  reports: ReportsState,
): WeekWithReports[] {
  return Object.values(reports.weeklyReports)
    .map((weeklyReport) => {
      const dailyReports = weeklyReport.dailyReportIds
        .map((dailyReportId) => reports.dailyReports[dailyReportId])
        .filter((dailyReport): dailyReport is DailyReportRecord =>
          Boolean(dailyReport),
        )
        .sort((left, right) => left.date.localeCompare(right.date));

      return {
        weeklyReport,
        dailyReports,
      };
    })
    .sort((left, right) =>
      left.weeklyReport.weekStart.localeCompare(right.weeklyReport.weekStart),
    );
}

export function collectActivitySuggestions(
  reports: ReportsState,
  dayType: DayTypeValue,
): string[] {
  const suggestions = new Set<string>();

  Object.values(reports.dailyReports).forEach((dailyReport) => {
    const parsed = parseDailyReportValues(dailyReport.values);

    if (parsed.dayType !== dayType) {
      return;
    }

    parsed.activities.forEach((value) => suggestions.add(value));
    parsed.schoolTopics.forEach((value) => suggestions.add(value));
    parsed.trainings.forEach((value) => suggestions.add(value));
  });

  return Array.from(suggestions).sort((left, right) =>
    left.localeCompare(right),
  );
}
