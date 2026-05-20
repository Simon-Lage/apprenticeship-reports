import type { ChangeEvent } from 'react';

import { FormField } from '@/renderer/components/app/FormField';
import { formatGermanDate } from '@/renderer/lib/date-format';
import type { CompleteWeekWithReports } from '@/renderer/lib/report-values';

type WeeklyReportWeekSelectorProps = {
  id: string;
  label: string;
  placeholder: string;
  completeWeeks: CompleteWeekWithReports[];
  selectedWeekIdentity: string;
  onSelectedWeekIdentityChange: (value: string) => void;
};

export default function WeeklyReportWeekSelector({
  id,
  label,
  placeholder,
  completeWeeks,
  selectedWeekIdentity,
  onSelectedWeekIdentityChange,
}: WeeklyReportWeekSelectorProps) {
  function handleSelectionChange(event: ChangeEvent<HTMLSelectElement>) {
    onSelectedWeekIdentityChange(event.target.value);
  }

  return (
    <FormField id={id} label={label}>
      <select
        id={id}
        className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
        value={selectedWeekIdentity}
        onChange={handleSelectionChange}
        disabled={!completeWeeks.length}
      >
        <option value="">{placeholder}</option>
        {completeWeeks.map((week) => {
          const identity = `${week.weeklyReport.weekStart}:${week.weeklyReport.weekEnd}`;
          const optionLabel = `${formatGermanDate(week.weeklyReport.weekStart)} - ${formatGermanDate(week.weeklyReport.weekEnd)}`;

          return (
            <option key={identity} value={identity}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </FormField>
  );
}
