import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/renderer/components/ui/dialog';
import { Button } from '@/renderer/components/ui/button';
import { Checkbox } from '@/renderer/components/ui/checkbox';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { Label } from '@/renderer/components/ui/label';

export function AbsenceSyncConfirmDialog() {
  const { t } = useTranslation();
  const { state, api, refresh } = useAppRuntime();
  const [autoSync, setAutoSync] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const isOpen = state.absence?.syncPending ?? false;

  const handleSync = async () => {
    if (!api) return;
    setIsSyncing(true);
    try {
      // If user unchecked auto-sync, we need to update settings
      if (!autoSync) {
        await api.setSettingsValues({
          absence: {
            autoSyncHolidays: false,
          },
        });
      } else if (!state.absence?.autoSyncHolidays) {
        // If it was disabled and user checked it, enable it
        await api.setSettingsValues({
          absence: {
            autoSyncHolidays: true,
          },
        });
      }

      await api.syncAbsenceCatalog();
      await refresh();
    } catch (error) {
      console.error('Failed to sync absence catalog:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDismiss = async () => {
    if (!api) return;
    try {
      // Even if dismissing, if user unchecked auto-sync, we respect that for future
      // However, usually dismiss just clears the pending flag for *this* session.
      // The requirement says: "User must be able to check in the modal that it should not be fetched automatically at all."
      // So if they uncheck it and dismiss, we should probably save that setting.
      if (!autoSync) {
        await api.setSettingsValues({
          absence: {
            autoSyncHolidays: false,
          },
        });
      }

      await api.dismissAbsenceSync();
      await refresh();
    } catch (error) {
      console.error('Failed to dismiss absence sync:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('absences.sync.confirmTitle')}</DialogTitle>
          <DialogDescription>
            {t('absences.sync.confirmDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="auto-sync-holidays"
            checked={autoSync}
            onCheckedChange={(checked) => setAutoSync(!!checked)}
          />
          <Label
            htmlFor="auto-sync-holidays"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t('absences.sync.autoSyncLabel')}
          </Label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isSyncing}
          >
            {t('absences.sync.dismissButton')}
          </Button>
          <Button onClick={handleSync} loading={isSyncing}>
            {t('absences.sync.confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
