import {
  WeeklyReportCreateInput,
  WeeklyReportUpdateInput,
} from '../../../shared/logic';
import { WeeklyReportsRepositoryAdapter } from '../adapters';
import { fail, ok } from '../core/operation';
import { createImplemented } from './utils';

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export class WeeklyReportsService {
  constructor(private readonly repository: WeeklyReportsRepositoryAdapter) {}

  async listWeeklyReports() {
    const reports = await this.repository.getWeeklyReports();
    return createImplemented(ok(reports));
  }

  async getWeeklyReport(payload: { id: number }) {
    const report = await this.repository.getWeeklyReport(payload);
    return createImplemented(ok(report));
  }

  async createWeeklyReport(payload: WeeklyReportCreateInput) {
    if (!isIsoDate(payload.weekStart) || !isIsoDate(payload.weekEnd)) {
      return createImplemented(
        fail('validation_error', 'week_range_invalid', {
          weekStart: !isIsoDate(payload.weekStart) ? 'iso_date_required' : '',
          weekEnd: !isIsoDate(payload.weekEnd) ? 'iso_date_required' : '',
        }),
      );
    }
    if (payload.weekEnd < payload.weekStart) {
      return createImplemented(
        fail('validation_error', 'week_range_invalid', {
          weekStart: 'must_be_before_or_equal_to_weekEnd',
          weekEnd: 'must_be_after_or_equal_to_weekStart',
        }),
      );
    }
    const created = await this.repository.setWeeklyReport(payload);
    return createImplemented(ok(created));
  }

  async updateWeeklyReport(payload: { id: number; patch: WeeklyReportUpdateInput }) {
    const current = await this.repository.getWeeklyReport({ id: payload.id });
    if (!current) {
      return createImplemented(
        fail('not_found', 'weekly_report_not_found', {
          id: 'not_found',
        }),
      );
    }
    const nextWeekStart = payload.patch.weekStart ?? current.weekStart;
    const nextWeekEnd = payload.patch.weekEnd ?? current.weekEnd;
    if (!isIsoDate(nextWeekStart) || !isIsoDate(nextWeekEnd)) {
      return createImplemented(
        fail('validation_error', 'week_range_invalid'),
      );
    }
    if (nextWeekEnd < nextWeekStart) {
      return createImplemented(
        fail('validation_error', 'week_range_invalid'),
      );
    }
    const updated = await this.repository.updateWeeklyReport(payload);
    return createImplemented(ok(updated));
  }

  async deleteWeeklyReport(payload: { id: number }) {
    const deleted = await this.repository.deleteWeeklyReport(payload);
    if (!deleted) {
      return createImplemented(
        fail('not_found', 'weekly_report_not_found', {
          id: 'not_found',
        }),
      );
    }
    return createImplemented(ok({ deleted: true, id: payload.id }));
  }

  async markWeeklyReportSent(payload: { id: number; sent: boolean }) {
    const current = await this.repository.getWeeklyReport({ id: payload.id });
    if (!current) {
      return createImplemented(
        fail('not_found', 'weekly_report_not_found', {
          id: 'not_found',
        }),
      );
    }
    const updated = await this.repository.updateWeeklyReport({
      id: payload.id,
      patch: { sent: payload.sent },
    });
    return createImplemented(ok(updated));
  }

  async deriveWeeklyReport(payload: { weekStart: string; weekEnd: string }) {
    const reports = await this.repository.getWeeklyReports();
    const existing = reports.find(
      (report) =>
        report.weekStart === payload.weekStart && report.weekEnd === payload.weekEnd,
    );
    if (!existing) {
      return createImplemented(
        fail('not_found', 'weekly_report_not_found_for_range'),
      );
    }
    return createImplemented(
      ok({
        weekStart: existing.weekStart,
        weekEnd: existing.weekEnd,
        derived: true,
      }),
    );
  }
}

