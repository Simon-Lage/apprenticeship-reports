import { LogicClient } from './client';

export class ExportLogic {
  constructor(private readonly client: LogicClient) {}

  async exportDataArchive(payload?: { targetPath?: string }) {
    return this.client.call('export', 'exportDataArchive', payload);
  }

  async exportDailyReportsPdf(payload?: {
    targetPath?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    return this.client.call('export', 'exportDailyReportsPdf', payload);
  }

  async exportWeeklyReportPdf(payload: { targetPath?: string; weeklyReportId: number }) {
    return this.client.call('export', 'exportWeeklyReportPdf', payload);
  }
}

