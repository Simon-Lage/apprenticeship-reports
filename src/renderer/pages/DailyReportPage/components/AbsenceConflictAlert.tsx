import { useTranslation } from 'react-i18next';
import { FiAlertTriangle } from 'react-icons/fi';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DailyReportAbsenceConflict,
  formatConflictDayTypeLabel,
  formatConflictReasonLabel,
} from '@/renderer/lib/report-conflicts';

export interface AbsenceConflictAlertProps {
  conflict: DailyReportAbsenceConflict | null;
}

export default function AbsenceConflictAlert({
  conflict,
}: AbsenceConflictAlertProps) {
  const { t } = useTranslation();

  if (!conflict) return null;

  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-950">
      <FiAlertTriangle className="size-4" />
      <AlertTitle>{t('reportConflicts.dailyTitle')}</AlertTitle>
      <AlertDescription>
        <p>{t('reportConflicts.dailyDescription')}</p>
        <p>
          {t('reportConflicts.storedState', {
            value: formatConflictDayTypeLabel(t, {
              dayType: conflict.storedDayType,
              freeReason: conflict.storedFreeReason,
            }),
          })}
        </p>
        <p>
          {t('reportConflicts.expectedState', {
            value: formatConflictDayTypeLabel(t, {
              dayType: conflict.expectedDayType,
              freeReason: conflict.expectedFreeReason,
            }),
          })}
        </p>
        <p>
          {t('reportConflicts.reason', {
            value: formatConflictReasonLabel(t, conflict.reason),
          })}
        </p>
      </AlertDescription>
    </Alert>
  );
}
