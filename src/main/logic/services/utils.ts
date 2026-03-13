import { DailyReportEntryRecord, LogicStubResult } from '../../../shared/logic';

export const nowIso = () => new Date().toISOString();

export const createImplemented = <T>(data: T): LogicStubResult<T> => ({
  implemented: true,
  data,
  touchedAt: nowIso(),
});

export const randomId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

export const sortByPosition = (entries: DailyReportEntryRecord[]) =>
  [...entries].sort((a, b) => a.position - b.position);
