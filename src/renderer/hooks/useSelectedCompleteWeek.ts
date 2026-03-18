import { useEffect, useMemo, useState } from 'react';

import { listCompleteWeeksWithDailyReports } from '@/renderer/lib/report-values';
import { ReportsState, createWeekIdentity } from '@/shared/reports/models';

export function useSelectedCompleteWeek(
  reportsState: ReportsState | null,
  locationSearch: string,
) {
  const completeWeeks = useMemo(
    () => (reportsState ? listCompleteWeeksWithDailyReports(reportsState) : []),
    [reportsState],
  );
  const requestedWeekIdentity = useMemo(() => {
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

    return createWeekIdentity(weekStart, weekEnd);
  }, [locationSearch]);
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
    const nextIdentity = completeWeeks.some(
      (week) =>
        createWeekIdentity(
          week.weeklyReport.weekStart,
          week.weeklyReport.weekEnd,
        ) === requestedWeekIdentity,
    )
      ? requestedWeekIdentity
      : fallbackIdentity;

    setSelectedWeekIdentity((current) => (current === nextIdentity ? current : nextIdentity));
  }, [completeWeeks, requestedWeekIdentity]);

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
    selectedWeek,
    selectedWeekIdentity,
    setSelectedWeekIdentity,
  };
}
