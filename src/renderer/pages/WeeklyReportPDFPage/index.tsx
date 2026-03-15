import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { useReportsState } from '@/renderer/hooks/useKernelData';
import {
  listWeeksWithDailyReports,
  parseWeeklyReportValues,
} from '@/renderer/lib/report-values';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildListItems(values: string[]): string {
  const items = values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => `<li>${escapeHtml(value)}</li>`)
    .join('');

  return items || '<li>-</li>';
}

function buildWeeklyPdfHtml(input: {
  weekRangeLabel: string;
  dateLabel: string;
  areaLabel: string;
  supervisorLabel: string;
  supervisorSecondaryLabel: string;
  notesLabel: string;
  workLabel: string;
  schoolLabel: string;
  trainingLabel: string;
  reportTitle: string;
  weekRangeValue: string;
  dateValue: string;
  areaValue: string;
  supervisorValue: string;
  supervisorSecondaryValue: string;
  notesValue: string;
  workValues: string[];
  schoolValues: string[];
  trainingValues: string[];
}): string {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.reportTitle)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    html, body { margin: 0; padding: 0; font-family: "Segoe UI", Arial, sans-serif; color: #1b1d22; background: #ffffff; }
    .page { width: 190mm; min-height: 277mm; margin: 0 auto; box-sizing: border-box; border: 1px solid #d7dde8; border-radius: 8px; padding: 9mm; }
    h1 { margin: 0 0 6mm 0; font-size: 20px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 6mm; margin-bottom: 6mm; }
    .meta-row { font-size: 12px; line-height: 1.5; }
    .label { font-weight: 700; }
    .section { margin-top: 4mm; }
    .section h2 { margin: 0 0 2mm 0; font-size: 14px; }
    .section ul { margin: 0; padding-left: 5mm; }
    .section li { margin: 0 0 1.5mm 0; font-size: 12px; line-height: 1.4; }
    .notes { margin-top: 1.5mm; min-height: 12mm; border: 1px solid #d7dde8; border-radius: 5px; padding: 3mm; font-size: 12px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <div class="page">
    <h1>${escapeHtml(input.reportTitle)}</h1>
    <div class="meta">
      <div class="meta-row"><span class="label">${escapeHtml(input.weekRangeLabel)}:</span> ${escapeHtml(input.weekRangeValue)}</div>
      <div class="meta-row"><span class="label">${escapeHtml(input.dateLabel)}:</span> ${escapeHtml(input.dateValue)}</div>
      <div class="meta-row"><span class="label">${escapeHtml(input.areaLabel)}:</span> ${escapeHtml(input.areaValue)}</div>
      <div class="meta-row"><span class="label">${escapeHtml(input.supervisorLabel)}:</span> ${escapeHtml(input.supervisorValue)}</div>
      <div class="meta-row"><span class="label">${escapeHtml(input.supervisorSecondaryLabel)}:</span> ${escapeHtml(input.supervisorSecondaryValue)}</div>
    </div>
    <div class="section">
      <h2>${escapeHtml(input.workLabel)}</h2>
      <ul>${buildListItems(input.workValues)}</ul>
    </div>
    <div class="section">
      <h2>${escapeHtml(input.schoolLabel)}</h2>
      <ul>${buildListItems(input.schoolValues)}</ul>
    </div>
    <div class="section">
      <h2>${escapeHtml(input.trainingLabel)}</h2>
      <ul>${buildListItems(input.trainingValues)}</ul>
    </div>
    <div class="section">
      <h2>${escapeHtml(input.notesLabel)}</h2>
      <div class="notes">${escapeHtml(input.notesValue || '-')}</div>
    </div>
  </div>
</body>
</html>`;
}

export default function WeeklyReportPDFPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const reportsState = useReportsState();
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [isPending, setIsPending] = useState(false);
  const weeks = useMemo(
    () =>
      reportsState.value ? listWeeksWithDailyReports(reportsState.value) : [],
    [reportsState.value],
  );
  const selectedWeek = useMemo(
    () =>
      weeks.find(
        (week) =>
          week.weeklyReport.weekStart === weekStart &&
          week.weeklyReport.weekEnd === weekEnd,
      ) ?? null,
    [weekEnd, weekStart, weeks],
  );
  const parsedValues = selectedWeek
    ? parseWeeklyReportValues(selectedWeek.weeklyReport.values)
    : null;

  async function handleExportPdf() {
    if (!runtime.api || !selectedWeek || !parsedValues) {
      toast.info(t('weeklyPdf.feedback.selectWeekFirst'));
      return;
    }

    setIsPending(true);
    try {
      const html = buildWeeklyPdfHtml({
        reportTitle: t('weeklyPdf.previewTitle'),
        weekRangeLabel: t('weeklyPdf.labels.week'),
        dateLabel: t('weeklyPdf.labels.date'),
        areaLabel: t('weeklyPdf.labels.area'),
        supervisorLabel: t('weeklyPdf.labels.supervisor'),
        supervisorSecondaryLabel: t('weeklyPdf.labels.supervisorSecondary'),
        notesLabel: t('weeklyPdf.sections.notes'),
        workLabel: t('weeklyPdf.sections.work'),
        schoolLabel: t('weeklyPdf.sections.school'),
        trainingLabel: t('weeklyPdf.sections.training'),
        weekRangeValue: `${selectedWeek.weeklyReport.weekStart} - ${selectedWeek.weeklyReport.weekEnd}`,
        dateValue: parsedValues.reportDate || '-',
        areaValue: parsedValues.area || '-',
        supervisorValue: parsedValues.supervisorEmailPrimary || '-',
        supervisorSecondaryValue: parsedValues.supervisorEmailSecondary || '-',
        notesValue: parsedValues.notes,
        workValues: parsedValues.workActivities,
        schoolValues: parsedValues.schoolTopics,
        trainingValues: parsedValues.trainings,
      });
      const outputPath = await runtime.api.exportWeeklyReportPdf({
        defaultFileName: `weekly-report-${selectedWeek.weeklyReport.weekStart}-${selectedWeek.weeklyReport.weekEnd}.pdf`,
        html,
      });
      if (!outputPath) {
        toast.info(t('weeklyPdf.feedback.exportCanceled'));
        return;
      }
      toast.success(t('weeklyPdf.feedback.exported'), outputPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('weeklyPdf.feedback.exportError'), message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('weeklyPdf.title')}
        description={t('weeklyPdf.description')}
        action={
          <Button
            type="button"
            disabled={isPending || !selectedWeek || !parsedValues}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={() => {
              handleExportPdf();
            }}
          >
            {isPending ? t('common.loading') : t('weeklyPdf.export')}
          </Button>
        }
      />
      <SectionCard
        title={t('weeklyPdf.selectorTitle')}
        description={t('weeklyPdf.selectorDescription')}
        className="border-primary-tint bg-white"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
          />
          <Input
            type="date"
            value={weekEnd}
            onChange={(event) => setWeekEnd(event.target.value)}
          />
        </div>
      </SectionCard>
      <div className="mx-auto w-full max-w-[880px] rounded-xl border border-primary-tint bg-white p-8 shadow-sm">
        {selectedWeek && parsedValues ? (
          <div className="space-y-5 text-sm text-text-color">
            <h2 className="text-xl font-semibold">
              {t('weeklyPdf.previewTitle')}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <p>
                <strong>{t('weeklyPdf.labels.week')}:</strong>{' '}
                {selectedWeek.weeklyReport.weekStart} -{' '}
                {selectedWeek.weeklyReport.weekEnd}
              </p>
              <p>
                <strong>{t('weeklyPdf.labels.date')}:</strong>{' '}
                {parsedValues.reportDate || '-'}
              </p>
              <p>
                <strong>{t('weeklyPdf.labels.area')}:</strong>{' '}
                {parsedValues.area || '-'}
              </p>
              <p>
                <strong>{t('weeklyPdf.labels.supervisor')}:</strong>{' '}
                {parsedValues.supervisorEmailPrimary || '-'}
              </p>
              <p>
                <strong>{t('weeklyPdf.labels.supervisorSecondary')}:</strong>{' '}
                {parsedValues.supervisorEmailSecondary || '-'}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">{t('weeklyPdf.sections.work')}</h3>
              <p>{parsedValues.workActivities.join(', ') || '-'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">
                {t('weeklyPdf.sections.school')}
              </h3>
              <p>{parsedValues.schoolTopics.join(', ') || '-'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">
                {t('weeklyPdf.sections.training')}
              </h3>
              <p>{parsedValues.trainings.join(', ') || '-'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">{t('weeklyPdf.sections.notes')}</h3>
              <p>{parsedValues.notes || '-'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-color/75">{t('weeklyPdf.empty')}</p>
        )}
      </div>
    </div>
  );
}
