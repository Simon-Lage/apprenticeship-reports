import { createHash } from 'crypto';

import {
  WeeklyReportHashRecord,
  WeeklyReportHashRecordSchema,
  serializeWeeklyReportPayload,
} from '@/shared/reports/stable';
import { JsonObject } from '@/shared/common/json';

export class WeeklyReportHashService {
  createRecord(
    weeklyReportId: string,
    payload: JsonObject,
    createdAt: string,
  ): WeeklyReportHashRecord {
    const hash = createHash('sha256')
      .update(serializeWeeklyReportPayload(payload))
      .digest('hex');

    return WeeklyReportHashRecordSchema.parse({
      weeklyReportId,
      hash,
      createdAt,
    });
  }
}
