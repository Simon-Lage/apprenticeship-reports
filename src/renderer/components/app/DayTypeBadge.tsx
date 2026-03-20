import { useTranslation } from 'react-i18next';

import { getDailyReportDayTypePresentation } from '@/renderer/lib/daily-report-labels';
import { DayTypeValue } from '@/renderer/lib/report-values';
import { cn } from '@/renderer/lib/utils';

type DayTypeBadgeProps = {
  dayType: DayTypeValue;
  freeReason?: string;
  showFreeReason?: boolean;
  iconClassName?: string;
  labelClassName?: string;
  className?: string;
};

export default function DayTypeBadge({
  dayType,
  freeReason,
  showFreeReason,
  className,
  iconClassName,
  labelClassName,
}: DayTypeBadgeProps) {
  const { t } = useTranslation();
  const iconPresentation = getDailyReportDayTypePresentation(t, {
    dayType,
    freeReason,
  });
  const labelPresentation = getDailyReportDayTypePresentation(t, {
    dayType,
    freeReason: showFreeReason ? freeReason : '',
  });
  const Icon = iconPresentation.icon;

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Icon className={cn('size-4 shrink-0', iconClassName)} />
      <span className={cn('truncate', labelClassName)}>
        {labelPresentation.label}
      </span>
    </span>
  );
}

DayTypeBadge.defaultProps = {
  freeReason: '',
  showFreeReason: true,
  iconClassName: undefined,
  labelClassName: undefined,
  className: undefined,
};
