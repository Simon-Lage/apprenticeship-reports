import { z } from 'zod';

import { JsonObject, ensureJsonObject } from '@/shared/common/json';
import { isGermanSubdivisionCode } from '@/shared/absence/german-subdivisions';

const dateSchema = z.string().date();
const dateTimeSchema = z.string().datetime();

const subdivisionCodeSchema = z
  .string()
  .trim()
  .refine((value) => isGermanSubdivisionCode(value), {
    message: 'invalid-subdivision',
  });

const localizedNameSchema = z.object({
  language: z.string().trim().min(2).max(16),
  text: z.string().trim().min(1).max(240),
});

const absenceCatalogEntrySchema = z.object({
  id: z.string().trim().min(1),
  startDate: dateSchema,
  endDate: dateSchema,
  name: z.string().trim().min(1).max(240),
  names: z.array(localizedNameSchema).default([]),
  nationwide: z.boolean(),
  subdivisionCodes: z.array(z.string().trim().min(1)).default([]),
});

const yearlyAbsenceCatalogSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  subdivisionCode: subdivisionCodeSchema,
  fetchedAt: dateTimeSchema,
  publicHolidays: z.array(absenceCatalogEntrySchema).default([]),
  schoolHolidays: z.array(absenceCatalogEntrySchema).default([]),
});

export const manualAbsenceTypeValues = [
  'sick',
  'vacation',
  'public-holiday',
  'school-holiday',
] as const;

export const ManualAbsenceTypeSchema = z.enum(manualAbsenceTypeValues);

const manualAbsenceSchema = z
  .object({
    id: z.string().trim().min(1),
    type: ManualAbsenceTypeSchema,
    startDate: dateSchema,
    endDate: dateSchema,
    label: z.string().trim().max(240).default(''),
    note: z.string().trim().max(2000).nullable().default(null),
    updatedAt: dateTimeSchema,
    createdAt: dateTimeSchema,
  })
  .superRefine((value, context) => {
    if (value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'invalid-range',
      });
    }
  });

const absenceSettingsSchema = z.object({
  subdivisionCode: subdivisionCodeSchema.nullable().default(null),
  lastSyncYear: z.number().int().min(2000).max(2100).nullable().default(null),
  lastSyncedAt: dateTimeSchema.nullable().default(null),
  lastSyncError: z.string().trim().min(1).nullable().default(null),
  autoSyncHolidays: z.boolean().default(true),
  catalogsByYear: z
    .record(z.string().regex(/^\d{4}$/), yearlyAbsenceCatalogSchema)
    .default({}),
  manualAbsences: z.array(manualAbsenceSchema).default([]),
});

export type AbsenceCatalogEntry = z.infer<typeof absenceCatalogEntrySchema>;
export type YearlyAbsenceCatalog = z.infer<typeof yearlyAbsenceCatalogSchema>;
export type ManualAbsence = z.infer<typeof manualAbsenceSchema>;
export type ManualAbsenceType = z.infer<typeof ManualAbsenceTypeSchema>;
export type AbsenceSettings = z.infer<typeof absenceSettingsSchema>;

export function parseAbsenceSettings(values: JsonObject): AbsenceSettings {
  const source =
    typeof values.absence === 'object' && values.absence ? values.absence : {};
  const parsed = absenceSettingsSchema.safeParse(source);

  if (parsed.success) {
    return parsed.data;
  }

  return absenceSettingsSchema.parse({});
}

export function mergeAbsenceSettings(
  values: JsonObject,
  absence: AbsenceSettings,
): JsonObject {
  return ensureJsonObject({
    ...values,
    absence: absenceSettingsSchema.parse(absence),
  });
}

export function resolveOnboardingSubdivisionCode(
  values: JsonObject,
): string | null {
  const onboarding =
    typeof values.onboarding === 'object' && values.onboarding
      ? ensureJsonObject(values.onboarding)
      : {};
  const region =
    typeof onboarding.region === 'object' && onboarding.region
      ? ensureJsonObject(onboarding.region)
      : {};
  const subdivisionCode =
    typeof region.subdivisionCode === 'string' ? region.subdivisionCode : null;

  if (!subdivisionCode || !isGermanSubdivisionCode(subdivisionCode)) {
    return null;
  }

  return subdivisionCode;
}

export function createCatalogYearKey(year: number): string {
  return String(year);
}
