import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useReportsState } from '@/renderer/hooks/useKernelData';
import {
  listWeeksWithDailyReports,
  parseDailyReportValues,
  parseWeeklyReportValues,
} from '@/renderer/lib/report-values';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';

export default function ReportsOverviewPage() {
  const { t } = useTranslation();
  const reportsState = useReportsState();
  const [search, setSearch] = useState('');
  const [dayTypeFilter, setDayTypeFilter] = useState<
    'all' | 'work' | 'school' | 'free'
  >('all');

  const rows = useMemo(() => {
    if (!reportsState.value) {
      return [];
    }
    return listWeeksWithDailyReports(reportsState.value).flatMap(
      (week, index) => {
        const weeklyValues = parseWeeklyReportValues(week.weeklyReport.values);
        return week.dailyReports.map((dailyReport, dayIndex) => {
          const parsed = parseDailyReportValues(dailyReport.values);
          const searchableContent = [
            dailyReport.date,
            ...parsed.activities,
            ...parsed.schoolTopics,
            ...parsed.trainings,
            parsed.freeReason,
          ]
            .join(' ')
            .toLowerCase();
          return {
            id: dailyReport.id,
            date: dailyReport.date,
            dayType: parsed.dayType,
            summary:
              parsed.dayType === 'free'
                ? parsed.freeReason || '-'
                : [
                    ...parsed.activities,
                    ...parsed.schoolTopics,
                    ...parsed.trainings,
                  ].join(', ') || '-',
            weekStart: week.weeklyReport.weekStart,
            weekEnd: week.weeklyReport.weekEnd,
            submitted: weeklyValues.submitted,
            submittedToEmail: weeklyValues.submittedToEmail ?? '-',
            area: weeklyValues.area || '-',
            isWeekStart: dayIndex === 0 && index > 0,
            searchableContent,
          };
        });
      },
    );
  }, [reportsState.value]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (dayTypeFilter !== 'all' && row.dayType !== dayTypeFilter) {
          return false;
        }
        if (search.trim().length) {
          return row.searchableContent.includes(search.trim().toLowerCase());
        }
        return true;
      }),
    [dayTypeFilter, rows, search],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('reportsOverview.title')}
        description={t('reportsOverview.description')}
      />
      <SectionCard
        title={t('reportsOverview.filters.title')}
        className="border-primary-tint bg-white"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={search}
            placeholder={t('reportsOverview.filters.searchPlaceholder')}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            value={dayTypeFilter}
            onChange={(event) =>
              setDayTypeFilter(
                event.target.value as 'all' | 'work' | 'school' | 'free',
              )
            }
          >
            <option value="all">{t('reportsOverview.filters.allTypes')}</option>
            <option value="work">{t('dailyReport.dayTypes.work')}</option>
            <option value="school">{t('dailyReport.dayTypes.school')}</option>
            <option value="free">{t('dailyReport.dayTypes.free')}</option>
          </select>
        </div>
      </SectionCard>
      <SectionCard
        title={t('reportsOverview.table.title')}
        className="border-primary-tint bg-white"
      >
        <div className="overflow-x-auto rounded-md border border-primary-tint/70">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary-tint/35">
                <TableHead>{t('reportsOverview.table.date')}</TableHead>
                <TableHead>{t('reportsOverview.table.dayType')}</TableHead>
                <TableHead>{t('reportsOverview.table.entries')}</TableHead>
                <TableHead>{t('reportsOverview.table.submitted')}</TableHead>
                <TableHead>{t('reportsOverview.table.submittedTo')}</TableHead>
                <TableHead>{t('reportsOverview.table.area')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.isWeekStart ? 'border-t-4 border-primary' : ''}
                >
                  <TableCell>{row.date}</TableCell>
                  <TableCell>
                    {t(`dailyReport.dayTypes.${row.dayType}`)}
                  </TableCell>
                  <TableCell className="max-w-[420px] whitespace-normal">
                    {row.summary}
                  </TableCell>
                  <TableCell>
                    {row.submitted ? t('common.yes') : t('common.no')}
                  </TableCell>
                  <TableCell>{row.submittedToEmail}</TableCell>
                  <TableCell>{row.area}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
