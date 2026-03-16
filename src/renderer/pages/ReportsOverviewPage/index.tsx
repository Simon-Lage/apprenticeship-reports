import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiX } from 'react-icons/fi';

import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useReportsState } from '@/renderer/hooks/useKernelData';
import { appRoutes } from '@/renderer/lib/app-routes';
import {
  listWeekDates,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function toDisplayDate(dateValue: string): string {
  const [year, month, day] = dateValue.split('-');

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${day}.${month}.${year}`;
}

export default function ReportsOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reportsState = useReportsState();
  const [search, setSearch] = useState('');
  const [hoveredWeekKey, setHoveredWeekKey] = useState<string | null>(null);
  const [dayTypeFilter, setDayTypeFilter] = useState<
    'all' | 'work' | 'school' | 'free'
  >('all');

  const rows = useMemo(() => {
    if (!reportsState.value) {
      return [];
    }

    const sortedWeeks = Object.values(reportsState.value.weeklyReports).sort(
      (left, right) => left.weekStart.localeCompare(right.weekStart),
    );

    return sortedWeeks.flatMap((weeklyReport, weekIndex) => {
      const weeklyValues = parseWeeklyReportValues(weeklyReport.values);
      const dailyByDate = new Map(
        weeklyReport.dailyReportIds
          .map(
            (dailyReportId) => reportsState.value?.dailyReports[dailyReportId],
          )
          .filter(
            (dailyReport): dailyReport is NonNullable<typeof dailyReport> =>
              Boolean(dailyReport),
          )
          .map((dailyReport) => [dailyReport.date, dailyReport]),
      );

      return listWeekDates(weeklyReport.weekStart, weeklyReport.weekEnd).map(
        (date, rowIndex) => {
          const dailyReport = dailyByDate.get(date) ?? null;
          const parsed = dailyReport
            ? parseDailyReportValues(dailyReport.values)
            : null;
          let summary = '-';

          if (parsed) {
            if (parsed.dayType === 'free') {
              summary = parsed.freeReason || '-';
            } else {
              summary =
                [
                  ...parsed.activities,
                  ...parsed.schoolTopics,
                  ...parsed.trainings,
                ].join(', ') || '-';
            }
          }

          const searchableContent = [
            date,
            summary,
            weeklyValues.submittedToEmail ?? '',
            weeklyValues.area ?? '',
          ]
            .join(' ')
            .toLowerCase();

          return {
            id: dailyReport?.id ?? null,
            date,
            dayType: parsed?.dayType ?? null,
            summary,
            weekStart: weeklyReport.weekStart,
            weekEnd: weeklyReport.weekEnd,
            weekKey: `${weeklyReport.weekStart}-${weeklyReport.weekEnd}`,
            submitted: weeklyValues.submitted,
            submittedToEmail: weeklyValues.submittedToEmail ?? '-',
            area: weeklyValues.area || '-',
            isWeekStart: rowIndex === 0 && weekIndex > 0,
            isWeekFirstRow: rowIndex === 0,
            weekRowSpan: 7,
            searchableContent,
          };
        },
      );
    });
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
      <SectionCard className="border-primary-tint bg-white">
        <div className="overflow-x-auto rounded-md border border-primary-tint/70">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary-tint/35">
                <TableHead>{t('reportsOverview.table.date')}</TableHead>
                <TableHead>{t('reportsOverview.table.dayType')}</TableHead>
                <TableHead>{t('reportsOverview.table.entries')}</TableHead>
                <TableHead className="border-l border-primary-tint/70">
                  {t('reportsOverview.table.submitted')}
                </TableHead>
                <TableHead className="border-l border-primary-tint/70">
                  {t('reportsOverview.table.submittedTo')}
                </TableHead>
                <TableHead className="border-l border-primary-tint/70">
                  {t('reportsOverview.table.area')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow
                  key={`${row.date}-${row.id ?? 'empty'}`}
                  className={
                    row.isWeekStart
                      ? 'border-t-4 border-primary hover:bg-transparent'
                      : 'hover:bg-transparent'
                  }
                >
                  <TableCell
                    className={
                      row.id ? 'cursor-pointer hover:bg-primary-tint/15' : ''
                    }
                    onClick={() => {
                      if (!row.id) {
                        return;
                      }

                      navigate(
                        `${appRoutes.dailyReport}?date=${encodeURIComponent(row.date)}`,
                      );
                    }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{toDisplayDate(row.date)}</span>
                      </TooltipTrigger>
                      {row.id ? (
                        <TooltipContent side="top" sideOffset={8}>
                          {t('reportsOverview.table.openDailyTooltip', {
                            date: toDisplayDate(row.date),
                          })}
                        </TooltipContent>
                      ) : null}
                    </Tooltip>
                  </TableCell>
                  <TableCell
                    className={
                      row.id ? 'cursor-pointer hover:bg-primary-tint/15' : ''
                    }
                    onClick={() => {
                      if (!row.id) {
                        return;
                      }

                      navigate(
                        `${appRoutes.dailyReport}?date=${encodeURIComponent(row.date)}`,
                      );
                    }}
                  >
                    {row.dayType
                      ? t(`dailyReport.dayTypes.${row.dayType}`)
                      : '-'}
                  </TableCell>
                  <TableCell
                    className={`max-w-[420px] whitespace-normal ${
                      row.id ? 'cursor-pointer hover:bg-primary-tint/15' : ''
                    }`}
                    onClick={() => {
                      if (!row.id) {
                        return;
                      }

                      navigate(
                        `${appRoutes.dailyReport}?date=${encodeURIComponent(row.date)}`,
                      );
                    }}
                  >
                    {row.summary}
                  </TableCell>
                  {row.isWeekFirstRow ? (
                    <>
                      <TableCell
                        rowSpan={row.weekRowSpan}
                        className={`border-l border-primary-tint/70 ${
                          hoveredWeekKey === row.weekKey
                            ? 'bg-primary-tint/25'
                            : ''
                        } cursor-pointer`}
                        onMouseEnter={() => {
                          setHoveredWeekKey(row.weekKey);
                        }}
                        onMouseLeave={() => {
                          setHoveredWeekKey((current) =>
                            current === row.weekKey ? null : current,
                          );
                        }}
                        onClick={() => {
                          navigate(
                            `${appRoutes.weeklyReport}?weekStart=${encodeURIComponent(row.weekStart)}&weekEnd=${encodeURIComponent(row.weekEnd)}`,
                          );
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex w-full justify-center">
                              {row.submitted ? (
                                <FiCheck className="size-4 text-primary" />
                              ) : (
                                <FiX className="size-4 text-text-color/70" />
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={8}>
                            {t('reportsOverview.table.openWeeklyTooltip', {
                              start: toDisplayDate(row.weekStart),
                              end: toDisplayDate(row.weekEnd),
                            })}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell
                        rowSpan={row.weekRowSpan}
                        className={`border-l border-primary-tint/70 ${
                          hoveredWeekKey === row.weekKey
                            ? 'bg-primary-tint/25'
                            : ''
                        } cursor-pointer`}
                        onMouseEnter={() => {
                          setHoveredWeekKey(row.weekKey);
                        }}
                        onMouseLeave={() => {
                          setHoveredWeekKey((current) =>
                            current === row.weekKey ? null : current,
                          );
                        }}
                        onClick={() => {
                          navigate(
                            `${appRoutes.weeklyReport}?weekStart=${encodeURIComponent(row.weekStart)}&weekEnd=${encodeURIComponent(row.weekEnd)}`,
                          );
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{row.submittedToEmail}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={8}>
                            {t('reportsOverview.table.openWeeklyTooltip', {
                              start: toDisplayDate(row.weekStart),
                              end: toDisplayDate(row.weekEnd),
                            })}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell
                        rowSpan={row.weekRowSpan}
                        className={`border-l border-primary-tint/70 ${
                          hoveredWeekKey === row.weekKey
                            ? 'bg-primary-tint/25'
                            : ''
                        } cursor-pointer`}
                        onMouseEnter={() => {
                          setHoveredWeekKey(row.weekKey);
                        }}
                        onMouseLeave={() => {
                          setHoveredWeekKey((current) =>
                            current === row.weekKey ? null : current,
                          );
                        }}
                        onClick={() => {
                          navigate(
                            `${appRoutes.weeklyReport}?weekStart=${encodeURIComponent(row.weekStart)}&weekEnd=${encodeURIComponent(row.weekEnd)}`,
                          );
                        }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{row.area}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={8}>
                            {t('reportsOverview.table.openWeeklyTooltip', {
                              start: toDisplayDate(row.weekStart),
                              end: toDisplayDate(row.weekEnd),
                            })}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
