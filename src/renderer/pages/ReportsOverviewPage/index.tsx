import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiXCircle,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

import DayTypeBadge from '@/renderer/components/app/DayTypeBadge';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import useIhkOselgbWeeklyReportSave from '@/renderer/hooks/useIhkOselgbWeeklyReportSave';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import {
  parseOnboardingWorkplace,
  parseUiSettings,
} from '@/renderer/lib/app-settings';
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
  CompleteWeekWithReports,
  DayTypeValue,
  listCompleteWeeksWithDailyReports,
  listWeekDates,
  parseDailyReportValues,
  parseWeeklyReportValues,
} from '@/renderer/lib/report-values';
import { buildIhkOselgbWeeklyReportInput } from '@/renderer/lib/ihk-oselgb-weekly-report';
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  IhkOselgbCredentialStatus,
  isIhkOselgbLink,
} from '@/shared/ihk/ihk-oselgb';
import {
  filterWeekRangesThroughCurrentWeek,
  listReportWeekRanges,
  listCoveredWeekRanges,
} from '@/renderer/pages/ReportsOverviewPage/week-ranges';
import { resolveReportStartDateFromSettings } from '@/shared/settings/report-start-date';

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

const PAGE_SIZE = 14;

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

function groupVisibleWeekRows<T extends { weekKey: string }>(
  rows: T[],
): Array<
  T & {
    isWeekStart: boolean;
    isWeekFirstRow: boolean;
    weekRowSpan: number;
  }
> {
  const weekRowCounts = rows.reduce<Map<string, number>>(
    (result, row) =>
      result.set(row.weekKey, (result.get(row.weekKey) ?? 0) + 1),
    new Map(),
  );
  const seenWeekKeys = new Set<string>();

  return rows.map((row, index) => {
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
}

function listPlainSchoolTopics(
  values: ReturnType<typeof parseDailyReportValues>,
): string[] {
  return Array.from(
    new Set([
      ...values.schoolTopics,
      ...values.lessons.flatMap((lesson) => lesson.topics),
    ]),
  );
}

export default function ReportsOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const { saveWeeklyReportAtIhk } = useIhkOselgbWeeklyReportSave();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [isDayTypeFilterOpen, setIsDayTypeFilterOpen] = useState(false);
  const [dayTypeFilter, setDayTypeFilter] = useState<DayTypeFilterValue>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWeeklyAction, setSelectedWeeklyAction] =
    useState<WeeklyNavigationRow | null>(null);
  const [ihkCredentialStatus, setIhkCredentialStatus] =
    useState<IhkOselgbCredentialStatus | null>(null);
  const [isIhkSavePending, setIsIhkSavePending] = useState(false);

  const absenceSettings = useMemo(
    () => parseAbsenceSettings(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const uiSettings = useMemo(
    () => parseUiSettings(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const workplace = useMemo(
    () =>
      settingsSnapshot.value
        ? parseOnboardingWorkplace(settingsSnapshot.value.values)
        : null,
    [settingsSnapshot.value],
  );
  const ihkOselgbLinkSupported = isIhkOselgbLink(workplace?.ihkLink);
  const ihkOselgbActive = Boolean(
    ihkCredentialStatus?.passwordConfigured && ihkOselgbLinkSupported,
  );
  const completeWeeksByIdentity = useMemo(() => {
    if (!reportsState.value) {
      return new Map<string, CompleteWeekWithReports>();
    }

    return new Map(
      listCompleteWeeksWithDailyReports(reportsState.value).map((week) => [
        `${week.weeklyReport.weekStart}-${week.weeklyReport.weekEnd}`,
        week,
      ]),
    );
  }, [reportsState.value]);
  const reportStartDate = useMemo(
    () =>
      settingsSnapshot.value
        ? resolveReportStartDateFromSettings(settingsSnapshot.value.values)
        : null,
    [settingsSnapshot.value],
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
      ...listReportWeekRanges({
        startDate: reportStartDate,
      }),
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
      .map((range) => {
        if (!reportStartDate || range.weekEnd < reportStartDate) {
          return reportStartDate ? null : range;
        }

        return range.weekStart < reportStartDate
          ? {
              weekStart: reportStartDate,
              weekEnd: range.weekEnd,
            }
          : range;
      })
      .filter((range): range is { weekStart: string; weekEnd: string } =>
        Boolean(range),
      )
      .filter(
        (range, index, ranges) =>
          ranges.findIndex(
            (candidate) =>
              candidate.weekStart === range.weekStart &&
              candidate.weekEnd === range.weekEnd,
          ) === index,
      )
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
          } else if (parsed.dayType === 'school') {
            summary = listPlainSchoolTopics(parsed).join(', ') || '-';
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
  }, [absenceSettings, reportStartDate, reportsState.value, t, uiSettings]);

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
    return groupVisibleWeekRows(nextRows);
  }, [dayTypeFilter, rows, normalizedSearch]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const paginatedRows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;

    return groupVisibleWeekRows(
      filteredRows.slice(startIndex, startIndex + PAGE_SIZE),
    );
  }, [filteredRows, safeCurrentPage]);
  const pageStart = filteredRows.length
    ? (safeCurrentPage - 1) * PAGE_SIZE + 1
    : 0;
  const pageEnd = Math.min(safeCurrentPage * PAGE_SIZE, filteredRows.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [dayTypeFilter, normalizedSearch]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  useEffect(() => {
    let cancelled = false;

    if (!runtime.api) {
      setIhkCredentialStatus(null);
      return undefined;
    }

    runtime.api
      .getIhkOselgbCredentialStatus()
      .then((status) => {
        if (!cancelled) {
          setIhkCredentialStatus(status);
        }
        return undefined;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [runtime.api]);

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
    weeklyTooltipText: string;
  }) => {
    if (!row.canOpenWeeklyReport) {
      return;
    }

    if (!ihkOselgbLinkSupported) {
      navigate(
        `${appRoutes.weeklyReport}?weekStart=${encodeURIComponent(row.weekStart)}&weekEnd=${encodeURIComponent(row.weekEnd)}`,
      );
      return;
    }

    setSelectedWeeklyAction(row);
  };
  const openSelectedWeeklyReport = () => {
    if (!selectedWeeklyAction) {
      return;
    }

    navigate(
      `${appRoutes.weeklyReport}?weekStart=${encodeURIComponent(selectedWeeklyAction.weekStart)}&weekEnd=${encodeURIComponent(selectedWeeklyAction.weekEnd)}`,
    );
    setSelectedWeeklyAction(null);
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
  const selectedCompleteWeek = selectedWeeklyAction
    ? (completeWeeksByIdentity.get(
        `${selectedWeeklyAction.weekStart}-${selectedWeeklyAction.weekEnd}`,
      ) ?? null)
    : null;
  const selectedWeeklyRangeLabel = selectedWeeklyAction
    ? `${formatGermanDate(selectedWeeklyAction.weekStart)} - ${formatGermanDate(selectedWeeklyAction.weekEnd)}`
    : '';
  let ihkSaveDisabledReason: string | undefined;

  if (isIhkSavePending) {
    ihkSaveDisabledReason = t('common.disabledReasons.pending');
  } else if (!runtime.api) {
    ihkSaveDisabledReason = t('common.disabledReasons.runtimeUnavailable');
  } else if (!settingsSnapshot.value) {
    ihkSaveDisabledReason = t('common.disabledReasons.loading');
  } else if (!ihkOselgbActive) {
    ihkSaveDisabledReason = t('reportsOverview.weeklyAction.ihkInactiveReason');
  } else if (!selectedCompleteWeek) {
    ihkSaveDisabledReason = t('common.disabledReasons.incompleteWeekSend');
  }

  const handleSaveSelectedWeeklyReportAtIhk = async () => {
    if (!selectedCompleteWeek || !settingsSnapshot.value) {
      return;
    }

    setIsIhkSavePending(true);
    try {
      const saved = await saveWeeklyReportAtIhk(
        buildIhkOselgbWeeklyReportInput({
          week: selectedCompleteWeek,
          settingsValues: settingsSnapshot.value.values,
          t,
        }),
      );
      if (saved) {
        setSelectedWeeklyAction(null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(
        t('ihkOselgb.feedback.saveErrorTitle'),
        t('ihkOselgb.feedback.saveErrorDescription', {
          start: formatGermanDate(selectedCompleteWeek.weeklyReport.weekStart),
          end: formatGermanDate(selectedCompleteWeek.weeklyReport.weekEnd),
          message,
        }),
      );
    } finally {
      setIsIhkSavePending(false);
    }
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
              {paginatedRows.length ? (
                paginatedRows.map((row) => {
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
                        <span className="line-clamp-3">{row.summary}</span>
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
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-text-color/70"
                  >
                    {t('reportsOverview.table.noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col gap-3 border-t border-primary-tint/60 pt-4 text-sm text-text-color/70 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t('reportsOverview.pagination.summary', {
              start: pageStart,
              end: pageEnd,
              total: filteredRows.length,
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <FiChevronLeft className="size-4" />
              {t('reportsOverview.pagination.previous')}
            </Button>
            <span className="min-w-24 text-center">
              {t('reportsOverview.pagination.page', {
                page: safeCurrentPage,
                total: pageCount,
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= pageCount}
              onClick={() =>
                setCurrentPage((page) => Math.min(pageCount, page + 1))
              }
            >
              {t('reportsOverview.pagination.next')}
              <FiChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </SectionCard>
      <Dialog
        open={Boolean(selectedWeeklyAction)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedWeeklyAction(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reportsOverview.weeklyAction.title')}</DialogTitle>
            <DialogDescription>
              {t('reportsOverview.weeklyAction.description', {
                range: selectedWeeklyRangeLabel,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col items-stretch sm:flex-row sm:items-center">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t('reportsOverview.weeklyAction.cancel')}
              </Button>
            </DialogClose>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="border-primary-tint"
                onClick={openSelectedWeeklyReport}
              >
                {t('reportsOverview.weeklyAction.open')}
              </Button>
              <Button
                type="button"
                disabled={Boolean(ihkSaveDisabledReason)}
                disabledReason={ihkSaveDisabledReason}
                onClick={() => {
                  handleSaveSelectedWeeklyReportAtIhk().catch(() => undefined);
                }}
              >
                {isIhkSavePending
                  ? t('common.loading')
                  : t('reportsOverview.weeklyAction.saveAtIhk')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
