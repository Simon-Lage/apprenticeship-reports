import { useTranslation } from 'react-i18next';

import DayTypeBadge from '@/renderer/components/app/DayTypeBadge';
import { FormField } from '@/renderer/components/app/FormField';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DayTypeValue, dayTypeValues } from '@/renderer/lib/report-values';

export interface DayTypeSelectorProps {
  dayType: DayTypeValue;
  freeReason: string;
  isContentReadOnly: boolean;
  isPending: boolean;
  isDeletePending: boolean;
  contentDisabledReason: string | null;
  onChange: (dayType: DayTypeValue) => void;
}

export default function DayTypeSelector({
  dayType,
  freeReason,
  isContentReadOnly,
  isPending,
  isDeletePending,
  contentDisabledReason,
  onChange,
}: DayTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <FormField id="day-type" label={t('dailyReport.meta.dayType')}>
      <div
        id="day-type"
        role="radiogroup"
        aria-label={t('dailyReport.meta.dayType')}
        className="flex flex-wrap justify-end gap-2"
      >
        {dayTypeValues.map((value) => {
          const isSelected = dayType === value;
          const dayTypeButton = (
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isContentReadOnly || isPending || isDeletePending}
              className={`flex min-h-11 items-center justify-start rounded-xl border px-3 py-2 text-left text-sm transition-colors enabled:cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary text-primary-contrast'
                  : 'border-primary-tint/70 bg-white text-text-color hover:bg-primary-tint/10'
              } disabled:cursor-not-allowed disabled:opacity-60`}
              onClick={() => onChange(value)}
            >
              <DayTypeBadge
                dayType={value}
                freeReason={value === 'free' && isSelected ? freeReason : ''}
                iconClassName={
                  isSelected ? 'text-primary-contrast' : 'text-primary'
                }
                labelClassName="font-medium"
              />
            </button>
          );

          return (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <span className="inline-flex">{dayTypeButton}</span>
              </TooltipTrigger>
              {contentDisabledReason ? (
                <TooltipContent side="top" sideOffset={8}>
                  {contentDisabledReason}
                </TooltipContent>
              ) : null}
            </Tooltip>
          );
        })}
      </div>
    </FormField>
  );
}
