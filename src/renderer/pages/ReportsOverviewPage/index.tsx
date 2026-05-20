import { useDeferredValue, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiXCircle,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

import DayTypeBadge from '@/renderer/components/app/DayTypeBadge';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import { parseUiSettings } from '@/renderer/lib/app-settings';
import { appRoutes } from '@/renderer/lib/app-routes';
import { resolveAutoDayType } from '@/renderer/pages/DailyReportPage/utils/day-type-defaults';
import {
  formatConflictDayTypeLabel,
  formatConflictReasonLabel,
  resolveDailyReportAbsenceConflict,
} from '@/renderer/lib/report-conflicts';
import { resolveDailyReportDayTypeIcon } from '@/renderer/lib/daily-report-labels';
import { formatGermanDate } from '@/renderer/lib/date-format';
import { getIsoWeekNumber, parseIsoDate } from '@/renderer/lib/iso-date';
import {
  DayTypeValue,
  listWeekDates,
  parseDailyReportValues,
  parseWeeklyReportValues,
} from '@/renderer/lib/report-values';
import { cn } from '@/renderer/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { parseAbsenceSettings } from '@/shared/absence/settings';
import { WeeklyReportRecord } from '@/shared/reports/models';
import {
  filterWeekRangesThroughCurrentWeek,
  listCoveredWeekRanges,
} from '@/renderer/pages/ReportsOverviewPage/week-ranges';

type WeeklyNavigationRow = {
  canOpenWeeklyReport: boolean;
  weekStart: string;
  weekEnd: string;
  weeklyTooltipText: string;
};

type DayTypeFilterValue = 'all' | DayTypeValue;

type DayTypeFilterOption = {
  value: DayTypeFilterValue;
  label: string;
  Icon: IconType | null;
};

const weekdayTranslationKeys = [
  'reportsOverview.table.weekdays.sunday',
  'reportsOverview.table.weekdays.monday',
  'reportsOverview.table.weekdays.tuesday',
  'reportsOverview.table.weekdays.wednesday',
  'reportsOverview.table.weekdays.thursday',
  'reportsOverview.table.weekdays.friday',
  'reportsOverview.table.weekdays.saturday',
] as const;

function formatWeekdayShort(t: TFunction, dateValue: string): string {
  const parsed = parseIsoDate(dateValue);

  if (!parsed) {
    return '';
  }

  return t(weekdayTranslationKeys[parsed.getUTCDay()]);
}

export default function ReportsOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [isDayTypeFilterOpen, setIsDayTypeFilterOpen] = useState(false);
  const [dayTypeFilter, setDayTypeFilter] = useState<DayTypeFilterValue>('all');

  const absenceSettings = useMemo(
    () => parseAbsenceSettings(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const uiSettings = useMemo(
    () => parseUiSettings(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const dayTypeFilterOptions = useMemo<DayTypeFilterOption[]>(
    () => [
      {
        value: 'all',
        label: t('reportsOverview.filters.allTypes'),
        Icon: null,
      },
      {
        value: 'work',
        label: t('dailyReport.dayTypes.work'),
        Icon: resolveDailyReportDayTypeIcon({
          dayType: 'work',
          freeReason: '',
        }),
      },
      {
        value: 'school',
        label: t('dailyReport.dayTypes.school'),
        Icon: resolveDailyReportDayTypeIcon({
          dayType: 'school',
          freeReason: '',
        }),
      },
      {
        value: 'free',
        label: t('dailyReport.dayTypes.free'),
        Icon: resolveDailyReportDayTypeIcon({
          dayType: 'free',
          freeReason: '',
        }),
      },
    ],
    [t],
  );
  const selectedDayTypeFilter =
    dayTypeFilterOptions.find((option) => option.value === dayTypeFilter) ??
    dayTypeFilterOptions[0];
  const SelectedDayTypeIcon = selectedDayTypeFilter.Icon;
  const rows = useMemo(() => {
    if (!reportsState.value) {
      return [];
    }

    const weeklyReportsByRange = new Map<string, WeeklyReportRecord>(
      Object.values(reportsState.value.weeklyReports).map((weeklyReport) => [
        `${weeklyReport.weekStart}-${weeklyReport.weekEnd}`,
        weeklyReport,
      ]),
    );
    const derivedRanges = [
      ...absenceSettings.manualAbsences.flatMap((entry) =>
        listCoveredWeekRanges({
          startDate: entry.startDate,
          endDate: entry.endDate,
        }),
      ),
      ...Object.values(absenceSettings.catalogsByYear).flatMap((catalog) => [
        ...catalog.publicHolidays.flatMap((entry) =>
          listCoveredWeekRanges({
            startDate: entry.startDate,
            endDate: entry.endDate,
          }),
        ),
        ...catalog.schoolHolidays.flatMap((entry) =>
          listCoveredWeekRanges({
            startDate: entry.startDate,
            endDate: entry.endDate,
          }),
        ),
      ]),
    ];
    const weekRanges = Array.from(
      new Set([
        ...Object.values(reportsState.value.weeklyReports).map(
          (weeklyReport) => `${weeklyReport.weekStart}|${weeklyReport.weekEnd}`,
        ),
        ...derivedRanges.map((range) => `${range.weekStart}|${range.weekEnd}`),
      ]),
    )
      .map((identity) => {
        const [weekStart, weekEnd] = identity.split('|');
        return {
          weekStart: weekStart ?? '',
          weekEnd: weekEnd ?? '',
        };
      })
      .filter((range) => range.weekStart && range.weekEnd)
      .sort((left, right) => right.weekStart.localeCompare(left.weekStart));
    const sortedWeekRanges = filterWeekRangesThroughCurrentWeek(weekRanges);
    const dailyReportsByDate = new Map(
      Object.values(reportsState.value.dailyReports).map((dailyReport) => [
        dailyReport.date,
        dailyReport,
      ]),
    );

    return sortedWeekRanges.flatMap((range, weekIndex) => {
      const weeklyReport =
        weeklyReportsByRange.get(`${range.weekStart}-${range.weekEnd}`) ?? null;
      const weeklyValues = parseWeeklyReportValues(weeklyReport?.values);
      const weekDates = listWeekDates(range.weekStart, range.weekEnd).reverse();
      const canOpenWeeklyReport = weekDates.length > 0;
      const weekNumber = getIsoWeekNumber(range.weekStart);
      const weeklyTooltipText = t('reportsOverview.table.openWeeklyTooltip', {
        start: formatGermanDate(range.weekStart),
        end: formatGermanDate(range.weekEnd),
      });
      const calendarWeekText = weekNumber
        ? t('reportsOverview.table.calendarWeekValue', {
            week: weekNumber,
          })
        : '-';

      return weekDates.map((date, rowIndex) => {
        const dailyReport = dailyReportsByDate.get(date) ?? null;
        const parsed = dailyReport
          ? parseDailyReportValues(dailyReport.values)
          : null;
        const inferredDayType = parsed
          ? null
          : resolveAutoDayType({
              date,
              uiSettings,
              absenceSettings,
              currentYear: Number(date.slice(0, 4)),
            });
        const conflict =
          dailyReport && !weeklyValues.submitted
            ? resolveDailyReportAbsenceConflict({
                date: dailyReport.date,
                values: dailyReport.values,
                absenceSettings,
              })
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
        } else if (inferredDayType?.dayType === 'free') {
          summary = inferredDayType.freeReason || '-';
        }

        const resolvedDayType =
          parsed?.dayType ?? inferredDayType?.dayType ?? null;
        const resolvedFreeReason =
          parsed?.freeReason ??
          (inferredDayType?.dayType === 'free'
            ? inferredDayType.freeReason
            : '');

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
          formattedDate: formatGermanDate(date),
          weekdayShort: formatWeekdayShort(t, date),
          dailyTooltipText: t('reportsOverview.table.openDailyTooltip', {
            date: formatGermanDate(date),
          }),
          dayType: resolvedDayType,
          freeReason: resolvedFreeReason,
          summary,
          weekStart: range.weekStart,
          weekEnd: range.weekEnd,
          weekKey: `${range.weekStart}-${range.weekEnd}`,
          weekNumber,
          weeklyTooltipText,
          calendarWeekText,
          submitted: weeklyValues.submitted,
          submittedToEmail: weeklyValues.submittedToEmail ?? '-',
          area: weeklyValues.area || '-',
          canOpenWeeklyReport,
          conflict,
          isWeekStart: rowIndex === 0 && weekIndex > 0,
          isWeekFirstRow: rowIndex === 0,
          weekRowSpan: weekDates.length,
          searchableContent,
        };
      });
    });
  }, [absenceSettings, reportsState.value, t, uiSettings]);

  const normalizedSearch = useMemo(
    () => deferredSearch.trim().toLowerCase(),
    [deferredSearch],
  );
  const filteredRows = useMemo(() => {
    const nextRows = rows.filter((row) => {
      if (dayTypeFilter !== 'all' && row.dayType !== dayTypeFilter) {
        return false;
      }

      if (normalizedSearch.length) {
        return row.searchableContent.includes(normalizedSearch);
      }
      return true;
    });
    const weekRowCounts = nextRows.reduce<Map<string, number>>(
      (result, row) =>
        result.set(row.weekKey, (result.get(row.weekKey) ?? 0) + 1),
      new Map(),
    );
    const seenWeekKeys = new Set<string>();

    return nextRows.map((row, index) => {
      const isWeekFirstRow = !seenWeekKeys.has(row.weekKey);

      if (isWeekFirstRow) {
        seenWeekKeys.add(row.weekKey);
      }

      return {
        ...row,
        isWeekStart: isWeekFirstRow && index > 0,
        isWeekFirstRow,
        weekRowSpan: weekRowCounts.get(row.weekKey) ?? 1,
      };
    });
  }, [dayTypeFilter, rows, normalizedSearch]);
  const getDailyCellClassName = (className = ''): string => {
    return [
      className,
      'reports-overview-day-cell cursor-pointer transition-none',
    ]
      .filter(Boolean)
      .join(' ');
  };
  const handleDailyCellClick = (row: { date: string }) => {
    navigate(`${appRoutes.dailyReport}?date=${encodeURIComponent(row.date)}`);
  };
  const getWeeklyCellClassName = (
    row: {
      canOpenWeeklyReport: boolean;
      weekKey: string;
    },
    className = '',
  ): string => {
    return [
      className,
      'reports-overview-week-cell border-l border-primary-tint/70 transition-none',
      row.canOpenWeeklyReport ? 'cursor-pointer' : '',
    ]
      .filter(Boolean)
      .join(' ');
  };
  const handleWeeklyCellClick = (row: {
    canOpenWeeklyReport: boolean;
    weekStart: string;
    weekEnd: string;
  }) => {
    if (!row.canOpenWeeklyReport) {
      return;
    }

    navigate(
      `${appRoutes.weeklyReport}?weekStart=${encodeURIComponent(row.weekStart)}&weekEnd=${encodeURIComponent(row.weekEnd)}`,
    );
  };
  const handleWeeklyCellKeyDown = (
    event: KeyboardEvent<HTMLTableCellElement>,
    row: WeeklyNavigationRow,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    handleWeeklyCellClick(row);
  };
  const tableHeadClassName = 'bg-primary-tint/95 backdrop-blur';

  return (
    <div className="space-y-4">
      <SectionCard
        title={t('reportsOverview.entriesTitle')}
        titleClassName="leading-9"
        className="overflow-visible border-primary-tint bg-white"
        headerClassName="sticky -top-6 z-30 rounded-t-xl border-b border-primary-tint/60 bg-white/95 py-3 shadow-sm backdrop-blur"
        action={
          <div className="grid w-full gap-3 md:ml-auto md:w-auto md:grid-cols-[minmax(280px,1fr)_220px]">
            <Input
              value={search}
              placeholder={t('reportsOverview.filters.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Popover
              open={isDayTypeFilterOpen}
              onOpenChange={setIsDayTypeFilterOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isDayTypeFilterOpen}
                  className="justify-between"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    {SelectedDayTypeIcon ? (
                      <SelectedDayTypeIcon className="size-4 shrink-0 text-primary" />
                    ) : null}
                    <span className="truncate">
                      {selectedDayTypeFilter.label}
                    </span>
                  </span>
                  <FiChevronDown className="size-4 shrink-0 text-text-color/60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[220px] p-0">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {dayTypeFilterOptions.map((option) => {
                        const OptionIcon = option.Icon;
                        const isSelected = option.value === dayTypeFilter;

                        return (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            className="cursor-pointer"
                            onSelect={() => {
                              setDayTypeFilter(option.value);
                              setIsDayTypeFilterOpen(false);
                            }}
                          >
                            {OptionIcon ? (
                              <OptionIcon className="size-4 text-primary" />
                            ) : null}
                            <span
                              className={cn(
                                'min-w-0 flex-1 truncate',
                                !OptionIcon ? 'pl-6' : '',
                              )}
                            >
                              {option.label}
                            </span>
                            <FiCheck
                              className={cn(
                                'size-4',
                                isSelected ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        }
      >
        <div className="rounded-md border border-primary-tint/70 [&_[data-slot=table-container]]:overflow-visible">
          <Table>
            <TableHeader className="sticky top-[2.7rem] z-20 shadow-sm">
              <TableRow className="">
                <TableHead className={tableHeadClassName}>
                  {t('reportsOverview.table.date')}
                </TableHead>
                <TableHead className={tableHeadClassName}>
                  {t('reportsOverview.table.dayType')}
                </TableHead>
                <TableHead className={tableHeadClassName}>
                  {t('reportsOverview.table.entries')}
                </TableHead>
                <TableHead className={tableHeadClassName}>
                  {t('reportsOverview.table.conflict')}
                </TableHead>
                <TableHead
                  className={`${tableHeadClassName} border-l border-primary-tint/70`}
                >
                  {t('reportsOverview.table.submitted')}
                </TableHead>
                <TableHead
                  className={`${tableHeadClassName} border-l border-primary-tint/70`}
                >
                  {t('reportsOverview.table.submittedTo')}
                </TableHead>
                <TableHead
                  className={`${tableHeadClassName} border-l border-primary-tint/70`}
                >
                  {t('reportsOverview.table.area')}
                </TableHead>
                <TableHead
                  className={`${tableHeadClassName} w-px whitespace-nowrap border-l border-primary-tint/70 text-center`}
                >
                  {t('reportsOverview.table.calendarWeek')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => {
                const weeklyCellTitle = row.canOpenWeeklyReport
                  ? row.weeklyTooltipText
                  : '';
                const weeklyCellRole = row.canOpenWeeklyReport
                  ? 'button'
                  : undefined;
                const weeklyCellTabIndex = row.canOpenWeeklyReport
                  ? 0
                  : undefined;

                return (
                  <TableRow
                    key={`${row.date}-${row.id ?? 'empty'}`}
                    className={
                      row.isWeekStart
                        ? 'border-t-4 border-primary transition-none hover:bg-transparent [&:has(.reports-overview-day-cell:hover)_.reports-overview-day-cell]:bg-primary-tint/15 [&:has(.reports-overview-week-cell:hover)_.reports-overview-week-cell]:bg-primary-tint/15'
                        : 'transition-none hover:bg-transparent [&:has(.reports-overview-day-cell:hover)_.reports-overview-day-cell]:bg-primary-tint/15 [&:has(.reports-overview-week-cell:hover)_.reports-overview-week-cell]:bg-primary-tint/15'
                    }
                  >
                    <TableCell
                      className={getDailyCellClassName()}
                      title={row.dailyTooltipText}
                      onClick={() => handleDailyCellClick(row)}
                    >
                      <span className="inline-flex items-center gap-3">
                        <span className="min-w-8 text-left font-medium text-text-color/70">
                          {row.weekdayShort}
                        </span>
                        <span>{row.formattedDate}</span>
                      </span>
                    </TableCell>
                    <TableCell
                      className={getDailyCellClassName()}
                      title={row.dailyTooltipText}
                      onClick={() => handleDailyCellClick(row)}
                    >
                      {row.dayType ? (
                        <DayTypeBadge
                          dayType={row.dayType}
                          freeReason={row.freeReason}
                          showFreeReason={false}
                          className="rounded-full border border-primary-tint/70 bg-primary-tint/15 px-2.5 py-1 text-xs text-text-color"
                          iconClassName="text-primary"
                          labelClassName="font-medium"
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell
                      className={getDailyCellClassName(
                        'max-w-[420px] whitespace-normal',
                      )}
                      title={row.dailyTooltipText}
                      onClick={() => handleDailyCellClick(row)}
                    >
                      {row.summary}
                    </TableCell>
                    <TableCell
                      className={getDailyCellClassName()}
                      title={row.dailyTooltipText}
                      onClick={() => handleDailyCellClick(row)}
                    >
                      {row.conflict ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-2 text-amber-700">
                              <FiAlertTriangle className="size-4" />
                              {t('reportConflicts.badge')}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={8}>
                            <p>
                              {t('reportConflicts.storedState', {
                                value: formatConflictDayTypeLabel(t, {
                                  dayType: row.conflict.storedDayType,
                                  freeReason: row.conflict.storedFreeReason,
                                }),
                              })}
                            </p>
                            <p>
                              {t('reportConflicts.expectedState', {
                                value: formatConflictDayTypeLabel(t, {
                                  dayType: row.conflict.expectedDayType,
                                  freeReason: row.conflict.expectedFreeReason,
                                }),
                              })}
                            </p>
                            <p>
                              {t('reportConflicts.reason', {
                                value: formatConflictReasonLabel(
                                  t,
                                  row.conflict.reason,
                                ),
                              })}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    {row.isWeekFirstRow ? (
                      <>
                        <TableCell
                          rowSpan={row.weekRowSpan}
                          className={getWeeklyCellClassName(row)}
                          title={weeklyCellTitle}
                          role={weeklyCellRole}
                          tabIndex={weeklyCellTabIndex}
                          aria-label={weeklyCellTitle || undefined}
                          onClick={() => handleWeeklyCellClick(row)}
                          onKeyDown={(event) =>
                            handleWeeklyCellKeyDown(event, row)
                          }
                        >
                          <div className="flex w-full justify-center">
                            {row.submitted ? (
                              <FiCheckCircle className="size-5 text-emerald-600" />
                            ) : (
                              <FiXCircle className="size-5 text-rose-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell
                          rowSpan={row.weekRowSpan}
                          className={getWeeklyCellClassName(row)}
                          title={weeklyCellTitle}
                          role={weeklyCellRole}
                          tabIndex={weeklyCellTabIndex}
                          aria-label={weeklyCellTitle || undefined}
                          onClick={() => handleWeeklyCellClick(row)}
                          onKeyDown={(event) =>
                            handleWeeklyCellKeyDown(event, row)
                          }
                        >
                          <span>{row.submittedToEmail}</span>
                        </TableCell>
                        <TableCell
                          rowSpan={row.weekRowSpan}
                          className={getWeeklyCellClassName(row)}
                          title={weeklyCellTitle}
                          role={weeklyCellRole}
                          tabIndex={weeklyCellTabIndex}
                          aria-label={weeklyCellTitle || undefined}
                          onClick={() => handleWeeklyCellClick(row)}
                          onKeyDown={(event) =>
                            handleWeeklyCellKeyDown(event, row)
                          }
                        >
                          <span>{row.area}</span>
                        </TableCell>
                        <TableCell
                          rowSpan={row.weekRowSpan}
                          className={getWeeklyCellClassName(
                            row,
                            'w-px whitespace-nowrap text-center font-medium',
                          )}
                          title={weeklyCellTitle}
                          role={weeklyCellRole}
                          tabIndex={weeklyCellTabIndex}
                          aria-label={weeklyCellTitle || undefined}
                          onClick={() => handleWeeklyCellClick(row)}
                          onKeyDown={(event) =>
                            handleWeeklyCellKeyDown(event, row)
                          }
                        >
                          {row.calendarWeekText}
                        </TableCell>
                      </>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
