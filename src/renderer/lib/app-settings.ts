import { z } from 'zod';

import { JsonObject } from '@/shared/common/json';

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
  supervisorEmailSecondary: z.string().trim().max(320).default(''),
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

export type TimetableSlot = z.infer<typeof timetableSlotSchema>;
export type UiSettingsValues = z.infer<typeof uiSettingsSchema>;

function uniqStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right),
  );
}

export function parseUiSettings(values: JsonObject): UiSettingsValues {
  const appUi = typeof values.appUi === 'object' && values.appUi ? values.appUi : {};
  const parsed = uiSettingsSchema.parse(appUi);

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

export function mergeOnboardingIntoUiSettings(input: {
  values: JsonObject;
  onboardingValues: JsonObject;
}): UiSettingsValues {
  const parsed = parseUiSettings(input.values);
  const onboardingIdentity =
    typeof input.onboardingValues.identity === 'object' &&
    input.onboardingValues.identity
      ? (input.onboardingValues.identity as JsonObject)
      : {};
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
    supervisorEmailPrimary:
      trainerEmail || parsed.supervisorEmailPrimary,
    supervisorEmailSecondary:
      typeof onboardingIdentity.lastName === 'string' &&
      onboardingIdentity.lastName.trim().length
        ? parsed.supervisorEmailSecondary
        : parsed.supervisorEmailSecondary,
  };
}
