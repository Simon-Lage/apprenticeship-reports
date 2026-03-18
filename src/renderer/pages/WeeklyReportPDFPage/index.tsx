import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import WeeklyReportDocument from '@/renderer/components/weekly-report/WeeklyReportDocument';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { useSelectedCompleteWeek } from '@/renderer/hooks/useSelectedCompleteWeek';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import {
  buildWeeklyDocumentData,
  buildWeeklyDocumentHtml,
  createWeeklyDocumentTranslations,
} from '@/renderer/lib/weekly-report-document';

function toDisplayDate(value: string): string {
  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

export default function WeeklyReportPDFPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();
  const [isPending, setIsPending] = useState(false);
  const { completeWeeks, selectedWeek, selectedWeekIdentity, setSelectedWeekIdentity } =
    useSelectedCompleteWeek(reportsState.value, location.search);
  const documentTranslations = useMemo(
    () => createWeeklyDocumentTranslations(t),
    [t],
  );
  const documentData = useMemo(() => {
    if (!selectedWeek || !settingsSnapshot.value) {
      return null;
    }

    return buildWeeklyDocumentData({
      week: selectedWeek,
      settingsValues: settingsSnapshot.value.values,
      translations: documentTranslations,
    });
  }, [documentTranslations, selectedWeek, settingsSnapshot.value]);

  async function handleExportPdf() {
    if (!runtime.api || !selectedWeek || !documentData) {
      toast.info(t('weeklyPdf.feedback.selectWeekFirst'));
      return;
    }

    setIsPending(true);
    try {
      const outputPath = await runtime.api.exportWeeklyReportPdf({
        defaultFileName: `weekly-report-${selectedWeek.weeklyReport.weekStart}-${selectedWeek.weeklyReport.weekEnd}.pdf`,
        html: buildWeeklyDocumentHtml({
          document: documentData,
        }),
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
    <div className="space-y-6 pb-10">
      <PageHeader
        title={t('weeklyPdf.title')}
        description={t('weeklyPdf.description')}
        action={
          <Button
            type="button"
            disabled={isPending || !selectedWeek || !documentData}
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-end">
          <FormField
            id="weekly-report-pdf-week"
            label={t('weeklyPdf.selectorLabel')}
          >
            <select
              id="weekly-report-pdf-week"
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              value={selectedWeekIdentity}
              onChange={(event) => setSelectedWeekIdentity(event.target.value)}
              disabled={!completeWeeks.length}
            >
              <option value="">{t('weeklyPdf.selectorPlaceholder')}</option>
              {completeWeeks.map((week) => {
                const identity = `${week.weeklyReport.weekStart}:${week.weeklyReport.weekEnd}`;
                const label = `${toDisplayDate(week.weeklyReport.weekStart)} - ${toDisplayDate(week.weeklyReport.weekEnd)}`;

                return (
                  <option key={identity} value={identity}>
                    {label}
                  </option>
                );
              })}
            </select>
          </FormField>
          <Alert className="border-primary-tint bg-primary-tint/20">
            <AlertTitle>{t('weeklyPdf.completeWeeksTitle')}</AlertTitle>
            <AlertDescription>
              {t('weeklyPdf.completeWeeksDescription')}
            </AlertDescription>
          </Alert>
        </div>
      </SectionCard>

      {selectedWeek && documentData ? (
        <WeeklyReportDocument document={documentData} />
      ) : (
        <Alert className="border-primary-tint bg-primary-tint/20">
          <AlertTitle>{t('weeklyPdf.emptyTitle')}</AlertTitle>
          <AlertDescription>
            {completeWeeks.length
              ? t('weeklyPdf.empty')
              : t('weeklyPdf.noCompleteWeeks')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
