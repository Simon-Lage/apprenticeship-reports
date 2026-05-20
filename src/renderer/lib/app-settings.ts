import { z } from 'zod';

import { isGermanSubdivisionCode } from '@/shared/absence/german-subdivisions';
import { ensureJsonObject, JsonObject } from '@/shared/common/json';
import {
  companyLogoStepValuesSchema,
  CompanyLogoStepValues,
} from '@/shared/onboarding/company-logo';

export const weekDayKeys = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const;

export type WeekDayKey = (typeof weekDayKeys)[number];

const timetableSlotSchema = z.object({
  lesson: z.number().int().min(1).max(12),
  subject: z.string().trim().max(120).default(''),
  teacher: z.string().trim().max(120).default(''),
});

const timetableDaySchema = z.array(timetableSlotSchema);

const timetableSchema = z.object({
  monday: timetableDaySchema.default([]),
  tuesday: timetableDaySchema.default([]),
  wednesday: timetableDaySchema.default([]),
  thursday: timetableDaySchema.default([]),
  friday: timetableDaySchema.default([]),
});

const uiSettingsSchema = z.object({
  defaultDepartment: z.string().trim().max(120).default(''),
  supervisorEmailPrimary: z.string().trim().max(320).default(''),
  teachers: z.array(z.string().trim().min(1).max(120)).default([]),
  subjects: z.array(z.string().trim().min(1).max(120)).default([]),
  timetable: timetableSchema.default({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
  }),
});

const onboardingTrainingPeriodSchema = z.object({
  trainingStart: z.string().date().nullable(),
  trainingEnd: z.string().date().nullable(),
  reportsSince: z.string().date().nullable(),
});

const onboardingIdentitySchema = z.object({
  firstName: z.string().trim().min(1).max(120).nullable(),
  lastName: z.string().trim().min(1).max(120).nullable(),
  apprenticeIdentifier: z.string().trim().regex(/^\d+$/).max(32).nullable(),
  profession: z.string().trim().min(1).max(120).nullable(),
});

const onboardingWorkplaceSchema = z.object({
  department: z.string().trim().min(1).max(120).nullable(),
  trainerEmail: z.string().trim().email().max(320).nullable(),
  ihkLink: z.string().trim().url().max(2048).nullable(),
});

const onboardingRegionSchema = z.object({
  subdivisionCode: z.string().trim().min(1).max(16).nullable(),
  autoSyncHolidays: z.boolean(),
});

export type TimetableSlot = z.infer<typeof timetableSlotSchema>;
export type UiSettingsValues = z.infer<typeof uiSettingsSchema>;
export type OnboardingTrainingPeriodValues = z.infer<
  typeof onboardingTrainingPeriodSchema
>;
export type OnboardingIdentityValues = z.infer<typeof onboardingIdentitySchema>;
export type OnboardingWorkplaceValues = z.infer<
  typeof onboardingWorkplaceSchema
>;
export type OnboardingRegionValues = z.infer<typeof onboardingRegionSchema>;
export type OnboardingCompanyLogoValues = CompanyLogoStepValues;
export type ResolvedWorkplaceSettingsValues = {
  department: string;
  trainerEmail: string;
  ihkLink: string;
};
export type UiCatalogEntryKind = 'teacher' | 'subject';

function normalizeSubdivisionOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || !isGermanSubdivisionCode(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeUrlOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = z.string().trim().url().max(2048).safeParse(value);
  return parsed.success ? parsed.data : null;
}

function uniqStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeDateOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = z.string().date().safeParse(value.trim());
  return parsed.success ? parsed.data : null;
}

function normalizeEmailOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = z.string().trim().email().max(320).safeParse(value);
  return parsed.success ? parsed.data : null;
}

function normalizeTextOrNull(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > maxLength) {
    return null;
  }

  return normalized;
}

function normalizeApprenticeIdentifierOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > 32 || !/^\d+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeUiCatalogValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqStrings(
    value.filter((entry): entry is string => typeof entry === 'string'),
  );
}

function normalizeTimetableDay(value: unknown): TimetableSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const byLesson = new Map<number, TimetableSlot>();

  value.forEach((entry) => {
    const parsed = timetableSlotSchema.safeParse(entry);

    if (!parsed.success) {
      return;
    }

    byLesson.set(parsed.data.lesson, parsed.data);
  });

  return [...byLesson.values()].sort(
    (left, right) => left.lesson - right.lesson,
  );
}

export function parseUiSettings(values: JsonObject): UiSettingsValues {
  const appUi = ensureJsonObject(values.appUi ?? {});
  const timetable = ensureJsonObject(appUi.timetable ?? {});
  const parsed = uiSettingsSchema.parse({
    defaultDepartment: normalizeTextOrNull(appUi.defaultDepartment, 120) ?? '',
    supervisorEmailPrimary:
      normalizeEmailOrNull(appUi.supervisorEmailPrimary) ?? '',
    teachers: normalizeUiCatalogValues(appUi.teachers),
    subjects: normalizeUiCatalogValues(appUi.subjects),
    timetable: {
      monday: normalizeTimetableDay(timetable.monday),
      tuesday: normalizeTimetableDay(timetable.tuesday),
      wednesday: normalizeTimetableDay(timetable.wednesday),
      thursday: normalizeTimetableDay(timetable.thursday),
      friday: normalizeTimetableDay(timetable.friday),
    },
  });

  return {
    ...parsed,
    teachers: uniqStrings(parsed.teachers),
    subjects: uniqStrings(parsed.subjects),
    timetable: {
      monday: parsed.timetable.monday,
      tuesday: parsed.timetable.tuesday,
      wednesday: parsed.timetable.wednesday,
      thursday: parsed.timetable.thursday,
      friday: parsed.timetable.friday,
    },
  };
}

export function parseOnboardingTrainingPeriod(
  values: JsonObject,
): OnboardingTrainingPeriodValues {
  const onboarding = ensureJsonObject(values.onboarding ?? {});
  const trainingPeriod = ensureJsonObject(onboarding['training-period'] ?? {});

  return onboardingTrainingPeriodSchema.parse({
    trainingStart: normalizeDateOrNull(trainingPeriod.trainingStart),
    trainingEnd: normalizeDateOrNull(trainingPeriod.trainingEnd),
    reportsSince: normalizeDateOrNull(trainingPeriod.reportsSince),
  });
}

export function parseOnboardingIdentity(
  values: JsonObject,
): OnboardingIdentityValues {
  const onboarding = ensureJsonObject(values.onboarding ?? {});
  const identity = ensureJsonObject(onboarding.identity ?? {});

  return onboardingIdentitySchema.parse({
    firstName: normalizeTextOrNull(identity.firstName, 120),
    lastName: normalizeTextOrNull(identity.lastName, 120),
    apprenticeIdentifier: normalizeApprenticeIdentifierOrNull(
      identity.apprenticeIdentifier,
    ),
    profession: normalizeTextOrNull(identity.profession, 120),
  });
}

export function parseOnboardingWorkplace(
  values: JsonObject,
): OnboardingWorkplaceValues {
  const onboarding = ensureJsonObject(values.onboarding ?? {});
  const workplace = ensureJsonObject(onboarding.workplace ?? {});

  return onboardingWorkplaceSchema.parse({
    department:
      typeof workplace.department === 'string' &&
      workplace.department.trim().length
        ? workplace.department
        : null,
    trainerEmail: normalizeEmailOrNull(workplace.trainerEmail),
    ihkLink: normalizeUrlOrNull(workplace.ihkLink),
  });
}

export function resolveWorkplaceSettingsValues(
  values: JsonObject,
): ResolvedWorkplaceSettingsValues {
  const uiSettings = parseUiSettings(values);
  const workplace = parseOnboardingWorkplace(values);

  return {
    department: workplace.department ?? uiSettings.defaultDepartment,
    trainerEmail: workplace.trainerEmail ?? uiSettings.supervisorEmailPrimary,
    ihkLink: workplace.ihkLink ?? '',
  };
}

export function parseOnboardingRegion(
  values: JsonObject,
): OnboardingRegionValues {
  const onboarding = ensureJsonObject(values.onboarding ?? {});
  const region = ensureJsonObject(onboarding.region ?? {});

  return onboardingRegionSchema.parse({
    subdivisionCode: normalizeSubdivisionOrNull(region.subdivisionCode),
    autoSyncHolidays:
      typeof region.autoSyncHolidays === 'boolean'
        ? region.autoSyncHolidays
        : true,
  });
}

export function parseOnboardingCompanyLogo(
  values: JsonObject,
): OnboardingCompanyLogoValues {
  const onboarding = ensureJsonObject(values.onboarding ?? {});
  const companyLogo = ensureJsonObject(onboarding['company-logo'] ?? {});
  const parsed = companyLogoStepValuesSchema.safeParse(companyLogo);

  return parsed.success ? parsed.data : { dataUrl: null };
}

export function mergeUiSettings(
  values: JsonObject,
  uiSettings: UiSettingsValues,
): JsonObject {
  return {
    ...values,
    appUi: {
      ...uiSettings,
      teachers: uniqStrings(uiSettings.teachers),
      subjects: uniqStrings(uiSettings.subjects),
    },
  };
}

export function renameUiCatalogEntry(input: {
  uiSettings: UiSettingsValues;
  kind: UiCatalogEntryKind;
  currentValue: string;
  nextValue: string;
}): UiSettingsValues {
  const currentValue = input.currentValue.trim();
  const nextValue = input.nextValue.trim();

  if (!currentValue || !nextValue) {
    return input.uiSettings;
  }

  const listKey = input.kind === 'teacher' ? 'teachers' : 'subjects';
  const slotKey = input.kind === 'teacher' ? 'teacher' : 'subject';
  const nextCatalogValues = uniqStrings(
    input.uiSettings[listKey].map((value) =>
      value.trim() === currentValue ? nextValue : value,
    ),
  );

  return {
    ...input.uiSettings,
    [listKey]: nextCatalogValues,
    timetable: Object.fromEntries(
      weekDayKeys.map((day) => [
        day,
        input.uiSettings.timetable[day].map((slot) =>
          slot[slotKey].trim() === currentValue
            ? {
                ...slot,
                [slotKey]: nextValue,
              }
            : slot,
        ),
      ]),
    ) as UiSettingsValues['timetable'],
  };
}

export function mergeUiCatalogWithLessonValues(input: {
  uiSettings: UiSettingsValues;
  lessons: Array<{ subject: string; teacher: string }>;
}): UiSettingsValues {
  const nextTeachers = uniqStrings([
    ...input.uiSettings.teachers,
    ...input.lessons.map((lesson) => lesson.teacher),
  ]);
  const nextSubjects = uniqStrings([
    ...input.uiSettings.subjects,
    ...input.lessons.map((lesson) => lesson.subject),
  ]);

  if (
    nextTeachers.length === input.uiSettings.teachers.length &&
    nextSubjects.length === input.uiSettings.subjects.length &&
    nextTeachers.every(
      (value, index) => value === input.uiSettings.teachers[index],
    ) &&
    nextSubjects.every(
      (value, index) => value === input.uiSettings.subjects[index],
    )
  ) {
    return input.uiSettings;
  }

  return {
    ...input.uiSettings,
    teachers: nextTeachers,
    subjects: nextSubjects,
  };
}

export function mergeOnboardingIntoUiSettings(input: {
  values: JsonObject;
  onboardingValues: JsonObject;
}): UiSettingsValues {
  const parsed = parseUiSettings(input.values);
  const onboardingWorkplace =
    typeof input.onboardingValues.workplace === 'object' &&
    input.onboardingValues.workplace
      ? (input.onboardingValues.workplace as JsonObject)
      : {};
  const trainerEmail =
    typeof onboardingWorkplace.trainerEmail === 'string'
      ? onboardingWorkplace.trainerEmail
      : '';

  return {
    ...parsed,
    defaultDepartment:
      typeof onboardingWorkplace.department === 'string'
        ? onboardingWorkplace.department
        : parsed.defaultDepartment,
    supervisorEmailPrimary: trainerEmail || parsed.supervisorEmailPrimary,
  };
}

export function mergeOnboardingSettings(input: {
  values: JsonObject;
  identity: OnboardingIdentityValues;
  trainingPeriod: OnboardingTrainingPeriodValues;
  workplace: OnboardingWorkplaceValues;
  region: OnboardingRegionValues;
  companyLogo?: OnboardingCompanyLogoValues;
}): JsonObject {
  const onboarding = ensureJsonObject(input.values.onboarding ?? {});
  const nextOnboarding: JsonObject = {
    ...onboarding,
    identity: {
      firstName: input.identity.firstName,
      lastName: input.identity.lastName,
      apprenticeIdentifier: input.identity.apprenticeIdentifier,
      profession: input.identity.profession,
    },
    'training-period': {
      trainingStart: input.trainingPeriod.trainingStart,
      trainingEnd: input.trainingPeriod.trainingEnd,
      reportsSince: input.trainingPeriod.reportsSince,
    },
    workplace: {
      department: input.workplace.department,
      trainerEmail: input.workplace.trainerEmail,
      ihkLink: input.workplace.ihkLink,
    },
    region: {
      subdivisionCode: input.region.subdivisionCode,
      autoSyncHolidays: input.region.autoSyncHolidays,
    },
  };

  const absence = ensureJsonObject(input.values.absence ?? {});

  if (input.companyLogo) {
    nextOnboarding['company-logo'] = {
      dataUrl: input.companyLogo.dataUrl,
    };
  }

  return {
    ...input.values,
    absence: {
      ...absence,
      autoSyncHolidays: input.region.autoSyncHolidays,
    },
    onboarding: nextOnboarding,
  };
}
