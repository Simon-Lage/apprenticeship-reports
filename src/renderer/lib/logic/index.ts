import { AbsencesLogic } from './absencesLogic';
import { AuditLogic } from './auditLogic';
import { BackupLogic } from './backupLogic';
import { LogicClient } from './client';
import { ConfigLogic } from './configLogic';
import { DailyReportsLogic } from './dailyReportsLogic';
import { EntriesLogic } from './entriesLogic';
import { ExportLogic } from './exportLogic';
import { ImportLogic } from './importLogic';
import { IntegrityLogic } from './integrityLogic';
import { ReportGenerationLogic } from './reportGenerationLogic';
import { TimetableLogic } from './timetableLogic';
import { WeeklyReportsLogic } from './weeklyReportsLogic';

class LogicService {
  private readonly client = new LogicClient();

  readonly config = new ConfigLogic(this.client);

  readonly timetable = new TimetableLogic(this.client);

  readonly entries = new EntriesLogic(this.client);

  readonly absences = new AbsencesLogic(this.client);

  readonly dailyReports = new DailyReportsLogic(this.client);

  readonly weeklyReports = new WeeklyReportsLogic(this.client);

  readonly reportGeneration = new ReportGenerationLogic(this.client);

  readonly export = new ExportLogic(this.client);

  readonly import = new ImportLogic(this.client);

  readonly integrity = new IntegrityLogic(this.client);

  readonly audit = new AuditLogic(this.client);

  readonly backup = new BackupLogic(this.client);

  async getCatalog() {
    return this.client.getCatalog();
  }

  getCachedCatalog() {
    return this.client.getCachedCatalog();
  }
}

export const logicService = new LogicService();

