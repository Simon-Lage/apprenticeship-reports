import { MouseEvent, useEffect, useState } from 'react';
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

type AbsenceSyncDialogMode = 'automatic' | 'manual';

type AbsenceSyncDialogProps = {
  mode: AbsenceSyncDialogMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AbsenceSyncDialog({
  mode,
  open,
  onOpenChange,
}: AbsenceSyncDialogProps) {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const settingsSnapshot = useSettingsSnapshot(open);
  const [isPending, setIsPending] = useState(false);
  const absenceSettings = parseAbsenceSettings(
    settingsSnapshot.value?.values ?? {},
  );
  const subdivisionCode = resolveOnboardingSubdivisionCode(
    settingsSnapshot.value?.values ?? {},
  );
  const showAutoSyncToggle =
    mode === 'automatic' || !absenceSettings.autoSyncHolidays;
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(
    absenceSettings.autoSyncHolidays,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setAutoSyncEnabled(absenceSettings.autoSyncHolidays);
  }, [absenceSettings.autoSyncHolidays, open]);

  async function persistAutoSyncPreference(nextValue: boolean) {
    if (!runtime.api || !settingsSnapshot.value) {
      return;
    }

    if (absenceSettings.autoSyncHolidays === nextValue) {
      return;
    }

    const nextValues = mergeAbsenceSettings(settingsSnapshot.value.values, {
      ...absenceSettings,
      autoSyncHolidays: nextValue,
    });
    await runtime.api.setSettingsValues(nextValues);
  }

  async function refreshState() {
    await runtime.refresh();
    await settingsSnapshot.refresh();
  }

  async function handleCancel() {
    if (isPending) {
      return;
    }

    if (!runtime.api) {
      onOpenChange(false);
      return;
    }

    setIsPending(true);

    try {
      if (mode === 'automatic') {
        await persistAutoSyncPreference(autoSyncEnabled);
        await runtime.api.dismissAbsenceSync();
        await refreshState();
      }

      onOpenChange(false);
    } catch (error) {
      toast.error(
        t('absences.feedback.syncError'),
        error instanceof Error ? error.message : t('common.errors.unknown'),
      );
    } finally {
      setIsPending(false);
    }
  }

  async function handleConfirm() {
    if (!runtime.api || !settingsSnapshot.value) {
      return;
    }

    setIsPending(true);

    try {
      await persistAutoSyncPreference(autoSyncEnabled);
      await runtime.api.syncAbsenceCatalog();
      await refreshState();
      toast.success(t('absences.feedback.syncSuccess'));
      onOpenChange(false);
    } catch (error) {
      toast.error(
        t('absences.feedback.syncError'),
        error instanceof Error ? error.message : t('common.errors.unknown'),
      );
    } finally {
      setIsPending(false);
    }
  }

  async function handleConfirmClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    await handleConfirm();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t(
              mode === 'automatic'
                ? 'absences.sync.confirmTitle'
                : 'absences.sync.syncNowConfirmTitle',
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              {t(
                mode === 'automatic'
                  ? 'absences.sync.confirmDescription'
                  : 'absences.sync.syncNowConfirmDescription',
              )}
            </p>
            <div className="rounded-md border border-primary-tint/30 bg-primary-tint/10 p-3 text-sm text-text-color/90">
              <p>
                <strong>{t('absences.sync.stateLabel')}:</strong>{' '}
                {subdivisionCode ?? '-'}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {showAutoSyncToggle ? (
          <div className="flex items-center space-x-2 py-2">
            <Switch
              id={`absence-sync-${mode}-auto-sync`}
              checked={autoSyncEnabled}
              disabled={isPending}
              onCheckedChange={setAutoSyncEnabled}
            />
            <label
              htmlFor={`absence-sync-${mode}-auto-sync`}
              className="text-sm font-normal text-text-color"
            >
              {t(
                mode === 'manual'
                  ? 'absences.sync.enableAutoSyncLabel'
                  : 'absences.sync.autoSyncLabel',
              )}
            </label>
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={handleCancel}>
            {t(
              mode === 'automatic'
                ? 'absences.sync.dismissButton'
                : 'common.cancel',
            )}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            disabled={
              isPending ||
              !runtime.api ||
              !settingsSnapshot.value ||
              !subdivisionCode
            }
            onClick={handleConfirmClick}
          >
            {isPending ? t('common.loading') : t('absences.sync.confirmButton')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
