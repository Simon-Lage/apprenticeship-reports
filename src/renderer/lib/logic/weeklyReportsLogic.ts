import { WeeklyReportCreateInput, WeeklyReportUpdateInput } from '../../../shared/logic';
import { LogicClient } from './client';

export class WeeklyReportsLogic {
  constructor(private readonly client: LogicClient) {}

  async listWeeklyReports() {
    return this.client.call('weeklyReports', 'listWeeklyReports');
  }

  async getWeeklyReport(payload: { id: number }) {
    return this.client.call('weeklyReports', 'getWeeklyReport', payload);
  }

  async createWeeklyReport(payload: WeeklyReportCreateInput) {
    return this.client.call('weeklyReports', 'createWeeklyReport', payload);
  }

  async updateWeeklyReport(payload: { id: number; patch: WeeklyReportUpdateInput }) {
    return this.client.call('weeklyReports', 'updateWeeklyReport', payload);
  }

  async deleteWeeklyReport(payload: { id: number }) {
    return this.client.call('weeklyReports', 'deleteWeeklyReport', payload);
  }

  async markWeeklyReportSent(payload: { id: number; sent: boolean }) {
    return this.client.call('weeklyReports', 'markWeeklyReportSent', payload);
  }

  async deriveWeeklyReport(payload: { weekStart: string; weekEnd: string }) {
    return this.client.call('weeklyReports', 'deriveWeeklyReport', payload);
  }
}

