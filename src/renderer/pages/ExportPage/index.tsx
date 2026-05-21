import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogleDrive } from 'react-icons/fa';
import { FaRegHardDrive } from 'react-icons/fa6';
import { LockKeyhole, TriangleAlert } from 'lucide-react';

import { SectionCard } from '@/renderer/components/app/SectionCard';
import SettingsBackupScopeSwitches from '@/renderer/components/backup/SettingsBackupScopeSwitches';
import DriveActionErrorDialog from '@/renderer/components/drive/DriveActionErrorDialog';
import DriveStatusBlock from '@/renderer/components/drive/DriveStatusBlock';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
import useDriveActionErrorHandler from '@/renderer/hooks/useDriveActionErrorHandler';
import useDriveBackupFolder from '@/renderer/hooks/useDriveBackupFolder';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createDriveBackupPath, DriveBackupKind } from '@/shared/drive/backups';
import { BackupEncryptionMode } from '@/shared/app/backup-encryption';
import {
  SettingsBackupScopeValues,
  defaultSettingsBackupScope,
  mergeBackupSettings,
  parseBackupSettings,
} from '@/shared/backup/settings';

export default function ExportPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const settingsSnapshot = useSettingsSnapshot();
  const driveReady = runtime.state.drive.status === 'granted';
  const isGoogleOauthConfigured = runtime.state.auth.googleAuthConfigured;
  const [isDrivePending, setIsDrivePending] = useState(false);
  const [isReportsLocalPending, setIsReportsLocalPending] = useState(false);
  const [isReportsDrivePending, setIsReportsDrivePending] = useState(false);
  const [isSettingsLocalPending, setIsSettingsLocalPending] = useState(false);
  const [isSettingsDrivePending, setIsSettingsDrivePending] = useState(false);
  const [pendingExportAction, setPendingExportAction] = useState<
    | 'reports-local'
    | 'reports-drive'
    | 'settings-local'
    | 'settings-drive'
    | null
  >(null);
  const [manualSettingsScope, setManualSettingsScope] =
    useState<SettingsBackupScopeValues>(defaultSettingsBackupScope);
  const backupSettings = useMemo(
    () =>
      settingsSnapshot.value
        ? parseBackupSettings(settingsSnapshot.value.values)
        : null,
    [settingsSnapshot.value],
  );
  const reportsDriveFolder = useDriveBackupFolder('reports', driveReady);
  const settingsDriveFolder = useDriveBackupFolder('settings', driveReady);
  const connectDrive = useCallback(async () => {
    if (!runtime.api) {
      return;
    }

    if (!isGoogleOauthConfigured) {
      toast.error(
        t('export.feedback.driveError'),
        t('export.drive.oauthUnavailable'),
      );
      return;
    }

    setIsDrivePending(true);

    try {
      await runtime.api.connectGoogleDrive();
      await runtime.refresh();
      toast.success(t('export.feedback.driveConnected'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('export.feedback.driveError'), message);
    } finally {
      setIsDrivePending(false);
    }
  }, [isGoogleOauthConfigured, runtime, t, toast]);
  const {
    driveActionErrorDialogKind,
    closeDriveActionErrorDialog,
    handleDriveActionError,
  } = useDriveActionErrorHandler({
    onRequestPermissions: connectDrive,
  });

  function formatDrivePath(fileName: string, kind: DriveBackupKind): string {
    return createDriveBackupPath(fileName, kind);
  }

  useEffect(() => {
    if (backupSettings) {
      setManualSettingsScope(backupSettings.manualSettingsScope);
    }
  }, [backupSettings]);

  async function persistManualSettingsScope(scope: SettingsBackupScopeValues) {
    setManualSettingsScope(scope);

    if (!runtime.api || !settingsSnapshot.value || !backupSettings) {
      return;
    }

    try {
      await runtime.api.setSettingsValues(
        mergeBackupSettings(settingsSnapshot.value.values, {
          ...backupSettings,
          manualSettingsScope: scope,
        }),
      );
      await runtime.refresh();
      await settingsSnapshot.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('export.feedback.settingsScopeError'), message);
    }
  }

  async function exportReportsJson(encryptionMode: BackupEncryptionMode) {
    if (!runtime.api) {
      return;
    }

    setIsReportsLocalPending(true);

    try {
      const envelope = await runtime.api.exportBackupArchive({
        encryptionMode,
      });
      const outputPath = await runtime.api.saveJsonFileDialog({
        defaultFileName: `reports-backup-${new Date().toISOString().slice(0, 10)}.json`,
        serialized: JSON.stringify(envelope, null, 2),
      });

      if (!outputPath) {
        toast.info(t('export.feedback.exportCanceled'));
        return;
      }

      toast.success(t('export.feedback.reportsExported'), outputPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('export.feedback.reportsExportError'), message);
    } finally {
      setIsReportsLocalPending(false);
    }
  }

  async function exportSettingsJson(encryptionMode: BackupEncryptionMode) {
    if (!runtime.api) {
      return;
    }

    setIsSettingsLocalPending(true);

    try {
      const envelope = await runtime.api.exportSettings({
        scope: manualSettingsScope,
        encryptionMode,
      });
      const outputPath = await runtime.api.saveJsonFileDialog({
        defaultFileName: `settings-backup-${new Date().toISOString().slice(0, 10)}.json`,
        serialized: JSON.stringify(envelope, null, 2),
      });

      if (!outputPath) {
        toast.info(t('export.feedback.exportCanceled'));
        return;
      }

      await runtime.refresh();
      toast.success(t('export.feedback.settingsExported'), outputPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('export.feedback.settingsExportError'), message);
    } finally {
      setIsSettingsLocalPending(false);
    }
  }

  async function exportReportsToDrive(encryptionMode: BackupEncryptionMode) {
    if (!runtime.api) {
      return;
    }

    setIsReportsDrivePending(true);

    try {
      const result = await runtime.api.uploadBackupToDrive({
        encryptionMode,
      });
      await runtime.refresh();
      toast.success(
        t('export.feedback.driveExported'),
        formatDrivePath(result.name, 'reports'),
      );
    } catch (error) {
      if (!(await handleDriveActionError(error))) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('export.feedback.driveError'), message);
      }
    } finally {
      setIsReportsDrivePending(false);
    }
  }

  async function exportSettingsToDrive(encryptionMode: BackupEncryptionMode) {
    if (!runtime.api) {
      return;
    }

    setIsSettingsDrivePending(true);

    try {
      const result = await runtime.api.uploadSettingsBackupToDrive({
        scope: manualSettingsScope,
        encryptionMode,
      });
      await runtime.refresh();
      toast.success(
        t('export.feedback.settingsDriveExported'),
        formatDrivePath(result.name, 'settings'),
      );
    } catch (error) {
      if (!(await handleDriveActionError(error))) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('export.feedback.driveError'), message);
      }
    } finally {
      setIsSettingsDrivePending(false);
    }
  }

  function requestExport(action: NonNullable<typeof pendingExportAction>) {
    setPendingExportAction(action);
  }

  async function confirmExport(encryptionMode: BackupEncryptionMode) {
    const action = pendingExportAction;

    setPendingExportAction(null);

    if (action === 'reports-local') {
      await exportReportsJson(encryptionMode);
    } else if (action === 'reports-drive') {
      await exportReportsToDrive(encryptionMode);
    } else if (action === 'settings-local') {
      await exportSettingsJson(encryptionMode);
    } else if (action === 'settings-drive') {
      await exportSettingsToDrive(encryptionMode);
    }
  }

  function renderDriveStatus(backupFolderUrl: string | null) {
    return (
      <DriveStatusBlock
        driveReady={driveReady}
        isGoogleOauthConfigured={isGoogleOauthConfigured}
        connectedAccountEmail={runtime.state.drive.connectedAccountEmail}
        backupFolderUrl={backupFolderUrl}
        isPending={isDrivePending}
        onConnect={() => {
          connectDrive();
        }}
      />
    );
  }

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SectionCard
          title={t('export.reports.title')}
          className="border-primary-tint bg-white"
        >
          <div className="flex flex-col gap-4">
            {renderDriveStatus(reportsDriveFolder?.url ?? null)}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-primary-tint"
                disabled={isReportsLocalPending}
                disabledReason={t('common.disabledReasons.pending')}
                onClick={() => {
                  requestExport('reports-local');
                }}
              >
                <FaRegHardDrive />
                {isReportsLocalPending
                  ? t('common.loading')
                  : t('export.actions.localBackup')}
              </Button>
              <Button
                type="button"
                className="bg-primary text-primary-contrast hover:bg-primary-shade"
                disabled={!driveReady || isReportsDrivePending}
                disabledReason={
                  isReportsDrivePending
                    ? t('common.disabledReasons.pending')
                    : t('common.disabledReasons.driveNotReady')
                }
                onClick={() => {
                  requestExport('reports-drive');
                }}
              >
                <FaGoogleDrive />
                {isReportsDrivePending
                  ? t('common.loading')
                  : t('export.actions.driveBackup')}
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t('export.settings.title')}
          className="border-primary-tint bg-white"
        >
          <div className="flex flex-col gap-4">
            {renderDriveStatus(settingsDriveFolder?.url ?? null)}
            <SettingsBackupScopeSwitches
              value={manualSettingsScope}
              disabled={isSettingsLocalPending || isSettingsDrivePending}
              onChange={(scope) => {
                persistManualSettingsScope(scope);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-primary-tint"
                disabled={isSettingsLocalPending}
                disabledReason={t('common.disabledReasons.pending')}
                onClick={() => {
                  requestExport('settings-local');
                }}
              >
                <FaRegHardDrive />
                {isSettingsLocalPending
                  ? t('common.loading')
                  : t('export.actions.localBackup')}
              </Button>
              <Button
                type="button"
                className="bg-primary text-primary-contrast hover:bg-primary-shade"
                disabled={!driveReady || isSettingsDrivePending}
                disabledReason={
                  isSettingsDrivePending
                    ? t('common.disabledReasons.pending')
                    : t('common.disabledReasons.driveNotReady')
                }
                onClick={() => {
                  requestExport('settings-drive');
                }}
              >
                <FaGoogleDrive />
                {isSettingsDrivePending
                  ? t('common.loading')
                  : t('export.actions.driveBackup')}
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
      <DriveActionErrorDialog
        kind={driveActionErrorDialogKind}
        onClose={closeDriveActionErrorDialog}
      />
      <Dialog
        open={Boolean(pendingExportAction)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingExportAction(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('export.encryptionDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('export.encryptionDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => {
                confirmExport('plain');
              }}
            >
              <TriangleAlert />
              <span className="flex flex-col items-start leading-tight">
                <span>{t('export.encryptionDialog.plain')}</span>
                <span className="text-xs font-normal">
                  {t('export.encryptionDialog.plainHint')}
                </span>
              </span>
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                confirmExport('encrypted');
              }}
            >
              <LockKeyhole />
              <span className="flex flex-col items-start leading-tight">
                <span>{t('export.encryptionDialog.encrypted')}</span>
                <span className="text-xs font-normal">
                  {t('export.encryptionDialog.recommended')}
                </span>
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
