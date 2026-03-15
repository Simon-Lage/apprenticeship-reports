import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ExportPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const driveReady = runtime.state.drive.status === 'granted';

  async function exportReportsJson() {
    if (!runtime.api) {
      return;
    }
    try {
      const envelope = await runtime.api.exportBackupArchive();
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
    }
  }

  async function exportSettingsJson() {
    if (!runtime.api) {
      return;
    }
    try {
      const envelope = await runtime.api.exportSettings();
      const outputPath = await runtime.api.saveJsonFileDialog({
        defaultFileName: `settings-export-${new Date().toISOString().slice(0, 10)}.json`,
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
    }
  }

  async function connectDrive() {
    if (!runtime.api) {
      return;
    }
    try {
      await runtime.api.connectGoogleDrive();
      await runtime.refresh();
      toast.success(t('export.feedback.driveConnected'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('export.feedback.driveError'), message);
    }
  }

  async function exportToDrive() {
    if (!runtime.api) {
      return;
    }
    try {
      const result = await runtime.api.uploadBackupToDrive();
      await runtime.refresh();
      toast.success(t('export.feedback.driveExported'), result.name);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('export.feedback.driveError'), message);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('export.title')}
        description={t('export.description')}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={t('export.local.title')}
          description={t('export.local.description')}
          className="border-primary-tint bg-white"
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                exportReportsJson();
              }}
            >
              {t('export.local.reports')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-primary-tint"
              onClick={() => {
                exportSettingsJson();
              }}
            >
              {t('export.local.settings')}
            </Button>
          </div>
        </SectionCard>
        <SectionCard
          title={t('export.drive.title')}
          description={t('export.drive.description')}
          className="border-primary-tint bg-white"
        >
          <div className="space-y-3">
            <Badge
              className={
                driveReady
                  ? 'bg-primary text-primary-contrast'
                  : 'bg-primary-tint text-text-color'
              }
            >
              {driveReady
                ? t('export.drive.ready')
                : t('export.drive.notReady')}
            </Badge>
            {!driveReady ? (
              <Alert className="border-primary-tint bg-primary-tint/30">
                <AlertTitle>{t('export.drive.warningTitle')}</AlertTitle>
                <AlertDescription>
                  {t('export.drive.warningDescription')}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-primary-tint"
                onClick={() => {
                  connectDrive();
                }}
              >
                {t('export.drive.connect')}
              </Button>
              <Button
                type="button"
                disabled={!driveReady}
                className="bg-primary text-primary-contrast hover:bg-primary-shade"
                onClick={() => {
                  exportToDrive();
                }}
              >
                {t('export.drive.export')}
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
