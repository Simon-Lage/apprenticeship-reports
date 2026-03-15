import { z } from 'zod';

import { isGermanSubdivisionCode } from '@/shared/absence/german-subdivisions';
import { ensureJsonObject } from '@/shared/common/json';
import { OnboardingStepDefinition } from '@/shared/onboarding/progress';
import { trainingPeriodStepSchema } from '@/shared/onboarding/training-period';

const requiredTextSchema = z.string().trim().min(1).max(120);
const optionalUrlSchema = z
  .union([z.string().trim().url().max(2048), z.literal('')])
  .transform((value) => (value === '' ? null : value));
const optionalEmailSchema = z
  .union([z.string().trim().email().max(320), z.literal('')])
  .transform((value) => (value === '' ? null : value));
const requiredEmailSchema = z
  .string()
  .trim()
  .min(1)
  .max(320)
  .refine((value) => z.string().email().safeParse(value).success, {
    message: 'invalid-email',
  });
const identitySchema = z
  .object({
    firstName: requiredTextSchema,
    lastName: requiredTextSchema,
  })
  .transform((value) => ensureJsonObject(value));

const trainingPeriodSchema = trainingPeriodStepSchema.transform((value) =>
  ensureJsonObject(value),
);

const regionSchema = z
  .object({
    subdivisionCode: z
      .string()
      .trim()
      .refine((value) => isGermanSubdivisionCode(value), {
        message: 'invalid-subdivision',
      }),
  })
  .transform((value) => ensureJsonObject(value));

const workplaceSchema = z
  .object({
    department: requiredTextSchema,
    trainerEmail: requiredEmailSchema,
    ihkLink: optionalUrlSchema,
  })
  .transform((value) => ensureJsonObject(value));

const googleSchema = z
  .object({
    linked: z.boolean().default(false),
    email: optionalEmailSchema.default(null),
  })
  .transform((value) => ensureJsonObject(value));

const defaultOnboardingSteps: OnboardingStepDefinition[] = [
  {
    id: 'google',
    optional: true,
    schema: googleSchema,
  },
  {
    id: 'identity',
    schema: identitySchema,
  },
  {
    id: 'training-period',
    schema: trainingPeriodSchema,
  },
  {
    id: 'region',
    schema: regionSchema,
  },
  {
    id: 'workplace',
    schema: workplaceSchema,
  },
];

export default defaultOnboardingSteps;
