import { ReactNode } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/renderer/lib/utils';

type ReportStickyHeaderProps = {
  title: ReactNode;
  children?: ReactNode;
  className?: string;
};

type SubmittedReportBadgeProps = {
  label: string;
  tooltip: string;
};

export function SubmittedReportBadge({
  label,
  tooltip,
}: SubmittedReportBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-950"
        >
          <FiAlertTriangle />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export default function ReportStickyHeader({
  title,
  children,
  className,
}: ReportStickyHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-30 rounded-xl border border-primary-tint bg-white/95 px-5 py-4 shadow-sm backdrop-blur',
        className,
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 text-base font-semibold text-text-color md:text-lg">
          {title}
        </div>
        {children ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

ReportStickyHeader.defaultProps = {
  children: undefined,
  className: undefined,
};
