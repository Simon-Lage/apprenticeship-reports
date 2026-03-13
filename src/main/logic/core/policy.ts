import { LogicScope } from '../../../shared/logic';

type ActionScopeMap = Record<string, LogicScope>;

const actionScopeMap: ActionScopeMap = {
  'config.getConfig': 'config:read',
  'config.initializeConfig': 'config:write',
  'config.updateConfig': 'config:write',
  'config.resetConfig': 'config:write',
  'config.getStatus': 'config:read',
  'timetable.listTimetable': 'timetable:read',
  'timetable.replaceTimetable': 'timetable:write',
  'timetable.upsertTimetableEntry': 'timetable:write',
  'timetable.removeTimetableEntry': 'timetable:write',
  'timetable.validateTimetable': 'timetable:read',
  'timetable.generateDayTemplate': 'timetable:read',
  'entries.listEntries': 'entries:read',
  'entries.listEntriesByDayType': 'entries:read',
  'entries.createEntry': 'entries:write',
  'entries.updateEntry': 'entries:write',
  'entries.deleteEntry': 'entries:write',
  'absences.listAbsences': 'absences:read',
  'absences.listAbsencesByType': 'absences:read',
  'absences.createAbsence': 'absences:write',
  'absences.updateAbsence': 'absences:write',
  'absences.deleteAbsence': 'absences:write',
  'absences.importHolidays': 'absences:write',
  'dailyReports.listDailyReports': 'dailyReports:read',
  'dailyReports.getDailyReport': 'dailyReports:read',
  'dailyReports.createDailyReport': 'dailyReports:write',
  'dailyReports.updateDailyReport': 'dailyReports:write',
  'dailyReports.deleteDailyReport': 'dailyReports:write',
  'dailyReports.setDailyReportEntries': 'dailyReports:write',
  'dailyReports.addDailyReportEntry': 'dailyReports:write',
  'dailyReports.removeDailyReportEntry': 'dailyReports:write',
  'dailyReports.reorderDailyReportEntries': 'dailyReports:write',
  'dailyReports.assignWeeklyReport': 'dailyReports:write',
  'weeklyReports.listWeeklyReports': 'weeklyReports:read',
  'weeklyReports.getWeeklyReport': 'weeklyReports:read',
  'weeklyReports.createWeeklyReport': 'weeklyReports:write',
  'weeklyReports.updateWeeklyReport': 'weeklyReports:write',
  'weeklyReports.deleteWeeklyReport': 'weeklyReports:write',
  'weeklyReports.markWeeklyReportSent': 'weeklyReports:write',
  'weeklyReports.deriveWeeklyReport': 'weeklyReports:read',
  'reportGeneration.buildWeeklyPreview': 'reportGeneration:read',
  'reportGeneration.regenerateWeeklyFromDaily': 'reportGeneration:read',
  'reportGeneration.validateDayTypeConsistency': 'reportGeneration:read',
  'export.exportDataArchive': 'export:read',
  'export.exportDailyReportsPdf': 'export:read',
  'export.exportWeeklyReportPdf': 'export:read',
  'import.previewImportArchive': 'import:write',
  'import.importDataArchive': 'import:write',
  'import.importTimetable': 'import:write',
  'import.importAbsences': 'import:write',
  'integrity.runIntegrityCheck': 'integrity:read',
  'integrity.trimAllTextFields': 'integrity:write',
  'integrity.verifySchemaCompatibility': 'integrity:read',
  'integrity.buildRevisionSnapshot': 'integrity:write',
  'audit.listAuditEvents': 'audit:read',
  'audit.appendAuditEvent': 'audit:write',
  'audit.clearAuditEvents': 'audit:write',
  'backup.exportLocalEncrypted': 'backup:write',
  'backup.exportGoogleDriveEncrypted': 'backup:write',
  'backup.importEncryptedBackup': 'backup:write',
};

export const getRequiredScopeForAction = (service: string, action: string) =>
  actionScopeMap[`${service}.${action}`] ?? null;

export const getAllowedActionsForService = (service: string) =>
  Object.keys(actionScopeMap)
    .filter((key) => key.startsWith(`${service}.`))
    .map((key) => key.slice(service.length + 1));
