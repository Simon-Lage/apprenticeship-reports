import { z } from 'zod';

import { JsonObject } from '@/shared/common/json';

export type OnboardingStepId =
  | 'google'
  | 'identity'
  | 'training-period'
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

const trainingPeriodSchema = z
  .object({
    trainingStart: z.string().date(),
    trainingEnd: z.string().date(),
  })
  .superRefine((value, context) => {
    if (value.trainingEnd < value.trainingStart) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['trainingEnd'],
        message: 'invalid-range',
      });
    }
  });

const workplaceSchema = z.object({
  department: z.string().trim().max(120),
  trainerEmail: z
    .string()
    .trim()
    .max(320)
    .refine((value) => !value || z.string().email().safeParse(value).success, {
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
  'workplace',
];

export const optionalOnboardingSteps: OnboardingStepId[] = [
  'google',
  'workplace',
];

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
