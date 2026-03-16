import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import JsonDiffViewer from '@/renderer/components/app/JsonDiffViewer';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { Button } from '@/components/ui/button';
import { SettingsImportPreview } from '@/shared/settings/schema';
import { DatabaseBackupImportPreview } from '@/shared/app/backup-archive';
import { DriveBackupFile } from '@/shared/drive/backups';
import { BackupConflictStrategy } from '@/shared/reports/models';

export default function ImportPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
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
  const [isPending, setIsPending] = useState(false);
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

  async function handleSettingsFile() {
    if (!runtime.api) {
      return;
    }
    const serialized = await runtime.api.openJsonFileDialog();

    if (!serialized) {
      toast.info(t('import.feedback.openFileCanceled'));
      return;
    }
    try {
      const preview = await runtime.api.prepareSettingsImport(serialized);
      setSettingsPreview(preview);
      toast.info(t('import.feedback.settingsPrepared'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.settingsPrepareError'), message);
    }
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
    try {
      const preview = await runtime.api.prepareBackupImport(serialized);
      setBackupPreview(preview);
      setBackupStrategies({});
      toast.info(t('import.feedback.reportsPrepared'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.reportsPrepareError'), message);
    }
  }

  async function loadDriveBackups() {
    if (!runtime.api) {
      return;
    }
    try {
      const backups = await runtime.api.listDriveBackups();
      setDriveBackups(backups);
      toast.success(t('import.feedback.driveLoaded'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.driveError'), message);
    }
  }

  async function prepareDriveImport(fileId: string) {
    if (!runtime.api) {
      return;
    }
    try {
      const preview = await runtime.api.prepareDriveBackupImport({ fileId });
      setBackupPreview(preview);
      setBackupStrategies({});
      toast.info(t('import.feedback.reportsPrepared'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.driveError'), message);
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
    await runtime.api.cancelSettingsImport();
    setSettingsPreview(null);
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
    await runtime.api.cancelBackupImport();
    setBackupPreview(null);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('import.title')}
        description={t('import.description')}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={t('import.reports.title')}
          description={t('import.reports.description')}
          className="h-fit border-primary-tint bg-white"
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                handleBackupFile();
              }}
            >
              {t('import.reports.localFile')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-primary-tint"
              onClick={() => {
                loadDriveBackups();
              }}
            >
              {t('import.reports.loadDrive')}
            </Button>
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
                    {t('import.reports.useDriveFile')}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionCard>

        <SectionCard
          title={t('import.settings.title')}
          description={t('import.settings.description')}
          className="h-fit border-primary-tint bg-white"
        >
          <Button
            type="button"
            variant="outline"
            className="border-primary-tint"
            onClick={() => {
              handleSettingsFile();
            }}
          >
            {t('import.settings.chooseFile')}
          </Button>
        </SectionCard>
      </div>

      {backupPreview ? (
        <SectionCard
          title={t('import.reports.compareTitle')}
          description={backupPreview.warning}
          className="border-primary-tint bg-white"
          action={
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-primary-tint"
                onClick={() => {
                  cancelBackupImport();
                }}
              >
                {t('import.actions.cancel')}
              </Button>
              <Button
                type="button"
                disabled={isPending}
                className="bg-primary text-primary-contrast hover:bg-primary-shade"
                onClick={() => {
                  applyBackupImport();
                }}
              >
                {isPending ? t('common.loading') : t('import.actions.apply')}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-text-color/80">
              {t('import.reports.conflictSummary', {
                weeks: backupPreview.conflictSummary.conflictingWeekCount,
                days: backupPreview.conflictSummary.conflictingDailyReportCount,
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
                          className="text-left font-semibold text-text-color"
                          onClick={() =>
                            setSelectedConflictId(week.weekIdentity)
                          }
                        >
                          {week.weekStart} - {week.weekEnd}
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
          description={settingsPreview.warning}
          className="border-primary-tint bg-white"
          action={
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-primary-tint"
                onClick={() => {
                  cancelSettingsImport();
                }}
              >
                {t('import.actions.cancel')}
              </Button>
              <Button
                type="button"
                disabled={isPending}
                className="bg-primary text-primary-contrast hover:bg-primary-shade"
                onClick={() => {
                  applySettingsImport();
                }}
              >
                {isPending ? t('common.loading') : t('import.actions.apply')}
              </Button>
            </div>
          }
        >
          <JsonDiffViewer
            currentValue={settingsPreview.current.values}
            incomingValue={settingsPreview.incoming.values}
            currentTitle={`${t('import.settings.current')} (${settingsPreview.current.capturedAt})`}
            incomingTitle={`${t('import.settings.incoming')} (${settingsPreview.incoming.capturedAt})`}
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
