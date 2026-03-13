import { app } from 'electron';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { IntegrityIssue, IntegrityReport } from '../../../shared/logic';
import { getAuthenticatedDatabase } from '../../auth/runtime';
import {
  AbsencesRepositoryAdapter,
  ConfigRepositoryAdapter,
  DailyReportsRepositoryAdapter,
  EntriesRepositoryAdapter,
  TimetableRepositoryAdapter,
  WeeklyReportsRepositoryAdapter,
} from '../adapters';
import { fail, ok } from '../core/operation';
import { normalizeAuditChain, verifyAuditChain } from '../modules/audit/hash';
import { readAuditEvents } from '../modules/audit/store';
import { createImplemented, randomId } from './utils';

export class IntegrityService {
  constructor(
    private readonly config: ConfigRepositoryAdapter,
    private readonly timetable: TimetableRepositoryAdapter,
    private readonly entries: EntriesRepositoryAdapter,
    private readonly absences: AbsencesRepositoryAdapter,
    private readonly weeklyReports: WeeklyReportsRepositoryAdapter,
    private readonly dailyReports: DailyReportsRepositoryAdapter,
  ) {}

  async runIntegrityCheck() {
    const issues: IntegrityIssue[] = [];
    const config = await this.config.getConfig();
    if (!config) {
      issues.push({
        id: 'config_missing',
        code: 'config_missing',
        severity: 'high',
        message: 'Configuration is not initialized',
      });
    }

    const dailyReports = await this.dailyReports.getDailyReports();
    for (const report of dailyReports) {
      const links = await this.dailyReports.getDailyReportEntries({
        dailyReportId: report.id,
      });
      for (const link of links) {
        const entry = await this.entries.getEntry({ id: link.entryId });
        if (!entry) {
          issues.push({
            id: `${report.id}:${link.entryId}`,
            code: 'daily_entry_missing',
            severity: 'high',
            message: 'Daily report link points to missing entry',
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

    const weeklyReports = await this.weeklyReports.getWeeklyReports();
    weeklyReports.forEach((report) => {
      if (report.weekEnd < report.weekStart) {
        issues.push({
          id: String(report.id),
          code: 'week_range_invalid',
          severity: 'high',
          message: 'week_end is before week_start',
        });
      }
    });

    const absences = await this.absences.getAbsences();
    absences.forEach((absence) => {
      if (absence.toDate < absence.fromDate) {
        issues.push({
          id: absence.id,
          code: 'absence_range_invalid',
          severity: 'high',
          message: 'to_date is before from_date',
        });
      }
    });

    const auditEvents = normalizeAuditChain(await readAuditEvents());
    const auditIssues = verifyAuditChain(auditEvents);
    auditIssues.forEach((issue) => {
      issues.push({
        id: issue.id,
        code: issue.code,
        severity: 'high',
        message: issue.message,
      });
    });

    const report: IntegrityReport = {
      checkedAt: new Date().toISOString(),
      issues,
    };
    return createImplemented(ok(report));
  }

  async trimAllTextFields() {
    let trimmedRows = 0;
    const config = await this.config.getConfig();
    if (config) {
      await this.config.updateConfig({
        name: config.name.trim(),
        surname: config.surname.trim(),
        department: config.department?.trim() ?? null,
        trainerEmail: config.trainerEmail?.trim() ?? null,
        ihkLink: config.ihkLink?.trim() ?? null,
      });
      trimmedRows += 1;
    }

    const entries = await this.entries.getEntries();
    for (const entry of entries) {
      const nextActivities = entry.activities.trim();
      if (nextActivities !== entry.activities) {
        await this.entries.updateEntry({
          id: entry.id,
          patch: {
            activities: nextActivities,
          },
        });
        trimmedRows += 1;
      }
    }

    const absences = await this.absences.getAbsences();
    for (const absence of absences) {
      const nextNote = absence.note?.trim() ?? null;
      if (nextNote !== absence.note) {
        await this.absences.updateAbsence({
          id: absence.id,
          patch: {
            note: nextNote,
          },
        });
        trimmedRows += 1;
      }
    }

    const weeklyReports = await this.weeklyReports.getWeeklyReports();
    for (const weekly of weeklyReports) {
      const nextDepartment = weekly.departmentWhenSent?.trim() ?? null;
      const nextTrainerEmail = weekly.trainerEmailWhenSent?.trim() ?? null;
      if (
        nextDepartment !== weekly.departmentWhenSent ||
        nextTrainerEmail !== weekly.trainerEmailWhenSent
      ) {
        await this.weeklyReports.updateWeeklyReport({
          id: weekly.id,
          patch: {
            departmentWhenSent: nextDepartment,
            trainerEmailWhenSent: nextTrainerEmail,
          },
        });
        trimmedRows += 1;
      }
    }

    const timetable = await this.timetable.getTimetable();
    const trimmedTimetable = timetable.map((entry) => ({
      ...entry,
      teacher: entry.teacher.trim(),
      subject: entry.subject.trim(),
      id: entry.id.trim(),
    }));
    const timetableChanged = trimmedTimetable.some(
      (entry, index) =>
        entry.id !== timetable[index].id ||
        entry.teacher !== timetable[index].teacher ||
        entry.subject !== timetable[index].subject,
    );
    if (timetableChanged) {
      await this.timetable.replaceTimetable(trimmedTimetable);
      trimmedRows += trimmedTimetable.length;
    }

    return createImplemented(ok({ trimmedRows }));
  }

  async verifySchemaCompatibility(payload?: { version?: number }) {
    const targetVersion = payload?.version ?? 1;
    try {
      const db = getAuthenticatedDatabase();
      const row = db
        .prepare('SELECT COALESCE(MAX(version), 0) as version FROM schema_migrations')
        .get() as { version: number };
      return createImplemented(
        ok({
          compatible: row.version >= targetVersion,
          version: row.version,
        }),
      );
    } catch {
      return createImplemented(
        fail('unexpected', 'schema_version_query_failed'),
      );
    }
  }

  async buildRevisionSnapshot() {
    const snapshotId = randomId('revision');
    const createdAt = new Date().toISOString();
    const dir = path.join(
      app.getPath('documents'),
      'apprenticeship-reports',
      'revisions',
    );
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${snapshotId}.json`);
    const auditEvents = normalizeAuditChain(await readAuditEvents());
    const auditHeadHash =
      auditEvents.length > 0 ? auditEvents[auditEvents.length - 1].hash : null;
    const db = getAuthenticatedDatabase();
    const row = db
      .prepare('SELECT COALESCE(MAX(version), 0) as version FROM schema_migrations')
      .get() as { version: number };
    const markerPayload = JSON.stringify({
      snapshotId,
      createdAt,
      schemaVersion: row.version,
      auditHeadHash,
    });
    const markerHash = crypto
      .createHash('sha256')
      .update(markerPayload)
      .digest('hex');
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          snapshotId,
          createdAt,
          schemaVersion: row.version,
          auditHeadHash,
          markerHash,
        },
        null,
        2,
      ),
      'utf-8',
    );
    return createImplemented(
      ok({
        snapshotId,
        createdAt,
      }),
    );
  }
}
