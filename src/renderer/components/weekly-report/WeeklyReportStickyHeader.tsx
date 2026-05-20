import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import DateNavigationTitle from '@/renderer/components/app/DateNavigationTitle';
import ReportStickyHeader, {
  SubmittedReportBadge,
} from '@/renderer/components/app/ReportStickyHeader';
import { formatGermanDate } from '@/renderer/lib/date-format';
import {
  addIsoDays,
  normalizeIsoDate,
  resolveWeekRangeForDate,
  toLocalIsoDate,
  WeekRange,
} from '@/renderer/lib/iso-date';

type WeeklyReportStickyHeaderProps = {
  weekStart: string;
  weekEnd: string;
  reportStartDate: string | null;
  trainingEnd: string | null;
  isSubmitted: boolean;
  onNavigateWeek: (weekRange: WeekRange) => void;
  children?: ReactNode;
};

export default function WeeklyReportStickyHeader({
  weekStart,
  weekEnd,
  reportStartDate,
  trainingEnd,
  isSubmitted,
  onNavigateWeek,
  children,
}: WeeklyReportStickyHeaderProps) {
  const { t } = useTranslation();
  const today = toLocalIsoDate(new Date());
  const reportStartLimit = normalizeIsoDate(reportStartDate) ?? today;
  const trainingEndLimit = normalizeIsoDate(trainingEnd);
  const weeklyUpperLimit =
    trainingEndLimit && trainingEndLimit < today ? trainingEndLimit : today;
  const firstWeekRange = resolveWeekRangeForDate(reportStartLimit);
  const lastWeekRange = resolveWeekRangeForDate(weeklyUpperLimit);
  const previousWeekCandidate = weekStart
    ? resolveWeekRangeForDate(addIsoDays(weekStart, -1) ?? '')
    : null;
  const nextWeekCandidate = weekEnd
    ? resolveWeekRangeForDate(addIsoDays(weekEnd, 1) ?? '')
    : null;
  const previousWeekRange =
    previousWeekCandidate &&
    firstWeekRange &&
    previousWeekCandidate.weekStart >= firstWeekRange.weekStart
      ? previousWeekCandidate
      : null;
  const nextWeekRange =
    nextWeekCandidate &&
    lastWeekRange &&
    nextWeekCandidate.weekStart <= lastWeekRange.weekStart
      ? nextWeekCandidate
      : null;
  const weeklyTitle =
    weekStart && weekEnd
      ? t('weeklyReport.sections.metadata.titleWithRange', {
          start: formatGermanDate(weekStart),
          end: formatGermanDate(weekEnd),
        })
      : t('weeklyReport.sections.metadata.title');

  return (
    <ReportStickyHeader
      title={
        <DateNavigationTitle
          title={weeklyTitle}
          previousLabel={t('common.aria.previousWeek')}
          nextLabel={t('common.aria.nextWeek')}
          previousDisabled={!previousWeekRange}
          nextDisabled={!nextWeekRange}
          onPrevious={() => {
            if (previousWeekRange) {
              onNavigateWeek(previousWeekRange);
            }
          }}
          onNext={() => {
            if (nextWeekRange) {
              onNavigateWeek(nextWeekRange);
            }
          }}
        />
      }
    >
      {isSubmitted ? (
        <SubmittedReportBadge
          label={t('common.submittedReport.label')}
          tooltip={t('common.submittedReport.tooltip')}
        />
      ) : null}
      {children}
    </ReportStickyHeader>
  );
}

WeeklyReportStickyHeader.defaultProps = {
  children: undefined,
};
