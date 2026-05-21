import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogleDrive } from 'react-icons/fa';
import { FaRegHardDrive } from 'react-icons/fa6';
import { GitCompareArrows, KeyRound, LockKeyhole } from 'lucide-react';

import JsonDiffViewer from '@/renderer/components/app/JsonDiffViewer';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import SettingsImportComparison from '@/renderer/components/app/SettingsImportComparison';
import DriveActionErrorDialog from '@/renderer/components/drive/DriveActionErrorDialog';
import DriveStatusBlock from '@/renderer/components/drive/DriveStatusBlock';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import useDriveActionErrorHandler from '@/renderer/hooks/useDriveActionErrorHandler';
import useDriveBackupFolder from '@/renderer/hooks/useDriveBackupFolder';
import {
  formatGermanDate,
  formatGermanDateTime,
} from '@/renderer/lib/date-format';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { BackupImportDecryptionInput } from '@/shared/ipc/app-api';
import {
  EncryptedBackupEnvelope,
  EncryptedBackupEnvelopeSchema,
} from '@/shared/app/backup-encryption';
import { SettingsImportPreview } from '@/shared/settings/schema';
import { DatabaseBackupImportPreview } from '@/shared/app/backup-archive';
import { DriveBackupFile } from '@/shared/drive/backups';
import { BackupConflictStrategy } from '@/shared/reports/models';

type PendingDecryptionImport =
  | {
      kind: 'reports-file' | 'settings-file';
      serialized: string;
    }
  | {
      kind: 'reports-drive' | 'settings-drive';
      fileId: string;
    };

function parseEncryptedBackup(
  serialized: string,
): EncryptedBackupEnvelope | null {
  try {
    const parsed = JSON.parse(serialized) as unknown;
    const result = EncryptedBackupEnvelopeSchema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function isDecryptionRequiredError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith('APPREP_BACKUP_DECRYPTION_REQUIRED:')
  );
}

export default function ImportPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const driveReady = runtime.state.drive.status === 'granted';
  const isGoogleOauthConfigured = runtime.state.auth.googleAuthConfigured;
  const [settingsPreview, setSettingsPreview] =
    useState<SettingsImportPreview | null>(null);
  const [backupPreview, setBackupPreview] =
    useState<DatabaseBackupImportPreview | null>(null);
  const [backupStrategies, setBackupStrategies] = useState<
    Record<string, BackupConflictStrategy>
  >({});
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(
    null,
  );
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[]>([]);
  const [settingsDriveBackups, setSettingsDriveBackups] = useState<
    DriveBackupFile[]
  >([]);
  const [isPending, setIsPending] = useState(false);
  const [isDrivePending, setIsDrivePending] = useState(false);
  const [pendingDecryptionImport, setPendingDecryptionImport] =
    useState<PendingDecryptionImport | null>(null);
  const [decryptionPassword, setDecryptionPassword] = useState('');
  const strategyLabels = useMemo<Record<BackupConflictStrategy, string>>(
    () => ({
      backup: t('import.reports.strategies.backup'),
      local: t('import.reports.strategies.local'),
      'latest-timestamp': t('import.reports.strategies.latestTimestamp'),
    }),
    [t],
  );
  useEffect(() => {
    const firstConflictId =
      backupPreview?.conflictingWeeks[0]?.weekIdentity ?? null;
    setSelectedConflictId(firstConflictId);
  }, [backupPreview]);
  const selectedConflict = useMemo(
    () =>
      backupPreview?.conflictingWeeks.find(
        (week) => week.weekIdentity === selectedConflictId,
      ) ??
      backupPreview?.conflictingWeeks[0] ??
      null,
    [backupPreview?.conflictingWeeks, selectedConflictId],
  );
  const settingsAffectedAreaText = useMemo(() => {
    if (!settingsPreview?.affectedKeys.length) {
      return t('import.settings.noAffectedAreas');
    }

    return settingsPreview.affectedKeys
      .map((key) => t(`import.settings.areas.${key}`, { defaultValue: key }))
      .join(', ');
  }, [settingsPreview?.affectedKeys, t]);
  const connectDrive = useCallback(async () => {
    if (!runtime.api) {
      return;
    }

    if (!isGoogleOauthConfigured) {
      toast.error(
        t('import.feedback.driveError'),
        t('export.drive.oauthUnavailable'),
      );
      return;
    }

    setIsDrivePending(true);

    try {
      await runtime.api.connectGoogleDrive();
      await runtime.refresh();
      toast.success(t('import.feedback.driveConnected'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.driveError'), message);
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

  async function prepareSettingsSerialized(
    serialized: string,
    decryption?: BackupImportDecryptionInput,
  ) {
    if (!runtime.api) {
      return;
    }
    try {
      const preview = await runtime.api.prepareSettingsImport(
        serialized,
        decryption,
      );
      setSettingsPreview(preview);
      setBackupPreview(null);
      setPendingDecryptionImport(null);
      setDecryptionPassword('');
      toast.info(t('import.feedback.settingsPrepared'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.settingsPrepareError'), message);
    }
  }

  async function prepareReportsSerialized(
    serialized: string,
    decryption?: BackupImportDecryptionInput,
  ) {
    if (!runtime.api) {
      return;
    }
    try {
      const preview = await runtime.api.prepareBackupImport(
        serialized,
        decryption,
      );
      setBackupPreview(preview);
      setSettingsPreview(null);
      setBackupStrategies({});
      setPendingDecryptionImport(null);
      setDecryptionPassword('');
      toast.info(t('import.feedback.reportsPrepared'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.reportsPrepareError'), message);
    }
  }

  async function handleSettingsFile() {
    if (!runtime.api) {
      return;
    }
    const serialized = await runtime.api.openJsonFileDialog();

    if (!serialized) {
      toast.info(t('import.feedback.openFileCanceled'));
      return;
    }

    if (parseEncryptedBackup(serialized)) {
      setPendingDecryptionImport({ kind: 'settings-file', serialized });
      return;
    }

    await prepareSettingsSerialized(serialized);
  }

  async function handleBackupFile() {
    if (!runtime.api) {
      return;
    }
    const serialized = await runtime.api.openJsonFileDialog();

    if (!serialized) {
      toast.info(t('import.feedback.openFileCanceled'));
      return;
    }

    if (parseEncryptedBackup(serialized)) {
      setPendingDecryptionImport({ kind: 'reports-file', serialized });
      return;
    }

    await prepareReportsSerialized(serialized);
  }

  async function loadDriveBackups() {
    if (!runtime.api) {
      return;
    }
    try {
      const backups = await runtime.api.listDriveBackups();
      setDriveBackups(backups);
      if (!backups.length) {
        toast.info(t('import.feedback.noDriveReports'));
        return;
      }
      toast.success(t('import.feedback.driveLoaded'));
    } catch (error) {
      if (!(await handleDriveActionError(error))) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('import.feedback.driveError'), message);
      }
    }
  }

  async function loadDriveSettingsBackups() {
    if (!runtime.api) {
      return;
    }
    try {
      const backups = await runtime.api.listDriveSettingsBackups();
      setSettingsDriveBackups(backups);
      if (!backups.length) {
        toast.info(t('import.feedback.noDriveSettings'));
        return;
      }
      toast.success(t('import.feedback.driveLoaded'));
    } catch (error) {
      if (!(await handleDriveActionError(error))) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('import.feedback.driveError'), message);
      }
    }
  }

  async function prepareDriveImport(
    fileId: string,
    decryption?: BackupImportDecryptionInput,
  ) {
    if (!runtime.api) {
      return;
    }
    try {
      const preview = await runtime.api.prepareDriveBackupImport({
        fileId,
        decryption,
      });
      setBackupPreview(preview);
      setSettingsPreview(null);
      setBackupStrategies({});
      setPendingDecryptionImport(null);
      setDecryptionPassword('');
      toast.info(t('import.feedback.reportsPrepared'));
    } catch (error) {
      if (isDecryptionRequiredError(error)) {
        setPendingDecryptionImport({ kind: 'reports-drive', fileId });
        return;
      }
      if (!(await handleDriveActionError(error))) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('import.feedback.driveError'), message);
      }
    }
  }

  async function prepareDriveSettingsImport(
    fileId: string,
    decryption?: BackupImportDecryptionInput,
  ) {
    if (!runtime.api) {
      return;
    }
    try {
      const preview = await runtime.api.prepareDriveSettingsImport({
        fileId,
        decryption,
      });
      setSettingsPreview(preview);
      setBackupPreview(null);
      setPendingDecryptionImport(null);
      setDecryptionPassword('');
      toast.info(t('import.feedback.settingsPrepared'));
    } catch (error) {
      if (isDecryptionRequiredError(error)) {
        setPendingDecryptionImport({ kind: 'settings-drive', fileId });
        return;
      }
      if (!(await handleDriveActionError(error))) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('import.feedback.driveError'), message);
      }
    }
  }

  async function decryptPendingImport(decryption: BackupImportDecryptionInput) {
    if (!pendingDecryptionImport) {
      return;
    }

    setIsPending(true);

    try {
      if (pendingDecryptionImport.kind === 'reports-file') {
        await prepareReportsSerialized(
          pendingDecryptionImport.serialized,
          decryption,
        );
      } else if (pendingDecryptionImport.kind === 'settings-file') {
        await prepareSettingsSerialized(
          pendingDecryptionImport.serialized,
          decryption,
        );
      } else if (pendingDecryptionImport.kind === 'reports-drive') {
        await prepareDriveImport(pendingDecryptionImport.fileId, decryption);
      } else if (pendingDecryptionImport.kind === 'settings-drive') {
        await prepareDriveSettingsImport(
          pendingDecryptionImport.fileId,
          decryption,
        );
      }
    } finally {
      setIsPending(false);
    }
  }

  async function applySettingsImport() {
    if (!runtime.api || !settingsPreview) {
      return;
    }
    setIsPending(true);
    try {
      await runtime.api.applySettingsImport({ previewId: settingsPreview.id });
      setSettingsPreview(null);
      await runtime.refresh();
      toast.success(t('import.feedback.settingsApplied'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.settingsApplyError'), message);
    } finally {
      setIsPending(false);
    }
  }

  async function cancelSettingsImport() {
    if (!runtime.api) {
      return;
    }

    try {
      await runtime.api.cancelSettingsImport();
      setSettingsPreview(null);
      await runtime.refresh();
      toast.info(t('import.feedback.settingsCanceled'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.settingsApplyError'), message);
    }
  }

  async function applyBackupImport() {
    if (!runtime.api || !backupPreview) {
      return;
    }
    setIsPending(true);
    try {
      await runtime.api.applyBackupImport({
        previewId: backupPreview.id,
        conflictStrategy: backupPreview.defaultConflictStrategy,
        weekConflictResolutions: backupPreview.conflictingWeeks.map((week) => ({
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          strategy: backupStrategies[week.weekIdentity] ?? week.defaultStrategy,
        })),
      });
      setBackupPreview(null);
      await runtime.refresh();
      toast.success(t('import.feedback.reportsApplied'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.reportsApplyError'), message);
    } finally {
      setIsPending(false);
    }
  }

  async function cancelBackupImport() {
    if (!runtime.api) {
      return;
    }

    try {
      await runtime.api.cancelBackupImport();
      setBackupPreview(null);
      await runtime.refresh();
      toast.info(t('import.feedback.reportsCanceled'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.reportsApplyError'), message);
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

  function cancelActiveImport() {
    if (backupPreview) {
      cancelBackupImport();
      return;
    }

    if (settingsPreview) {
      cancelSettingsImport();
    }
  }

  function applyActiveImport() {
    if (backupPreview) {
      applyBackupImport();
      return;
    }

    if (settingsPreview) {
      applySettingsImport();
    }
  }

  const hasActivePreview = Boolean(backupPreview || settingsPreview);
  const pendingEncryptedEnvelope =
    pendingDecryptionImport && 'serialized' in pendingDecryptionImport
      ? parseEncryptedBackup(pendingDecryptionImport.serialized)
      : null;
  const googleDecryptionAvailable =
    driveReady &&
    (pendingEncryptedEnvelope
      ? Boolean(pendingEncryptedEnvelope.googleRecipient)
      : true);
  const reportsDriveFolder = useDriveBackupFolder('reports', driveReady);
  const settingsDriveFolder = useDriveBackupFolder('settings', driveReady);

  return (
    <>
      <div className="space-y-4">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <SectionCard
            title={t('import.reports.title')}
            className="h-fit border-primary-tint bg-white"
          >
            <div className="flex flex-col gap-4">
              {renderDriveStatus(reportsDriveFolder?.url ?? null)}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-primary text-primary-contrast hover:bg-primary-shade"
                  onClick={() => {
                    handleBackupFile();
                  }}
                >
                  <FaRegHardDrive />
                  {t('import.reports.localFile')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary-tint"
                  disabled={!driveReady}
                  disabledReason={t('common.disabledReasons.driveNotReady')}
                  onClick={() => {
                    loadDriveBackups();
                  }}
                >
                  <FaGoogleDrive />
                  {t('import.reports.loadDrive')}
                </Button>
              </div>
            </div>
            {driveBackups.length ? (
              <ul className="mt-3 max-h-52 space-y-2 overflow-auto pr-1 text-sm">
                {driveBackups.map((backup) => (
                  <li
                    key={backup.id}
                    className="flex items-center justify-between rounded-md border border-primary-tint/70 px-3 py-2"
                  >
                    <span>{backup.name}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-primary-tint"
                      onClick={() => {
                        prepareDriveImport(backup.id);
                      }}
                    >
                      <GitCompareArrows />
                      {t('import.reports.useDriveFile')}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </SectionCard>

          <SectionCard
            title={t('import.settings.title')}
            className="h-fit border-primary-tint bg-white"
          >
            <div className="flex flex-col gap-4">
              {renderDriveStatus(settingsDriveFolder?.url ?? null)}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-primary text-primary-contrast hover:bg-primary-shade"
                  onClick={() => {
                    handleSettingsFile();
                  }}
                >
                  <FaRegHardDrive />
                  {t('import.settings.chooseFile')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary-tint"
                  disabled={!driveReady}
                  disabledReason={t('common.disabledReasons.driveNotReady')}
                  onClick={() => {
                    loadDriveSettingsBackups();
                  }}
                >
                  <FaGoogleDrive />
                  {t('import.settings.loadDrive')}
                </Button>
              </div>
            </div>
            {settingsDriveBackups.length ? (
              <ul className="mt-3 max-h-52 space-y-2 overflow-auto pr-1 text-sm">
                {settingsDriveBackups.map((backup) => (
                  <li
                    key={backup.id}
                    className="flex items-center justify-between rounded-md border border-primary-tint/70 px-3 py-2"
                  >
                    <span>{backup.name}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-primary-tint"
                      onClick={() => {
                        prepareDriveSettingsImport(backup.id);
                      }}
                    >
                      <GitCompareArrows />
                      {t('import.settings.useDriveFile')}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </SectionCard>
        </div>

        {backupPreview ? (
          <SectionCard
            title={t('import.reports.compareTitle')}
            className="border-primary-tint bg-white"
          >
            <div className="space-y-4">
              <p className="text-sm text-text-color/80">
                {t('import.reports.conflictSummary', {
                  weeks: backupPreview.conflictSummary.conflictingWeekCount,
                  days: backupPreview.conflictSummary
                    .conflictingDailyReportCount,
                })}
              </p>
              <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
                {backupPreview.conflictingWeeks.length ? (
                  <ul className="max-h-[52vh] space-y-2 overflow-auto pr-1">
                    {backupPreview.conflictingWeeks.map((week) => (
                      <li
                        key={week.weekIdentity}
                        className={`rounded-md border p-3 ${
                          selectedConflictId === week.weekIdentity
                            ? 'border-primary bg-primary-tint/25'
                            : 'border-primary-tint/70'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            className="cursor-pointer text-left font-semibold text-text-color"
                            onClick={() =>
                              setSelectedConflictId(week.weekIdentity)
                            }
                          >
                            {formatGermanDate(week.weekStart)} -{' '}
                            {formatGermanDate(week.weekEnd)}
                          </button>
                          <select
                            className="border-input bg-background h-8 rounded-md border px-2 text-sm"
                            value={
                              backupStrategies[week.weekIdentity] ??
                              week.defaultStrategy
                            }
                            onChange={(event) =>
                              setBackupStrategies((current) => ({
                                ...current,
                                [week.weekIdentity]: event.target
                                  .value as BackupConflictStrategy,
                              }))
                            }
                          >
                            {backupPreview.availableConflictStrategies.map(
                              (strategy) => (
                                <option key={strategy} value={strategy}>
                                  {strategyLabels[strategy]}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {selectedConflict ? (
                  <JsonDiffViewer
                    currentValue={selectedConflict.current}
                    incomingValue={selectedConflict.incoming}
                    currentTitle={t('import.reports.currentWeek')}
                    incomingTitle={t('import.reports.incomingWeek')}
                  />
                ) : null}
              </div>
            </div>
          </SectionCard>
        ) : null}

        {settingsPreview ? (
          <SectionCard
            title={t('import.settings.compareTitle')}
            className="border-primary-tint bg-white"
          >
            <SettingsImportComparison
              preview={settingsPreview}
              currentTitleLabel={t('import.settings.current')}
              incomingTitleLabel={t('import.settings.target')}
              diffCountDisplay={{
                type: 'text',
                label: t('settings.compare.diffCount'),
              }}
              notice={
                <Alert className="border-primary-tint bg-primary-tint/30">
                  <AlertTitle>{t('import.settings.confirmTitle')}</AlertTitle>
                  <AlertDescription>
                    {t('import.settings.confirmDescription', {
                      importedAt: settingsPreview.importedAt
                        ? formatGermanDateTime(settingsPreview.importedAt)
                        : t('common.no'),
                      areas: settingsAffectedAreaText,
                    })}
                  </AlertDescription>
                </Alert>
              }
            />
          </SectionCard>
        ) : null}
      </div>
      {hasActivePreview ? (
        <div className="pointer-events-none fixed bottom-6 left-6 right-6 z-50 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            className="pointer-events-auto border-primary-tint bg-white shadow-lg"
            onClick={cancelActiveImport}
          >
            {t('import.actions.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            disabledReason={t('common.disabledReasons.pending')}
            className="pointer-events-auto bg-primary text-primary-contrast shadow-lg hover:bg-primary-shade"
            onClick={applyActiveImport}
          >
            {isPending ? t('common.loading') : t('import.actions.apply')}
          </Button>
        </div>
      ) : null}
      <DriveActionErrorDialog
        kind={driveActionErrorDialogKind}
        onClose={closeDriveActionErrorDialog}
      />
      <Dialog
        open={Boolean(pendingDecryptionImport)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDecryptionImport(null);
            setDecryptionPassword('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('import.decryption.title')}</DialogTitle>
            <DialogDescription>
              {t('import.decryption.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              value={decryptionPassword}
              placeholder={t('import.decryption.passwordPlaceholder')}
              onChange={(event) => setDecryptionPassword(event.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-primary-tint"
              disabled={!googleDecryptionAvailable || isPending}
              disabledReason={
                googleDecryptionAvailable
                  ? t('common.disabledReasons.pending')
                  : t('common.disabledReasons.driveNotReady')
              }
              onClick={() => {
                decryptPendingImport({ method: 'google' });
              }}
            >
              <KeyRound />
              {t('import.decryption.google')}
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              disabled={!decryptionPassword || isPending}
              disabledReason={t('import.decryption.passwordRequired')}
              onClick={() => {
                decryptPendingImport({
                  method: 'password',
                  password: decryptionPassword,
                });
              }}
            >
              <LockKeyhole />
              {t('import.decryption.password')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
