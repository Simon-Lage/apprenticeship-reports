import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { formatGermanDate } from '@/renderer/lib/date-format';
import {
  IhkOselgbSaveResult,
  SaveIhkOselgbWeeklyReportInput,
} from '@/shared/ihk/ihk-oselgb';

function formatWeekRange(input: SaveIhkOselgbWeeklyReportInput): {
  start: string;
  end: string;
} {
  return {
    start: formatGermanDate(input.weekStart),
    end: formatGermanDate(input.weekEnd),
  };
}

export default function useIhkOselgbWeeklyReportSave(): {
  saveWeeklyReportAtIhk: (
    input: SaveIhkOselgbWeeklyReportInput,
  ) => Promise<boolean>;
} {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();

  const saveWeeklyReportAtIhk = useCallback(
    async (input: SaveIhkOselgbWeeklyReportInput): Promise<boolean> => {
      if (!runtime.api) {
        toast.error(t('ihkOselgb.feedback.saveErrorTitle'));
        return false;
      }

      const range = formatWeekRange(input);

      try {
        const result: IhkOselgbSaveResult =
          await runtime.api.saveIhkOselgbWeeklyReport(input);

        if (result.saved) {
          toast.success(
            t('ihkOselgb.feedback.savedTitle'),
            t('ihkOselgb.feedback.savedDescription', range),
          );
          return true;
        }

        toast.info(
          t('ihkOselgb.feedback.skippedTitle'),
          t(`ihkOselgb.feedback.skipped.${result.skippedReason ?? 'unknown'}`),
        );
        return false;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(
          t('ihkOselgb.feedback.saveErrorTitle'),
          t('ihkOselgb.feedback.saveErrorDescription', {
            ...range,
            message,
          }),
        );
        return false;
      }
    },
    [runtime.api, t, toast],
  );

  return { saveWeeklyReportAtIhk };
}
