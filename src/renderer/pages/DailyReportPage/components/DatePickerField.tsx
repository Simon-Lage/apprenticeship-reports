import { useMemo } from 'react';
import { de } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { FiCalendar } from 'react-icons/fi';

import { FormField } from '@/renderer/components/app/FormField';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  buildDailyReportCalendarStatusMap,
  isDateWithinDailyReportCalendarRange,
  resolveDailyReportCalendarRange,
  DailyReportCalendarRange,
} from '@/renderer/pages/DailyReportPage/utils/calendar-status';
import { ReportsState } from '@/shared/reports/models';
import { formatGermanDate } from '@/renderer/lib/date-format';

function toCalendarDate(dateValue: string): Date | undefined {
  const [year, month, day] = dateValue.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toCalendarIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface DatePickerFieldProps {
  date: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  calendarMonth: Date | undefined;
  onCalendarMonthChange: (month: Date | undefined) => void;
  onSelectDate: (dateValue: string) => void;
  reportsState: ReportsState | null;
  reportStartDate: string | null;
  trainingEnd: string | null;
}

export default function DatePickerField({
  date,
  isOpen,
  onOpenChange,
  calendarMonth,
  onCalendarMonthChange,
  onSelectDate,
  reportsState,
  reportStartDate,
  trainingEnd,
}: DatePickerFieldProps) {
  const { t } = useTranslation();

  const calendarStatusMap = useMemo(
    () => buildDailyReportCalendarStatusMap(reportsState),
    [reportsState],
  );

  const calendarRange: DailyReportCalendarRange = useMemo(
    () =>
      resolveDailyReportCalendarRange({
        reportStartDate,
        trainingEnd,
      }),
    [reportStartDate, trainingEnd],
  );

  const selectedCalendarDate = useMemo(() => toCalendarDate(date), [date]);

  return (
    <FormField id="report-date" label={t('dailyReport.meta.date')}>
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="group h-10 w-full justify-between border-primary-tint text-left font-normal transition-colors enabled:cursor-pointer hover:bg-primary hover:text-primary-contrast"
          >
            <span>{date ? formatGermanDate(date) : '-'}</span>
            <FiCalendar className="size-4 text-text-color/70 transition-colors group-hover:text-primary-contrast" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto border-primary-tint p-2"
        >
          <div className="space-y-3">
            <Calendar
              locale={de}
              mode="single"
              selected={selectedCalendarDate}
              month={calendarMonth}
              onMonthChange={onCalendarMonthChange}
              onSelect={(selectedDate) => {
                if (!selectedDate) return;
                onSelectDate(toCalendarIsoDate(selectedDate));
              }}
              modifiers={{
                submitted: (calendarDate) =>
                  calendarStatusMap.get(toCalendarIsoDate(calendarDate)) ===
                  'submitted',
                draft: (calendarDate) =>
                  calendarStatusMap.get(toCalendarIsoDate(calendarDate)) ===
                  'draft',
                missing: (calendarDate) =>
                  isDateWithinDailyReportCalendarRange(
                    toCalendarIsoDate(calendarDate),
                    calendarRange,
                  ) && !calendarStatusMap.has(toCalendarIsoDate(calendarDate)),
              }}
              modifiersClassNames={{
                submitted:
                  'border border-emerald-500/25 bg-emerald-500/10 text-emerald-900 shadow-sm',
                draft:
                  'border border-sky-500/25 bg-sky-500/10 text-sky-900 shadow-sm',
                missing:
                  'border border-transparent bg-primary-tint/20 text-text-color/85',
              }}
              className="mx-auto"
            />
            <div className="grid gap-2 px-3 pb-2">
              <div className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-sm text-emerald-900">
                {t('dailyReport.calendar.legendSubmitted')}
              </div>
              <div className="inline-flex items-center rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-sm text-sky-900">
                {t('dailyReport.calendar.legendDraft')}
              </div>
              <div className="inline-flex items-center rounded-full border border-primary-tint/70 bg-primary-tint/20 px-2.5 py-1 text-sm text-text-color">
                {t('dailyReport.calendar.legendEmpty')}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </FormField>
  );
}
