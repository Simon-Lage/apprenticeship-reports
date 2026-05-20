import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiDownload, FiExternalLink } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import WeeklyReportDocument from '@/renderer/components/weekly-report/WeeklyReportDocument';
import WeeklyReportStickyHeader from '@/renderer/components/weekly-report/WeeklyReportStickyHeader';
import { useSelectedCompleteWeek } from '@/renderer/hooks/useSelectedCompleteWeek';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import {
  parseOnboardingTrainingPeriod,
  parseOnboardingWorkplace,
} from '@/renderer/lib/app-settings';
import {
  buildWeeklyDocumentData,
  createWeeklyDocumentTranslations,
} from '@/renderer/lib/weekly-report-document';
import { appRoutes } from '@/renderer/lib/app-routes';
import { parseWeeklyReportValues } from '@/renderer/lib/report-values';
import { resolveReportStartDateFromSettings } from '@/shared/settings/report-start-date';

function createWeeklyReportPdfRoute(
  weekStart: string,
  weekEnd: string,
): string {
  return `${appRoutes.weeklyReportPdf}?weekStart=${encodeURIComponent(weekStart)}&weekEnd=${encodeURIComponent(weekEnd)}`;
}

export default function WeeklyReportPDFPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();
  const documentRef = useRef<HTMLDivElement>(null);
  const {
    completeWeeks,
    requestedWeekRange,
    requestedWeekIsComplete,
    selectedWeek,
    selectedWeekIdentity,
  } = useSelectedCompleteWeek(reportsState.value, location.search);
  const settingsValues = useMemo(
    () => settingsSnapshot.value?.values ?? {},
    [settingsSnapshot.value?.values],
  );
  const reportStartDate = useMemo(
    () => resolveReportStartDateFromSettings(settingsValues),
    [settingsValues],
  );
  const trainingPeriod = useMemo(
    () => parseOnboardingTrainingPeriod(settingsValues),
    [settingsValues],
  );
  const workplace = useMemo(
    () => parseOnboardingWorkplace(settingsValues),
    [settingsValues],
  );
  const documentTranslations = useMemo(
    () => createWeeklyDocumentTranslations(t),
    [t],
  );
  const parsedWeekValues = useMemo(
    () =>
      selectedWeek
        ? parseWeeklyReportValues(selectedWeek.weeklyReport.values)
        : null,
    [selectedWeek],
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
  const { ihkLink } = workplace;

  const handleOpenIhk = () => {
    if (!ihkLink) {
      return;
    }

    window.open(ihkLink, '_blank', 'noopener,noreferrer');
  };

  const handleExport = async () => {
    if (!selectedWeek || !documentRef.current) {
      return;
    }

    const contentHtml = documentRef.current.outerHTML;
    const styleTags = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]'),
    )
      .map((element) => element.outerHTML)
      .join('\n');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          ${styleTags}
          <style>
            @page { margin: 0; size: A4 portrait; }
            html, body { background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; color-adjust: exact; }
            article { gap: 0 !important; max-width: none !important; }
            .weekly-report-pdf-page { box-shadow: none !important; break-after: page; page-break-after: always; margin: 0 !important; }
            .weekly-report-pdf-page:last-child { break-after: auto; page-break-after: auto; }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `;

    const identity = selectedWeekIdentity.replace(':', '_');
    await window.electron.app.exportWeeklyReportPdf({
      defaultFileName: `Wochenbericht_${identity}.pdf`,
      html: fullHtml,
    });
  };

  useEffect(() => {
    if (!reportsState.value || !requestedWeekRange || requestedWeekIsComplete) {
      return;
    }

    navigate(
      `${appRoutes.weeklyReport}?weekStart=${encodeURIComponent(requestedWeekRange.weekStart)}&weekEnd=${encodeURIComponent(requestedWeekRange.weekEnd)}`,
      { replace: true },
    );
  }, [
    navigate,
    reportsState.value,
    requestedWeekIsComplete,
    requestedWeekRange,
  ]);

  return (
    <div className="space-y-6 pb-10">
      <WeeklyReportStickyHeader
        weekStart={selectedWeek?.weeklyReport.weekStart ?? ''}
        weekEnd={selectedWeek?.weeklyReport.weekEnd ?? ''}
        reportStartDate={reportStartDate}
        trainingEnd={trainingPeriod.trainingEnd}
        isSubmitted={Boolean(parsedWeekValues?.submitted)}
        onNavigateWeek={(weekRange) => {
          navigate(
            createWeeklyReportPdfRoute(weekRange.weekStart, weekRange.weekEnd),
          );
        }}
      >
        <Button
          type="button"
          variant="outline"
          className="border-primary-tint"
          disabled={!ihkLink}
          disabledReason={t('common.disabledReasons.missingIhkLink')}
          onClick={handleOpenIhk}
        >
          <FiExternalLink className="size-4" />
          {t('sendWeeklyReport.openIhk')}
        </Button>
      </WeeklyReportStickyHeader>

      {selectedWeek && documentData ? (
        <div ref={documentRef}>
          <WeeklyReportDocument document={documentData} />
        </div>
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

      <div className="pointer-events-none fixed bottom-6 left-6 right-6 z-50 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(appRoutes.weeklyReport)}
          className="pointer-events-auto border-primary-tint/70 bg-white shadow-md"
        >
          {t('common.cancel')}
        </Button>
        {selectedWeek ? (
          <Button
            className="pointer-events-auto bg-primary text-primary-contrast shadow-md hover:bg-primary-shade"
            onClick={handleExport}
          >
            <FiDownload className="size-4" />
            {t('common.export')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
