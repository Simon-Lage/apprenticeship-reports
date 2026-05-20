import { useEffect, useMemo, useState } from 'react';

import { listCompleteWeeksWithDailyReports } from '@/renderer/lib/report-values';
import { ReportsState, createWeekIdentity } from '@/shared/reports/models';

export function useSelectedCompleteWeek(
  reportsState: ReportsState | null,
  locationSearch: string,
  options: { maxWeekEnd?: string } = {},
) {
  const completeWeeks = useMemo(
    () =>
      (reportsState
        ? listCompleteWeeksWithDailyReports(reportsState)
        : []
      ).filter(
        (week) =>
          !options.maxWeekEnd ||
          week.weeklyReport.weekEnd <= options.maxWeekEnd,
      ),
    [options.maxWeekEnd, reportsState],
  );
  const requestedWeekRange = useMemo(() => {
    const search = new URLSearchParams(locationSearch);
    const weekStart = search.get('weekStart');
    const weekEnd = search.get('weekEnd');

    if (
      !weekStart ||
      !weekEnd ||
      !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(weekEnd)
    ) {
      return null;
    }

    return {
      weekStart,
      weekEnd,
    };
  }, [locationSearch]);
  const requestedWeekIdentity = useMemo(
    () =>
      requestedWeekRange
        ? createWeekIdentity(
            requestedWeekRange.weekStart,
            requestedWeekRange.weekEnd,
          )
        : null,
    [requestedWeekRange],
  );
  const requestedWeekIsComplete = useMemo(
    () =>
      !requestedWeekIdentity ||
      completeWeeks.some(
        (week) =>
          createWeekIdentity(
            week.weeklyReport.weekStart,
            week.weeklyReport.weekEnd,
          ) === requestedWeekIdentity,
      ),
    [completeWeeks, requestedWeekIdentity],
  );
  const [selectedWeekIdentity, setSelectedWeekIdentity] = useState('');

  useEffect(() => {
    if (!completeWeeks.length) {
      setSelectedWeekIdentity('');
      return;
    }

    const fallbackIdentity = createWeekIdentity(
      completeWeeks[completeWeeks.length - 1].weeklyReport.weekStart,
      completeWeeks[completeWeeks.length - 1].weeklyReport.weekEnd,
    );
    const nextIdentity =
      requestedWeekIdentity && requestedWeekIsComplete
        ? requestedWeekIdentity
        : fallbackIdentity;

    setSelectedWeekIdentity((current) =>
      current === nextIdentity ? current : nextIdentity,
    );
  }, [completeWeeks, requestedWeekIdentity, requestedWeekIsComplete]);

  const selectedWeek = useMemo(
    () =>
      completeWeeks.find(
        (week) =>
          createWeekIdentity(
            week.weeklyReport.weekStart,
            week.weeklyReport.weekEnd,
          ) === selectedWeekIdentity,
      ) ?? null,
    [completeWeeks, selectedWeekIdentity],
  );

  return {
    completeWeeks,
    requestedWeekRange,
    requestedWeekIsComplete,
    selectedWeek,
    selectedWeekIdentity,
    setSelectedWeekIdentity,
  };
}
