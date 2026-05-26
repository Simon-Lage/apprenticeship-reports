import { z } from 'zod';

export const IhkOselgbCredentialStatusSchema = z.object({
  encryptionAvailable: z.boolean(),
  passwordConfigured: z.boolean(),
});

export const SetIhkOselgbPasswordInputSchema = z.object({
  password: z.string().min(1).max(128),
});

export const SaveIhkOselgbWeeklyReportInputSchema = z.object({
  weekStart: z.string().date(),
  weekEnd: z.string().date(),
  area: z.string().trim().min(1).max(120),
  supervisorEmail: z.string().trim().email().max(320),
  workText: z.string().max(8000).default(''),
  trainingText: z.string().max(8000).default(''),
  schoolText: z.string().max(8000).default(''),
});

export const IhkOselgbSaveSkippedReasonSchema = z.enum([
  'unsupported-link',
  'password-missing',
  'apprentice-identifier-missing',
  'encryption-unavailable',
]);

export const IhkOselgbSaveResultSchema = z.object({
  saved: z.boolean(),
  skippedReason: IhkOselgbSaveSkippedReasonSchema.nullable().default(null),
});

export type IhkOselgbCredentialStatus = z.infer<
  typeof IhkOselgbCredentialStatusSchema
>;
export type SetIhkOselgbPasswordInput = z.infer<
  typeof SetIhkOselgbPasswordInputSchema
>;
export type SaveIhkOselgbWeeklyReportInput = z.infer<
  typeof SaveIhkOselgbWeeklyReportInputSchema
>;
export type IhkOselgbSaveResult = z.infer<typeof IhkOselgbSaveResultSchema>;

export function isIhkOselgbLink(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === 'bildung-ihk-oselgb.de' ||
      hostname.endsWith('.bildung-ihk-oselgb.de')
    );
  } catch {
    return false;
  }
}
