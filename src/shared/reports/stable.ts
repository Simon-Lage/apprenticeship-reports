import { z } from 'zod';

import {
  JsonObject,
  JsonObjectSchema,
  deepCloneJson,
  stableStringifyJson,
} from '@/shared/common/json';

export const WeeklyReportHashRecordSchema = z.object({
  weeklyReportId: z.string().min(1),
  hash: z.string().min(1),
  createdAt: z.string().datetime(),
});

export type WeeklyReportHashRecord = z.infer<typeof WeeklyReportHashRecordSchema>;

export function normalizeWeeklyReportPayload(payload: JsonObject): JsonObject {
  return JsonObjectSchema.parse(deepCloneJson(payload));
}

export function serializeWeeklyReportPayload(payload: JsonObject): string {
  return stableStringifyJson(normalizeWeeklyReportPayload(payload));
}
