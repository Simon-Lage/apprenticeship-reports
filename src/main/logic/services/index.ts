import { LogicServiceCatalog, LogicServiceName } from '../../../shared/logic';
import { getAuthenticatedDatabase } from '../../auth/runtime';
import { createDbLogicAdapters, LogicAdapters } from '../adapters';
import { getAllowedActionsForService } from '../core/policy';
import { AbsencesService } from './absencesService';
import { AuditService } from './auditService';
import { BackupService } from './backupService';
import { ConfigService } from './configService';
import { DailyReportsService } from './dailyReportsService';
import { EntriesService } from './entriesService';
import { ExportService } from './exportService';
import { ImportService } from './importService';
import { IntegrityService } from './integrityService';
import { ReportGenerationService } from './reportGenerationService';
import { TimetableService } from './timetableService';
import { WeeklyReportsService } from './weeklyReportsService';

export type LogicServices = {
  config: ConfigService;
  timetable: TimetableService;
  entries: EntriesService;
  absences: AbsencesService;
  dailyReports: DailyReportsService;
  weeklyReports: WeeklyReportsService;
  reportGeneration: ReportGenerationService;
  export: ExportService;
  import: ImportService;
  integrity: IntegrityService;
  audit: AuditService;
  backup: BackupService;
};

type LogicServiceDependencies = {
  adapters: LogicAdapters;
};

const createDefaultDependencies = (): LogicServiceDependencies => ({
  adapters: createDbLogicAdapters(() => getAuthenticatedDatabase()),
});

export const createLogicServices = (
  dependencies: Partial<LogicServiceDependencies> = {},
): LogicServices => {
  const resolved: LogicServiceDependencies = {
    ...createDefaultDependencies(),
    ...dependencies,
  };
  return {
    config: new ConfigService(resolved.adapters.config),
    timetable: new TimetableService(resolved.adapters.timetable),
    entries: new EntriesService(resolved.adapters.entries),
    absences: new AbsencesService(resolved.adapters.absences),
    dailyReports: new DailyReportsService(resolved.adapters.dailyReports),
    weeklyReports: new WeeklyReportsService(resolved.adapters.weeklyReports),
    reportGeneration: new ReportGenerationService(
      resolved.adapters.dailyReports,
      resolved.adapters.entries,
      resolved.adapters.weeklyReports,
    ),
    export: new ExportService(
      resolved.adapters.config,
      resolved.adapters.timetable,
      resolved.adapters.entries,
      resolved.adapters.absences,
      resolved.adapters.weeklyReports,
      resolved.adapters.dailyReports,
    ),
    import: new ImportService(
      resolved.adapters.config,
      resolved.adapters.timetable,
      resolved.adapters.entries,
      resolved.adapters.absences,
      resolved.adapters.weeklyReports,
      resolved.adapters.dailyReports,
    ),
    integrity: new IntegrityService(
      resolved.adapters.config,
      resolved.adapters.timetable,
      resolved.adapters.entries,
      resolved.adapters.absences,
      resolved.adapters.weeklyReports,
      resolved.adapters.dailyReports,
    ),
    audit: new AuditService(),
    backup: new BackupService(),
  };
};

export const buildLogicServiceCatalog = (
  services: LogicServices,
): LogicServiceCatalog => {
  const catalog: Record<LogicServiceName, string[]> = {
    config: [],
    timetable: [],
    entries: [],
    absences: [],
    dailyReports: [],
    weeklyReports: [],
    reportGeneration: [],
    export: [],
    import: [],
    integrity: [],
    audit: [],
    backup: [],
  };
  (Object.keys(services) as LogicServiceName[]).forEach((service) => {
    catalog[service] = getAllowedActionsForService(service);
  });
  return catalog as LogicServiceCatalog;
};
