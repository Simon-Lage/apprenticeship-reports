import { z } from 'zod';

import { isGermanSubdivisionCode } from '@/shared/absence/german-subdivisions';
import { JsonObject } from '@/shared/common/json';
import { trainingPeriodStepSchema } from '@/shared/onboarding/training-period';

export type OnboardingStepId =
  | 'google'
  | 'identity'
  | 'training-period'
  | 'region'
  | 'workplace';

const googleSchema = z.object({
  linked: z.boolean(),
  email: z
    .string()
    .trim()
    .max(320)
    .nullable()
    .refine(
      (value) => value === null || z.string().email().safeParse(value).success,
      {
        message: 'invalid-email',
      },
    ),
});

const identitySchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

const trainingPeriodSchema = trainingPeriodStepSchema;

const regionSchema = z.object({
  subdivisionCode: z
    .string()
    .trim()
    .refine((value) => isGermanSubdivisionCode(value), {
      message: 'invalid-subdivision',
    }),
});

const workplaceSchema = z.object({
  department: z
    .string()
    .trim()
    .min(1, { message: 'required-department' })
    .max(120),
  trainerEmail: z
    .string()
    .trim()
    .min(1, { message: 'required-trainer-email' })
    .max(320)
    .refine((value) => z.string().email().safeParse(value).success, {
      message: 'invalid-email',
    }),
  ihkLink: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => !value || z.string().url().safeParse(value).success, {
      message: 'invalid-url',
    }),
});

export const onboardingStepOrder: OnboardingStepId[] = [
  'google',
  'identity',
  'training-period',
  'region',
  'workplace',
];

export const optionalOnboardingSteps: OnboardingStepId[] = ['google'];

export function parseOnboardingStepValues(
  stepId: OnboardingStepId,
  value: unknown,
): JsonObject {
  if (stepId === 'google') {
    const parsedValue = value as Record<string, unknown>;
    return googleSchema.parse({
      linked: String(parsedValue.linked ?? 'false') === 'true',
      email:
        typeof parsedValue.email === 'string' && parsedValue.email.trim().length
          ? parsedValue.email.trim()
          : null,
    });
  }

  if (stepId === 'identity') {
    return identitySchema.parse(value);
  }

  if (stepId === 'training-period') {
    return trainingPeriodSchema.parse(value);
  }

  if (stepId === 'region') {
    return regionSchema.parse(value);
  }

  return workplaceSchema.parse(value);
}

export function getOnboardingStepDefaults(input: {
  stepId: OnboardingStepId;
  source: JsonObject;
  authProvider: string | null;
}): Record<string, string> {
  if (input.stepId === 'identity') {
    return {
      firstName:
        typeof input.source.firstName === 'string'
          ? input.source.firstName
          : '',
      lastName:
        typeof input.source.lastName === 'string' ? input.source.lastName : '',
    };
  }

  if (input.stepId === 'training-period') {
    return {
      trainingStart:
        typeof input.source.trainingStart === 'string'
          ? input.source.trainingStart
          : '',
      trainingEnd:
        typeof input.source.trainingEnd === 'string'
          ? input.source.trainingEnd
          : '',
      reportsSince:
        typeof input.source.reportsSince === 'string'
          ? input.source.reportsSince
          : '',
    };
  }

  if (input.stepId === 'google') {
    const linkedFromSource =
      typeof input.source.linked === 'boolean' ? input.source.linked : null;
    const linked = linkedFromSource ?? input.authProvider === 'google';

    return {
      linked: linked ? 'true' : 'false',
      email: typeof input.source.email === 'string' ? input.source.email : '',
    };
  }

  if (input.stepId === 'region') {
    return {
      subdivisionCode:
        typeof input.source.subdivisionCode === 'string'
          ? input.source.subdivisionCode
          : '',
    };
  }

  return {
    department:
      typeof input.source.department === 'string'
        ? input.source.department
        : '',
    trainerEmail:
      typeof input.source.trainerEmail === 'string'
        ? input.source.trainerEmail
        : '',
    ihkLink:
      typeof input.source.ihkLink === 'string' ? input.source.ihkLink : '',
  };
}
