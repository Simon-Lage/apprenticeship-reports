import {
  DailyReportCreateInput,
  DailyReportEntryInput,
  DailyReportEntryRecord,
  DailyReportUpdateInput,
  DayType,
} from '../../../shared/logic';
import { DailyReportsRepositoryAdapter } from '../adapters';
import { fail, ok } from '../core/operation';
import { createImplemented } from './utils';

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const createDailyId = () =>
  `daily_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeEntries = (entries: DailyReportEntryInput[]): DailyReportEntryRecord[] =>
  entries.map((entry, index) => ({
    dailyReportId: entry.dailyReportId,
    entryId: entry.entryId,
    position: entry.position ?? index,
  }));

export class DailyReportsService {
  constructor(private readonly repository: DailyReportsRepositoryAdapter) {}

  async listDailyReports(payload?: {
    fromDate?: string;
    toDate?: string;
    dayType?: DayType;
  }) {
    if (payload?.fromDate && !isIsoDate(payload.fromDate)) {
      return createImplemented(
        fail('validation_error', 'from_date_invalid', {
          fromDate: 'iso_date_required',
        }),
      );
    }
    if (payload?.toDate && !isIsoDate(payload.toDate)) {
      return createImplemented(
        fail('validation_error', 'to_date_invalid', {
          toDate: 'iso_date_required',
        }),
      );
    }
    const reports = await this.repository.getDailyReports(payload);
    return createImplemented(ok(reports));
  }

  async getDailyReport(payload: { id: string }) {
    const report = await this.repository.getDailyReport({ id: payload.id });
    const entries = await this.repository.getDailyReportEntries({
      dailyReportId: payload.id,
    });
    return createImplemented(ok({ report, entries }));
  }

  async createDailyReport(payload: DailyReportCreateInput) {
    if (!isIsoDate(payload.date)) {
      return createImplemented(
        fail('validation_error', 'date_invalid', {
          date: 'iso_date_required',
        }),
      );
    }
    const created = await this.repository.setDailyReport({
      ...payload,
      id: payload.id ?? createDailyId(),
    });
    return createImplemented(ok(created));
  }

  async updateDailyReport(payload: { id: string; patch: DailyReportUpdateInput }) {
    const current = await this.repository.getDailyReport({ id: payload.id });
    if (!current) {
      return createImplemented(
        fail('not_found', 'daily_report_not_found', {
          id: 'not_found',
        }),
      );
    }
    if (payload.patch.date && !isIsoDate(payload.patch.date)) {
      return createImplemented(
        fail('validation_error', 'date_invalid', {
          date: 'iso_date_required',
        }),
      );
    }
    const updated = await this.repository.updateDailyReport(payload);
    return createImplemented(ok(updated));
  }

  async deleteDailyReport(payload: { id: string }) {
    const deleted = await this.repository.deleteDailyReport(payload);
    if (!deleted) {
      return createImplemented(
        fail('not_found', 'daily_report_not_found', {
          id: 'not_found',
        }),
      );
    }
    return createImplemented(ok({ deleted: true, id: payload.id }));
  }

  async setDailyReportEntries(payload: {
    dailyReportId: string;
    entries: DailyReportEntryInput[];
  }) {
    const report = await this.repository.getDailyReport({ id: payload.dailyReportId });
    if (!report) {
      return createImplemented(
        fail('not_found', 'daily_report_not_found', {
          dailyReportId: 'not_found',
        }),
      );
    }
    const normalized = normalizeEntries(payload.entries).map((entry, index) => ({
      dailyReportId: payload.dailyReportId,
      entryId: entry.entryId,
      position: entry.position ?? index,
    }));
    const uniqueEntryIds = new Set<number>();
    const duplicate = normalized.find((entry) => {
      if (uniqueEntryIds.has(entry.entryId)) {
        return true;
      }
      uniqueEntryIds.add(entry.entryId);
      return false;
    });
    if (duplicate) {
      return createImplemented(
        fail('validation_error', 'daily_report_entry_duplicate', {
          entryId: 'duplicate',
        }),
      );
    }
    const saved = await this.repository.setDailyReportEntries({
      dailyReportId: payload.dailyReportId,
      entries: normalized,
    });
    return createImplemented(ok(saved));
  }

  async addDailyReportEntry(payload: {
    dailyReportId: string;
    entry: DailyReportEntryInput;
  }) {
    const report = await this.repository.getDailyReport({ id: payload.dailyReportId });
    if (!report) {
      return createImplemented(
        fail('not_found', 'daily_report_not_found', {
          dailyReportId: 'not_found',
        }),
      );
    }
    const existing = await this.repository.getDailyReportEntries({
      dailyReportId: payload.dailyReportId,
    });
    const already = existing.some((entry) => entry.entryId === payload.entry.entryId);
    if (already) {
      return createImplemented(
        fail('conflict', 'daily_report_entry_already_exists', {
          entryId: 'duplicate',
        }),
      );
    }
    const next = [
      ...existing,
      {
        dailyReportId: payload.dailyReportId,
        entryId: payload.entry.entryId,
        position:
          payload.entry.position ??
          (existing.length > 0
            ? Math.max(...existing.map((entry) => entry.position)) + 1
            : 0),
      },
    ];
    const saved = await this.repository.setDailyReportEntries({
      dailyReportId: payload.dailyReportId,
      entries: next,
    });
    const created = saved.find((entry) => entry.entryId === payload.entry.entryId);
    if (!created) {
      return createImplemented(
        fail('unexpected', 'daily_report_entry_create_failed'),
      );
    }
    return createImplemented(ok(created));
  }

  async removeDailyReportEntry(payload: { dailyReportId: string; entryId: number }) {
    const deleted = await this.repository.removeDailyReportEntry(payload);
    if (!deleted) {
      return createImplemented(
        fail('not_found', 'daily_report_entry_not_found', {
          entryId: 'not_found',
        }),
      );
    }
    return createImplemented(
      ok({
        deleted: true,
        dailyReportId: payload.dailyReportId,
        entryId: payload.entryId,
      }),
    );
  }

  async reorderDailyReportEntries(payload: {
    dailyReportId: string;
    order: Array<{ entryId: number; position: number }>;
  }) {
    const existing = await this.repository.getDailyReportEntries({
      dailyReportId: payload.dailyReportId,
    });
    const positionByEntry = new Map<number, number>();
    payload.order.forEach((item) => {
      positionByEntry.set(item.entryId, item.position);
    });
    const reordered = existing.map((entry) => ({
      ...entry,
      position: positionByEntry.get(entry.entryId) ?? entry.position,
    }));
    reordered.sort((a, b) => a.position - b.position);
    const saved = await this.repository.setDailyReportEntries({
      dailyReportId: payload.dailyReportId,
      entries: reordered,
    });
    return createImplemented(ok(saved));
  }

  async assignWeeklyReport(payload: {
    dailyReportId: string;
    weeklyReportId: number | null;
  }) {
    const current = await this.repository.getDailyReport({ id: payload.dailyReportId });
    if (!current) {
      return createImplemented(
        fail('not_found', 'daily_report_not_found', {
          dailyReportId: 'not_found',
        }),
      );
    }
    const updated = await this.repository.updateDailyReport({
      id: payload.dailyReportId,
      patch: {
        weeklyReportId: payload.weeklyReportId,
      },
    });
    return createImplemented(ok(updated));
  }
}
