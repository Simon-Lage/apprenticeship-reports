import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useReportsState } from '@/renderer/hooks/useKernelData';
import { appRoutes } from '@/renderer/lib/app-routes';
import { formatGermanDate } from '@/renderer/lib/date-format';
import { reportsStateChangedEventName } from '@/renderer/lib/report-state-events';
import {
  findDueTimetableUpdateReminderYear,
  markTimetableReminderYearHandled,
  postponeTimetableReminderYearForSession,
  readHandledTimetableReminderYears,
  readPostponedTimetableReminderYears,
  resolveLastCompleteJulyWeekEnd,
} from '@/renderer/lib/timetable-update-reminder';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function readIgnoredTimetableReminderYears(): number[] {
  return [
    ...readHandledTimetableReminderYears(),
    ...readPostponedTimetableReminderYears(),
  ];
}

export default function TimeTableUpdatePrompt() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const runtime = useAppRuntime();
  const reportsState = useReportsState();
  const { value: reportsValue, refresh: refreshReportsState } = reportsState;
  const [ignoredYears, setIgnoredYears] = useState(
    readIgnoredTimetableReminderYears,
  );
  const dueYear = useMemo(() => {
    if (!reportsValue) {
      return null;
    }

    return findDueTimetableUpdateReminderYear(reportsValue, ignoredYears);
  }, [ignoredYears, reportsValue]);
  const weekEnd = dueYear ? resolveLastCompleteJulyWeekEnd(dueYear) : null;
  const open = Boolean(dueYear) && !runtime.state.absence.syncPending;

  useEffect(() => {
    const refreshReports = () => {
      refreshReportsState().catch(() => undefined);
    };

    window.addEventListener(reportsStateChangedEventName, refreshReports);

    return () => {
      window.removeEventListener(reportsStateChangedEventName, refreshReports);
    };
  }, [refreshReportsState]);

  const refreshStorage = useCallback(() => {
    setIgnoredYears(readIgnoredTimetableReminderYears());
  }, []);

  const postpone = useCallback(() => {
    if (!dueYear) {
      return;
    }

    postponeTimetableReminderYearForSession(dueYear);
    refreshStorage();
  }, [dueYear, refreshStorage]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        postpone();
      }
    },
    [postpone],
  );

  const handleDismiss = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (!dueYear) {
        return;
      }

      markTimetableReminderYearHandled(dueYear);
      refreshStorage();
    },
    [dueYear, refreshStorage],
  );

  const handlePostpone = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      postpone();
    },
    [postpone],
  );

  const handleOpenTimeTable = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (!dueYear) {
        return;
      }

      markTimetableReminderYearHandled(dueYear);
      refreshStorage();
      navigate(appRoutes.timeTable);
    },
    [dueYear, navigate, refreshStorage],
  );

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('timeTable.updateReminder.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('timeTable.updateReminder.description', {
              date: formatGermanDate(weekEnd),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <AlertDialogCancel onClick={handleDismiss}>
            {t('timeTable.updateReminder.dismiss')}
          </AlertDialogCancel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <AlertDialogCancel onClick={handlePostpone}>
              {t('timeTable.updateReminder.later')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={handleOpenTimeTable}
            >
              {t('timeTable.updateReminder.open')}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
