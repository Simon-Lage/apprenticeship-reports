import { DayType } from '../../../shared/logic';
import {
  DailyReportsRepositoryAdapter,
  EntriesRepositoryAdapter,
  WeeklyReportsRepositoryAdapter,
} from '../adapters';
import { fail, ok } from '../core/operation';
import { createImplemented } from './utils';

const byDayType = (dayType: DayType, activities: string[]) => ({
  dayType,
  activities,
});

export class ReportGenerationService {
  constructor(
    private readonly dailyReports: DailyReportsRepositoryAdapter,
    private readonly entries: EntriesRepositoryAdapter,
    private readonly weeklyReports: WeeklyReportsRepositoryAdapter,
  ) {}

  private async buildWeeklyBlocks(weeklyReportId: number) {
    const dailyReports = await this.dailyReports.getDailyReportsByWeeklyReportId({
      weeklyReportId,
    });
    const entries = await this.entries.getEntriesByWeeklyReportId({ weeklyReportId });
    const activitiesByDayType = new Map<DayType, string[]>();
    entries.forEach((entry) => {
      const list = activitiesByDayType.get(entry.dayType) ?? [];
      list.push(entry.activities);
      activitiesByDayType.set(entry.dayType, list);
    });
    return {
      dailyCount: dailyReports.length,
      entryCount: entries.length,
      blocks: (['school', 'work', 'leave'] as DayType[]).map((dayType) =>
        byDayType(dayType, activitiesByDayType.get(dayType) ?? []),
      ),
    };
  }

  async buildWeeklyPreview(payload: { weeklyReportId: number }) {
    const weeklyReport = await this.weeklyReports.getWeeklyReport({
      id: payload.weeklyReportId,
    });
    if (!weeklyReport) {
      return createImplemented(
        fail('not_found', 'weekly_report_not_found', {
          weeklyReportId: 'not_found',
        }),
      );
    }
    const blocks = await this.buildWeeklyBlocks(payload.weeklyReportId);
    return createImplemented(
      ok({
        weeklyReportId: payload.weeklyReportId,
        generatedAt: new Date().toISOString(),
        blocks: [
          {
            weeklyReport,
            ...blocks,
          },
        ],
      }),
    );
  }

  async regenerateWeeklyFromDaily(payload: { weeklyReportId: number }) {
    const weeklyReport = await this.weeklyReports.getWeeklyReport({
      id: payload.weeklyReportId,
    });
    if (!weeklyReport) {
      return createImplemented(
        fail('not_found', 'weekly_report_not_found', {
          weeklyReportId: 'not_found',
        }),
      );
    }
    await this.buildWeeklyBlocks(payload.weeklyReportId);
    return createImplemented(
      ok({
        weeklyReportId: payload.weeklyReportId,
        regeneratedAt: new Date().toISOString(),
      }),
    );
  }

  async validateDayTypeConsistency() {
    const dailyReports = await this.dailyReports.getDailyReports();
    const issues: Array<{ id: string; code: string; severity: 'medium'; message: string }> = [];
    for (const report of dailyReports) {
      const links = await this.dailyReports.getDailyReportEntries({
        dailyReportId: report.id,
      });
      if (links.length === 0) {
        continue;
      }
      for (const link of links) {
        const entry = await this.entries.getEntry({ id: link.entryId });
        if (!entry) {
          issues.push({
            id: `${report.id}:${link.entryId}`,
            code: 'entry_missing',
            severity: 'medium',
            message: 'Linked entry missing',
          });
          continue;
        }
        if (entry.dayType !== report.dayType) {
          issues.push({
            id: `${report.id}:${entry.id}`,
            code: 'day_type_mismatch',
            severity: 'medium',
            message: `Entry day type "${entry.dayType}" differs from report day type "${report.dayType}"`,
          });
        }
      }
    }
    return createImplemented(
      ok({
        valid: issues.length === 0,
        checkedAt: new Date().toISOString(),
        issues,
      }),
    );
  }
}

