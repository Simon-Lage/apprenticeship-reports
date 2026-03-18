import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
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
import { Switch } from '@/components/ui/switch';
import {
  mergeAbsenceSettings,
  parseAbsenceSettings,
  resolveOnboardingSubdivisionCode,
} from '@/shared/absence/settings';

export default function AbsenceSyncPrompt() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const { value: settingsSnapshot, refresh: refreshSettings } = useSettingsSnapshot();
  const [isPending, setIsPending] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Initialize autoSyncEnabled from settings when available
  useEffect(() => {
    if (settingsSnapshot?.values) {
      const absenceSettings = parseAbsenceSettings(settingsSnapshot.values);
      setAutoSyncEnabled(absenceSettings.autoSyncHolidays);
    }
  }, [settingsSnapshot?.values]);

  if (!runtime.isBridgeAvailable || !runtime.state.absence.syncPending || !settingsSnapshot) {
    return null;
  }

  const subdivisionCode = resolveOnboardingSubdivisionCode(
    settingsSnapshot.values,
  );

  const handleSync = async () => {
    if (!runtime.api) return;
    setIsPending(true);
    try {
      // First update autoSync setting if it changed
      const absenceSettings = parseAbsenceSettings(settingsSnapshot.values);
      if (absenceSettings.autoSyncHolidays !== autoSyncEnabled) {
        const nextValues = mergeAbsenceSettings(settingsSnapshot.values, {
          ...absenceSettings,
          autoSyncHolidays: autoSyncEnabled,
        });
        await runtime.api.setSettingsValues(nextValues);
      }

      await runtime.api.syncAbsenceCatalog();
      await runtime.refresh();
      await refreshSettings();
      toast.success(t('absences.feedback.syncSuccess'));
    } catch (error) {
      toast.error(
        t('absences.feedback.syncError'),
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setIsPending(false);
    }
  };

  const handleDismiss = async () => {
    if (!runtime.api) return;
    try {
      // Update autoSync setting if user chose to disable it
      const absenceSettings = parseAbsenceSettings(settingsSnapshot.values);
      if (absenceSettings.autoSyncHolidays !== autoSyncEnabled) {
        const nextValues = mergeAbsenceSettings(settingsSnapshot.values, {
          ...absenceSettings,
          autoSyncHolidays: autoSyncEnabled,
        });
        await runtime.api.setSettingsValues(nextValues);
      }

      await runtime.api.dismissAbsenceSync();
      await runtime.refresh();
      await refreshSettings();
    } catch (error) {
      console.error('Failed to dismiss absence sync:', error);
    }
  };

  return (
    <AlertDialog open>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('absences.sync.title')}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{t('absences.sync.description')}</p>
            <div className="rounded-md border border-primary-tint/30 bg-primary-tint/10 p-3 text-sm text-text-color/90">
              <p>
                <strong>{t('absences.sync.stateLabel')}:</strong>{' '}
                {subdivisionCode ?? '-'}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center space-x-2 py-4">
          <Switch
            id="auto-sync-prompt"
            checked={autoSyncEnabled}
            onCheckedChange={setAutoSyncEnabled}
          />
          <label htmlFor="auto-sync-prompt" className="text-sm font-normal">
            {t('absences.sync.autoSyncLabel')}
          </label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss} disabled={isPending}>
            {t('common.later')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSync}
            disabled={isPending}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
          >
            {isPending ? t('common.loading') : t('absences.sync.trigger')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
