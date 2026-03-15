import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useReportsState } from '@/renderer/hooks/useKernelData';
import { listWeeksWithDailyReports, parseWeeklyReportValues } from '@/renderer/lib/report-values';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function WeeklyReportPDFPage() {
  const { t } = useTranslation();
  const reportsState = useReportsState();
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const weeks = useMemo(
    () => (reportsState.value ? listWeeksWithDailyReports(reportsState.value) : []),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('weeklyPdf.title')}
        description={t('weeklyPdf.description')}
        action={
          <Button
            type="button"
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={() => window.print()}
          >
            {t('weeklyPdf.export')}
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
            <h2 className="text-xl font-semibold">{t('weeklyPdf.previewTitle')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <p>
                <strong>{t('weeklyPdf.labels.week')}:</strong>{' '}
                {selectedWeek.weeklyReport.weekStart} - {selectedWeek.weeklyReport.weekEnd}
              </p>
              <p>
                <strong>{t('weeklyPdf.labels.date')}:</strong> {parsedValues.reportDate}
              </p>
              <p>
                <strong>{t('weeklyPdf.labels.area')}:</strong> {parsedValues.area}
              </p>
              <p>
                <strong>{t('weeklyPdf.labels.supervisor')}:</strong>{' '}
                {parsedValues.supervisorEmailPrimary}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">{t('weeklyPdf.sections.work')}</h3>
              <p>{parsedValues.workActivities.join(', ') || '-'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">{t('weeklyPdf.sections.school')}</h3>
              <p>{parsedValues.schoolTopics.join(', ') || '-'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">{t('weeklyPdf.sections.training')}</h3>
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
