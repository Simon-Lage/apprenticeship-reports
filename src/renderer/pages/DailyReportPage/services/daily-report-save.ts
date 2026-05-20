import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import {
  mergeUiCatalogWithLessonValues,
  mergeUiSettings,
  UiSettingsValues,
} from '@/renderer/lib/app-settings';
import { appRoutes } from '@/renderer/lib/app-routes';
import { DailyReportFormState } from '../utils/form-model';
import {
  buildDailyReportPayload,
  validateDailyReportPayload,
} from './daily-report-payload';
import applyPendingDrafts from '../utils/apply-pending-drafts';

export type SaveDailyReportResult =
  | {
      saved: true;
      form: DailyReportFormState;
      lessonTopicDrafts: Record<number, string>;
    }
  | { saved: false };

export function useDailyReportSave() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();

  const saveDailyReport = useCallback(
    async (
      form: DailyReportFormState,
      lessonTopicDrafts: Record<number, string>,
      selectedWeekRange: { weekStart: string; weekEnd: string },
      currentDailyValues: { freeDayCategory?: 'school' | 'work' | null },
      uiSettings: UiSettingsValues,
    ): Promise<SaveDailyReportResult> => {
      if (!runtime.api) return { saved: false };
      if (!form.date || !selectedWeekRange) {
        toast.error(t('dailyReport.feedback.missingDates'));
        return { saved: false };
      }

      const { form: formWithDrafts, lessonTopicDrafts: nextDrafts } =
        applyPendingDrafts({
          sourceForm: form,
          sourceLessonTopicDrafts: lessonTopicDrafts,
        });

      const values = buildDailyReportPayload(
        formWithDrafts,
        currentDailyValues,
        uiSettings,
      );
      const normalizedForm = {
        ...formWithDrafts,
        activities: values.activities,
        trainings: values.trainings,
        schoolTopics: values.schoolTopics,
        lessons: values.lessons,
      };
      const validationErrorKey = validateDailyReportPayload(values, {
        expandedDoubleLessonPairs: formWithDrafts.expandedDoubleLessonPairs,
      });
      if (validationErrorKey) {
        toast.error(t(validationErrorKey));
        return { saved: false };
      }

      try {
        let settingsUpdated = false;
        await runtime.api.upsertDailyReport({
          weekStart: selectedWeekRange.weekStart,
          weekEnd: selectedWeekRange.weekEnd,
          date: form.date,
          values,
        });

        if (values.dayType === 'school' && settingsSnapshot.value) {
          const nextUiSettings = mergeUiCatalogWithLessonValues({
            uiSettings,
            lessons: values.lessons,
          });
          if (nextUiSettings !== uiSettings) {
            await runtime.api.setSettingsValues(
              mergeUiSettings(settingsSnapshot.value.values, nextUiSettings),
            );
            settingsUpdated = true;
          }
        }

        await runtime.refresh();
        await reportsState.refresh();
        if (settingsUpdated) await settingsSnapshot.refresh();
        toast.success(t('dailyReport.feedback.saved'));
        return {
          saved: true,
          form: normalizedForm,
          lessonTopicDrafts: nextDrafts,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('dailyReport.feedback.saveError'), message);
        return { saved: false };
      }
    },
    [runtime, toast, t, reportsState, settingsSnapshot],
  );

  const deleteDailyReport = useCallback(
    async (
      date: string,
      selectedWeekRange: { weekStart: string; weekEnd: string },
      currentDailyReportExists: boolean,
    ) => {
      if (
        !runtime.api ||
        !selectedWeekRange ||
        !date ||
        !currentDailyReportExists
      )
        return false;

      try {
        await runtime.api.deleteDailyReport({
          weekStart: selectedWeekRange.weekStart,
          weekEnd: selectedWeekRange.weekEnd,
          date,
        });
        await runtime.refresh();
        await reportsState.refresh();
        toast.info(t('dailyReport.feedback.deleted'));
        navigate(appRoutes.dailyReport);
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('dailyReport.feedback.saveError'), message);
        return false;
      }
    },
    [runtime, toast, t, reportsState, navigate],
  );

  return { saveDailyReport, deleteDailyReport };
}
