import { z } from 'zod';

import { ensureJsonObject } from '@/shared/common/json';
import { OnboardingStepDefinition } from '@/shared/onboarding/progress';

const requiredTextSchema = z.string().trim().min(1).max(120);
const optionalTextSchema = z
  .union([z.string().trim().min(1).max(240), z.literal('')])
  .transform((value) => (value === '' ? null : value));
const optionalUrlSchema = z
  .union([z.string().trim().url().max(2048), z.literal('')])
  .transform((value) => (value === '' ? null : value));
const optionalEmailSchema = z
  .union([z.string().trim().email().max(320), z.literal('')])
  .transform((value) => (value === '' ? null : value));
const dateSchema = z.string().date();

const identitySchema = z
  .object({
    firstName: requiredTextSchema,
    lastName: requiredTextSchema,
  })
  .transform((value) => ensureJsonObject(value));

const trainingPeriodSchema = z
  .object({
    trainingStart: dateSchema,
    trainingEnd: dateSchema,
  })
  .superRefine((value, context) => {
    if (value.trainingEnd < value.trainingStart) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['trainingEnd'],
        message: 'Das Ausbildungsende muss nach dem Ausbildungsstart liegen.',
      });
    }
  })
  .transform((value) => ensureJsonObject(value));

const workplaceSchema = z
  .object({
    department: optionalTextSchema,
    trainerEmail: optionalEmailSchema,
    ihkLink: optionalUrlSchema,
  })
  .transform((value) => ensureJsonObject(value));

export const defaultOnboardingSteps: OnboardingStepDefinition[] = [
  {
    id: 'identity',
    schema: identitySchema,
  },
  {
    id: 'training-period',
    schema: trainingPeriodSchema,
  },
  {
    id: 'workplace',
    optional: true,
    schema: workplaceSchema,
  },
];
