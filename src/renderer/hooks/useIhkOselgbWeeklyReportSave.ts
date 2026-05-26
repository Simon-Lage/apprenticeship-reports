import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { formatGermanDate } from '@/renderer/lib/date-format';
import {
  IhkOselgbSaveResult,
  SaveIhkOselgbWeeklyReportInput,
} from '@/shared/ihk/ihk-oselgb';

export type IhkOselgbWeeklyReportSaveOutcome =
  | { status: 'saved' }
  | {
      status: 'skipped';
      skippedReason: IhkOselgbSaveResult['skippedReason'];
    }
  | { status: 'failed'; message: string };

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
  ) => Promise<IhkOselgbWeeklyReportSaveOutcome>;
} {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();

  const saveWeeklyReportAtIhk = useCallback(
    async (
      input: SaveIhkOselgbWeeklyReportInput,
    ): Promise<IhkOselgbWeeklyReportSaveOutcome> => {
      if (!runtime.api) {
        return {
          status: 'failed',
          message: t('common.disabledReasons.runtimeUnavailable'),
        };
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
          return { status: 'saved' };
        }

        toast.info(
          t('ihkOselgb.feedback.skippedTitle'),
          t(`ihkOselgb.feedback.skipped.${result.skippedReason ?? 'unknown'}`),
        );
        return {
          status: 'skipped',
          skippedReason: result.skippedReason,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        return { status: 'failed', message };
      }
    },
    [runtime.api, t, toast],
  );

  return { saveWeeklyReportAtIhk };
}
