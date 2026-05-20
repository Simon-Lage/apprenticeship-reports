import { z } from 'zod';

const dateSchema = z.string().date();

const optionalDateSchema = z
  .union([z.string().date(), z.literal(''), z.null(), z.undefined()])
  .transform((value) =>
    typeof value === 'string' && value.length ? value : null,
  );

export const trainingPeriodStepSchema = z
  .object({
    trainingStart: dateSchema,
    trainingEnd: dateSchema,
    reportsSince: optionalDateSchema,
  })
  .superRefine((value, context) => {
    if (value.trainingEnd < value.trainingStart) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['trainingEnd'],
        message: 'invalid-range',
      });
    }

    if (
      value.reportsSince &&
      (value.reportsSince < value.trainingStart ||
        value.reportsSince > value.trainingEnd)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reportsSince'],
        message: 'invalid-reports-since-range',
      });
    }
  });

export type TrainingPeriodStepValues = z.infer<typeof trainingPeriodStepSchema>;
