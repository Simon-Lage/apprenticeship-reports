import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import {
  AbsenceRecord,
  DailyReportRecord,
  EntryRecord,
  TimetableRecord,
  WeeklyReportRecord,
} from '../../../shared/logic';
import {
  AbsencesRepositoryAdapter,
  ConfigRepositoryAdapter,
  DailyReportsRepositoryAdapter,
  EntriesRepositoryAdapter,
  TimetableRepositoryAdapter,
  WeeklyReportsRepositoryAdapter,
} from '../adapters';
import { normalizeAuditChain } from '../modules/audit/hash';
import { readAuditEvents } from '../modules/audit/store';
import { exportHtmlToPdf } from '../modules/export/pdf';
import { fail, ok } from '../core/operation';
import { createImplemented } from './utils';

type ExportSnapshot = {
  schemaVersion: number;
  exportedAt: string;
  config: unknown;
  timetable: TimetableRecord[];
  entries: EntryRecord[];
  absences: AbsenceRecord[];
  weeklyReports: WeeklyReportRecord[];
  dailyReports: DailyReportRecord[];
  dailyReportEntries: Array<{
    dailyReportId: string;
    entries: Array<{ dailyReportId: string; entryId: number; position: number }>;
  }>;
  auditEvents: unknown[];
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export class ExportService {
  constructor(
    private readonly config: ConfigRepositoryAdapter,
    private readonly timetable: TimetableRepositoryAdapter,
    private readonly entries: EntriesRepositoryAdapter,
    private readonly absences: AbsencesRepositoryAdapter,
    private readonly weeklyReports: WeeklyReportsRepositoryAdapter,
    private readonly dailyReports: DailyReportsRepositoryAdapter,
  ) {}

  private async buildSnapshot(): Promise<ExportSnapshot> {
    const dailyReports = await this.dailyReports.getDailyReports();
    const dailyReportEntries = await Promise.all(
      dailyReports.map(async (report) => ({
        dailyReportId: report.id,
        entries: await this.dailyReports.getDailyReportEntries({
          dailyReportId: report.id,
        }),
      })),
    );
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      config: await this.config.getConfig(),
      timetable: await this.timetable.getTimetable(),
      entries: await this.entries.getEntries(),
      absences: await this.absences.getAbsences(),
      weeklyReports: await this.weeklyReports.getWeeklyReports(),
      dailyReports,
      dailyReportEntries,
      auditEvents: normalizeAuditChain(await readAuditEvents()),
    };
  }

  private async resolveTargetPath(
    defaultExtension: 'json' | 'pdf',
    targetPath?: string,
  ) {
    if (targetPath && targetPath.trim()) {
      return targetPath;
    }
    const dir = path.join(app.getPath('documents'), 'apprenticeship-reports', 'exports');
    await fs.mkdir(dir, { recursive: true });
    const fileName = `export-${Date.now()}.${defaultExtension}`;
    return path.join(dir, fileName);
  }

  private buildPdfHtml(title: string, blocks: string[]) {
    const content = blocks.join('');
    return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; margin: 24px; color: #111; }
    h1 { margin: 0 0 16px; font-size: 22px; }
    h2 { margin: 24px 0 8px; font-size: 16px; }
    p { margin: 4px 0; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 11px; text-align: left; vertical-align: top; }
    th { background: #f4f4f4; }
    .meta { margin-bottom: 12px; color: #333; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Erstellt am ${escapeHtml(new Date().toISOString())}</p>
  ${content}
</body>
</html>`;
  }

  private async buildDailyReportPdfBlocks(payload?: {
    fromDate?: string;
    toDate?: string;
  }) {
    const reports = await this.dailyReports.getDailyReports({
      fromDate: payload?.fromDate,
      toDate: payload?.toDate,
    });
    const entries = await this.entries.getEntries();
    const entryById = new Map<number, EntryRecord>();
    entries.forEach((entry) => {
      entryById.set(entry.id, entry);
    });
    const blocks: string[] = [];
    for (const report of reports) {
      const linked = await this.dailyReports.getDailyReportEntries({
        dailyReportId: report.id,
      });
      const rows = linked
        .sort((a, b) => a.position - b.position)
        .map((link) => {
          const entry = entryById.get(link.entryId);
          return `<tr>
  <td>${escapeHtml(String(link.position))}</td>
  <td>${escapeHtml(String(link.entryId))}</td>
  <td>${escapeHtml(entry?.activities ?? '')}</td>
  <td>${escapeHtml(entry?.dayType ?? '')}</td>
</tr>`;
        })
        .join('');
      blocks.push(`<h2>Tagesbericht ${escapeHtml(report.date)} (${escapeHtml(report.dayType)})</h2>
<p>ID: ${escapeHtml(report.id)}</p>
<table>
  <thead>
    <tr><th>Position</th><th>Entry-ID</th><th>Aktivität</th><th>Typ</th></tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`);
    }
    return {
      blocks,
      reportCount: reports.length,
    };
  }

  private async buildWeeklyReportPdfBlocks(weeklyReportId: number) {
    const report = await this.weeklyReports.getWeeklyReport({ id: weeklyReportId });
    if (!report) {
      return null;
    }
    const dailyReports = await this.dailyReports.getDailyReportsByWeeklyReportId({
      weeklyReportId,
    });
    const entries = await this.entries.getEntries();
    const entryById = new Map<number, EntryRecord>();
    entries.forEach((entry) => {
      entryById.set(entry.id, entry);
    });
    const dayBlocks: string[] = [];
    for (const daily of dailyReports) {
      const linked = await this.dailyReports.getDailyReportEntries({
        dailyReportId: daily.id,
      });
      const list = linked
        .sort((a, b) => a.position - b.position)
        .map((link) => {
          const entry = entryById.get(link.entryId);
          return `<tr>
  <td>${escapeHtml(String(link.position))}</td>
  <td>${escapeHtml(entry?.activities ?? '')}</td>
</tr>`;
        })
        .join('');
      dayBlocks.push(`<h2>${escapeHtml(daily.date)} (${escapeHtml(daily.dayType)})</h2>
<table>
  <thead>
    <tr><th>Position</th><th>Aktivität</th></tr>
  </thead>
  <tbody>${list}</tbody>
</table>`);
    }
    const header = `<p>Woche: ${escapeHtml(report.weekStart)} bis ${escapeHtml(report.weekEnd)}</p>
<p>Abteilung: ${escapeHtml(report.departmentWhenSent ?? '')}</p>
<p>Ausbilder: ${escapeHtml(report.trainerEmailWhenSent ?? '')}</p>`;
    return {
      blocks: [header, ...dayBlocks],
      dailyCount: dailyReports.length,
    };
  }

  async exportDataArchive(payload?: { targetPath?: string }) {
    const targetPath = await this.resolveTargetPath('json', payload?.targetPath);
    const snapshot = await this.buildSnapshot();
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    return createImplemented(
      ok({
        format: 'json' as const,
        targetPath,
        itemCount:
          snapshot.timetable.length +
          snapshot.entries.length +
          snapshot.absences.length +
          snapshot.weeklyReports.length +
          snapshot.dailyReports.length +
          snapshot.auditEvents.length,
      }),
    );
  }

  async exportDailyReportsPdf(payload?: {
    targetPath?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    if (payload?.fromDate && !isIsoDate(payload.fromDate)) {
      return createImplemented(
        fail('validation_error', 'from_date_invalid', {
          fromDate: 'iso_date_required',
        }),
      );
    }
    if (payload?.toDate && !isIsoDate(payload.toDate)) {
      return createImplemented(
        fail('validation_error', 'to_date_invalid', {
          toDate: 'iso_date_required',
        }),
      );
    }
    if (payload?.fromDate && payload?.toDate && payload.toDate < payload.fromDate) {
      return createImplemented(
        fail('validation_error', 'date_range_invalid', {
          fromDate: 'must_be_before_or_equal_to_toDate',
          toDate: 'must_be_after_or_equal_to_fromDate',
        }),
      );
    }
    try {
      const targetPath = await this.resolveTargetPath('pdf', payload?.targetPath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      const data = await this.buildDailyReportPdfBlocks(payload);
      const html = this.buildPdfHtml('Tagesberichte', data.blocks);
      await exportHtmlToPdf(html, targetPath);
      return createImplemented(
        ok({
          format: 'pdf' as const,
          targetPath,
          itemCount: data.reportCount,
        }),
      );
    } catch {
      return createImplemented(
        fail('unexpected', 'pdf_export_failed'),
      );
    }
  }

  async exportWeeklyReportPdf(payload: { targetPath?: string; weeklyReportId: number }) {
    try {
      const data = await this.buildWeeklyReportPdfBlocks(payload.weeklyReportId);
      if (!data) {
        return createImplemented(
          fail('not_found', 'weekly_report_not_found', {
            weeklyReportId: 'not_found',
          }),
        );
      }
      const targetPath = await this.resolveTargetPath('pdf', payload.targetPath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      const html = this.buildPdfHtml('Wochenbericht', data.blocks);
      await exportHtmlToPdf(html, targetPath);
      return createImplemented(
        ok({
          format: 'pdf' as const,
          targetPath,
          itemCount: data.dailyCount,
        }),
      );
    } catch {
      return createImplemented(
        fail('unexpected', 'pdf_export_failed'),
      );
    }
  }
}
