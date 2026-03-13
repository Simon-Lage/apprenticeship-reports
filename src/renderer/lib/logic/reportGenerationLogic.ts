import { LogicClient } from './client';

export class ReportGenerationLogic {
  constructor(private readonly client: LogicClient) {}

  async buildWeeklyPreview(payload: { weeklyReportId: number }) {
    return this.client.call('reportGeneration', 'buildWeeklyPreview', payload);
  }

  async regenerateWeeklyFromDaily(payload: { weeklyReportId: number }) {
    return this.client.call('reportGeneration', 'regenerateWeeklyFromDaily', payload);
  }

  async validateDayTypeConsistency() {
    return this.client.call('reportGeneration', 'validateDayTypeConsistency');
  }
}

