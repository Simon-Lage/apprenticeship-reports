import { z } from 'zod';

import { ensureJsonObject, JsonObject } from '@/shared/common/json';

const dateSchema = z.string().date();

function normalizeDateOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = dateSchema.safeParse(value.trim());
  return parsed.success ? parsed.data : null;
}

export function resolveReportStartDateFromSettings(
  values: JsonObject,
): string | null {
  const onboarding = ensureJsonObject(values.onboarding ?? {});
  const trainingPeriod = ensureJsonObject(onboarding['training-period'] ?? {});

  return (
    normalizeDateOrNull(trainingPeriod.reportsSince) ??
    normalizeDateOrNull(trainingPeriod.trainingStart)
  );
}

export default resolveReportStartDateFromSettings;
