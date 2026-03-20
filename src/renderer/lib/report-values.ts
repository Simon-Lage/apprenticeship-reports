import { z } from 'zod';

import {
  DailyReportRecord,
  ReportsState,
  WeeklyReportRecord,
} from '@/shared/reports/models';

export const dayTypeValues = ['work', 'school', 'free'] as const;
export type DayTypeValue = (typeof dayTypeValues)[number];

function uniqValues(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

const schoolLessonSchema = z
  .object({
    lesson: z.number().int().min(1).max(10),
    subject: z.string().trim().max(120).default(''),
    teacher: z.string().trim().max(120).default(''),
    topic: z.string().trim().max(240).optional(),
    topics: z.array(z.string().trim().min(1).max(240)).default([]),
  })
  .transform((value) => ({
    lesson: value.lesson,
    subject: value.subject,
    teacher: value.teacher,
    topics: uniqValues([
      ...value.topics,
      ...(value.topic?.trim().length ? [value.topic] : []),
    ]),
  }));

const dailyReportValuesSchema = z.object({
  dayType: z.enum(dayTypeValues).default('work'),
  freeReason: z.string().trim().max(240).default(''),
  freeDayCategory: z.enum(['work', 'school']).nullable().default(null),
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

export function normalizeLessons(
  lessons: SchoolLessonInput[],
): SchoolLessonInput[] {
  const byLesson = [...lessons]
    .map((lesson) => schoolLessonSchema.parse(lesson))
    .sort((left, right) => left.lesson - right.lesson);

  for (let pairStart = 1; pairStart <= 9; pairStart += 2) {
    const firstIndex = byLesson.findIndex(
      (lesson) => lesson.lesson === pairStart,
    );
    const secondIndex = byLesson.findIndex(
      (lesson) => lesson.lesson === pairStart + 1,
    );

    if (firstIndex >= 0 && secondIndex >= 0) {
      const first = byLesson[firstIndex];
      const second = byLesson[secondIndex];

      if (
        first.subject === second.subject &&
        first.teacher === second.teacher
      ) {
        if (!first.topics.length && second.topics.length) {
          byLesson[firstIndex] = {
            ...first,
            topics: second.topics,
          };
        }

        if (!second.topics.length && first.topics.length) {
          byLesson[secondIndex] = {
            ...second,
            topics: first.topics,
          };
        }
      }
    }
  }

  return byLesson;
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

export type CompleteWeekWithReports = WeekWithReports & {
  trackedDaysCount: number;
  totalDaysCount: number;
};

export type WeeklyAggregates = {
  workActivities: string[];
  trainings: string[];
  schoolTopics: string[];
};

export type WeeklySectionDayEntry = {
  date: string;
  items: string[];
};

export type WeeklySectionDayGroups = {
  work: WeeklySectionDayEntry[];
  trainings: WeeklySectionDayEntry[];
  school: WeeklySectionDayEntry[];
};

function formatFreeDayAggregateValue(reason: string): string {
  return `(${reason.trim() || 'Freier Tag'})`;
}

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

      if (parsed.dayType === 'free') {
        const targetItems =
          parsed.freeDayCategory === 'school' ? schoolTopics : workActivities;
        const targetSet =
          parsed.freeDayCategory === 'school' ? seenSchool : seenWork;
        const value = formatFreeDayAggregateValue(parsed.freeReason);

        if (!targetSet.has(value)) {
          targetSet.add(value);
          targetItems.push(value);
        }

        return;
      }

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
        lesson.topics.forEach((topic) => {
          const value = `${lesson.subject}: ${topic}`;
          if (!seenSchool.has(value)) {
            seenSchool.add(value);
            schoolTopics.push(value);
          }
        });
      });
    });

  return {
    workActivities,
    trainings,
    schoolTopics,
  };
}

export function countTrackedWeekDays(
  weekStart: string,
  weekEnd: string,
  dailyReports: DailyReportRecord[],
): {
  trackedDaysCount: number;
  totalDaysCount: number;
} {
  const weekDates = listWeekDates(weekStart, weekEnd);
  const trackedDates = new Set(
    dailyReports.map((dailyReport) => dailyReport.date),
  );

  return {
    trackedDaysCount: weekDates.filter((date) => trackedDates.has(date)).length,
    totalDaysCount: weekDates.length,
  };
}

export function buildWeeklySectionDayGroups(
  dailyReports: DailyReportRecord[],
): WeeklySectionDayGroups {
  const work: WeeklySectionDayEntry[] = [];
  const trainings: WeeklySectionDayEntry[] = [];
  const school: WeeklySectionDayEntry[] = [];

  dailyReports
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((dailyReport) => {
      const parsed = parseDailyReportValues(dailyReport.values);

      if (parsed.dayType === 'free') {
        const value = formatFreeDayAggregateValue(parsed.freeReason);

        if (parsed.freeDayCategory === 'school') {
          school.push({
            date: dailyReport.date,
            items: [value],
          });
          return;
        }

        work.push({
          date: dailyReport.date,
          items: [value],
        });
        return;
      }

      const schoolItems = uniqValues([
        ...parsed.schoolTopics,
        ...parsed.lessons.flatMap((lesson) =>
          lesson.topics.map((topic) =>
            lesson.subject.trim().length
              ? `${lesson.subject}: ${topic}`
              : topic,
          ),
        ),
      ]);

      if (parsed.activities.length) {
        work.push({
          date: dailyReport.date,
          items: parsed.activities,
        });
      }

      if (parsed.trainings.length) {
        trainings.push({
          date: dailyReport.date,
          items: parsed.trainings,
        });
      }

      if (schoolItems.length) {
        school.push({
          date: dailyReport.date,
          items: schoolItems,
        });
      }
    });

  return {
    work,
    trainings,
    school,
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

export function listCompleteWeeksWithDailyReports(
  reports: ReportsState,
): CompleteWeekWithReports[] {
  return listWeeksWithDailyReports(reports)
    .map((week) => {
      const coverage = countTrackedWeekDays(
        week.weeklyReport.weekStart,
        week.weeklyReport.weekEnd,
        week.dailyReports,
      );

      return {
        ...week,
        ...coverage,
      };
    })
    .filter(
      (week) =>
        week.totalDaysCount === 7 &&
        week.trackedDaysCount === week.totalDaysCount,
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
