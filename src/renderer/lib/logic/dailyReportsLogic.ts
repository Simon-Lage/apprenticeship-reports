import {
  DailyReportCreateInput,
  DailyReportEntryInput,
  DailyReportUpdateInput,
  DayType,
} from '../../../shared/logic';
import { LogicClient } from './client';

export class DailyReportsLogic {
  constructor(private readonly client: LogicClient) {}

  async listDailyReports(payload?: { fromDate?: string; toDate?: string; dayType?: DayType }) {
    return this.client.call('dailyReports', 'listDailyReports', payload);
  }

  async getDailyReport(payload: { id: string }) {
    return this.client.call('dailyReports', 'getDailyReport', payload);
  }

  async createDailyReport(payload: DailyReportCreateInput) {
    return this.client.call('dailyReports', 'createDailyReport', payload);
  }

  async updateDailyReport(payload: { id: string; patch: DailyReportUpdateInput }) {
    return this.client.call('dailyReports', 'updateDailyReport', payload);
  }

  async deleteDailyReport(payload: { id: string }) {
    return this.client.call('dailyReports', 'deleteDailyReport', payload);
  }

  async setDailyReportEntries(payload: {
    dailyReportId: string;
    entries: DailyReportEntryInput[];
  }) {
    return this.client.call('dailyReports', 'setDailyReportEntries', payload);
  }

  async addDailyReportEntry(payload: {
    dailyReportId: string;
    entry: DailyReportEntryInput;
  }) {
    return this.client.call('dailyReports', 'addDailyReportEntry', payload);
  }

  async removeDailyReportEntry(payload: { dailyReportId: string; entryId: number }) {
    return this.client.call('dailyReports', 'removeDailyReportEntry', payload);
  }

  async reorderDailyReportEntries(payload: {
    dailyReportId: string;
    order: Array<{ entryId: number; position: number }>;
  }) {
    return this.client.call('dailyReports', 'reorderDailyReportEntries', payload);
  }

  async assignWeeklyReport(payload: { dailyReportId: string; weeklyReportId: number | null }) {
    return this.client.call('dailyReports', 'assignWeeklyReport', payload);
  }
}

