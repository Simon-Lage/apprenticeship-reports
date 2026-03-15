import { ChangeEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CompareLayout } from '@/renderer/layouts/CompareLayout';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { readTextFile } from '@/renderer/lib/file-io';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { SettingsImportPreview } from '@/shared/settings/schema';
import {
  DatabaseBackupImportPreview,
} from '@/shared/app/backup-archive';
import { DriveBackupFile } from '@/shared/drive/backups';
import { BackupConflictStrategy } from '@/shared/reports/models';

function JsonPanel({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-primary-tint/70 bg-primary-tint/20 p-3 text-xs text-text-color">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function strategyLabel(strategy: BackupConflictStrategy) {
  if (strategy === 'backup') {
    return 'Backup';
  }
  if (strategy === 'local') {
    return 'Lokal';
  }
  return 'Neuester Timestamp';
}

export default function ImportPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [settingsPreview, setSettingsPreview] = useState<SettingsImportPreview | null>(null);
  const [backupPreview, setBackupPreview] = useState<DatabaseBackupImportPreview | null>(null);
  const [backupStrategies, setBackupStrategies] = useState<Record<string, BackupConflictStrategy>>({});
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[]>([]);
  const [isPending, setIsPending] = useState(false);
  const selectedConflict = useMemo(
    () => backupPreview?.conflictingWeeks[0] ?? null,
    [backupPreview?.conflictingWeeks],
  );

  async function handleSettingsFile(event: ChangeEvent<HTMLInputElement>) {
    if (!runtime.api) {
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const serialized = await readTextFile(file);
      const preview = await runtime.api.prepareSettingsImport(serialized);
      setSettingsPreview(preview);
      toast.info(t('import.feedback.settingsPrepared'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.settingsPrepareError'), message);
    } finally {
      event.target.value = '';
    }
  }

  async function handleBackupFile(event: ChangeEvent<HTMLInputElement>) {
    if (!runtime.api) {
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const serialized = await readTextFile(file);
      const preview = await runtime.api.prepareBackupImport(serialized);
      setBackupPreview(preview);
      setBackupStrategies({});
      toast.info(t('import.feedback.reportsPrepared'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('import.feedback.reportsPrepareError'), message);
    } finally {
      event.target.value = '';
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
    <div className="space-y-6">
      <PageHeader
        title={t('import.title')}
        description={t('import.description')}
      />
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList className="bg-primary-tint/40">
          <TabsTrigger value="reports">{t('import.tabs.reports')}</TabsTrigger>
          <TabsTrigger value="settings">{t('import.tabs.settings')}</TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="space-y-4">
          <SectionCard
            title={t('import.reports.title')}
            description={t('import.reports.description')}
            className="border-primary-tint bg-white"
          >
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-primary-tint px-3 py-2 text-sm text-text-color">
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(event) => {
                    void handleBackupFile(event);
                  }}
                />
                {t('import.reports.localFile')}
              </label>
              <Button
                type="button"
                variant="outline"
                className="border-primary-tint"
                onClick={() => {
                  void loadDriveBackups();
                }}
              >
                {t('import.reports.loadDrive')}
              </Button>
            </div>
            {driveBackups.length ? (
              <ul className="mt-3 space-y-2 text-sm">
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
                        void prepareDriveImport(backup.id);
                      }}
                    >
                      {t('import.reports.useDriveFile')}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </SectionCard>
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
                      void cancelBackupImport();
                    }}
                  >
                    {t('import.actions.cancel')}
                  </Button>
                  <Button
                    type="button"
                    disabled={isPending}
                    className="bg-primary text-primary-contrast hover:bg-primary-shade"
                    onClick={() => {
                      void applyBackupImport();
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
                {backupPreview.conflictingWeeks.length ? (
                  <ul className="space-y-2">
                    {backupPreview.conflictingWeeks.map((week) => (
                      <li
                        key={week.weekIdentity}
                        className="rounded-md border border-primary-tint/70 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong>
                            {week.weekStart} - {week.weekEnd}
                          </strong>
                          <select
                            className="border-input bg-background h-8 rounded-md border px-2 text-sm"
                            value={backupStrategies[week.weekIdentity] ?? week.defaultStrategy}
                            onChange={(event) =>
                              setBackupStrategies((current) => ({
                                ...current,
                                [week.weekIdentity]: event.target
                                  .value as BackupConflictStrategy,
                              }))
                            }
                          >
                            {backupPreview.availableConflictStrategies.map((strategy) => (
                              <option key={strategy} value={strategy}>
                                {strategyLabel(strategy)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {selectedConflict ? (
                  <CompareLayout
                    leftTitle={t('import.reports.currentWeek')}
                    rightTitle={t('import.reports.incomingWeek')}
                    left={<JsonPanel value={selectedConflict.current} />}
                    right={<JsonPanel value={selectedConflict.incoming} />}
                  />
                ) : null}
              </div>
            </SectionCard>
          ) : null}
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <SectionCard
            title={t('import.settings.title')}
            description={t('import.settings.description')}
            className="border-primary-tint bg-white"
          >
            <label className="inline-flex cursor-pointer items-center rounded-md border border-primary-tint px-3 py-2 text-sm text-text-color">
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(event) => {
                  void handleSettingsFile(event);
                }}
              />
              {t('import.settings.chooseFile')}
            </label>
          </SectionCard>
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
                      void cancelSettingsImport();
                    }}
                  >
                    {t('import.actions.cancel')}
                  </Button>
                  <Button
                    type="button"
                    disabled={isPending}
                    className="bg-primary text-primary-contrast hover:bg-primary-shade"
                    onClick={() => {
                      void applySettingsImport();
                    }}
                  >
                    {isPending ? t('common.loading') : t('import.actions.apply')}
                  </Button>
                </div>
              }
            >
              <CompareLayout
                leftTitle={t('import.settings.current')}
                rightTitle={t('import.settings.incoming')}
                left={<JsonPanel value={settingsPreview.current.values} />}
                right={<JsonPanel value={settingsPreview.incoming.values} />}
              />
            </SectionCard>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
