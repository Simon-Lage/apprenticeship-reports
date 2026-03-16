import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { appRoutes } from '@/renderer/lib/app-routes';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ExportPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const driveReady = runtime.state.drive.status === 'granted';
  const isGoogleOauthConfigured = runtime.state.auth.googleAuthConfigured;
  const [isDrivePending, setIsDrivePending] = useState(false);

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
  }

  async function exportToDrive() {
    if (!runtime.api) {
      return;
    }

    setIsDrivePending(true);

    try {
      const result = await runtime.api.uploadBackupToDrive();
      await runtime.refresh();
      toast.success(t('export.feedback.driveExported'), result.name);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('export.feedback.driveError'), message);
    } finally {
      setIsDrivePending(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('export.title')}
        description={t('export.description')}
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
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
                  : 'bg-primary text-primary-contrast'
              }
            >
              {driveReady
                ? t('export.drive.ready')
                : t('export.drive.notReady')}
            </Badge>
            {!isGoogleOauthConfigured ? (
              <p className="text-sm text-text-color/75">
                {t('export.drive.oauthUnavailable')}
              </p>
            ) : null}
            {!driveReady ? (
              <Alert className="border-primary-tint bg-primary-tint/30">
                <AlertTitle>{t('export.drive.warningTitle')}</AlertTitle>
                <AlertDescription>
                  {t('export.drive.warningDescription')}
                </AlertDescription>
              </Alert>
            ) : null}
            {driveReady ? (
              <div className="space-y-1 text-sm">
                <p className="text-text-color/85">
                  {t('export.drive.connectedAccount', {
                    email: runtime.state.drive.connectedAccountEmail ?? '-',
                  })}
                </p>
                <Link
                  to={appRoutes.changeAuthMethods}
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  {t('export.drive.changeAccountLink')}
                </Link>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {!driveReady ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary-tint"
                  disabled={isDrivePending || !isGoogleOauthConfigured}
                  onClick={() => {
                    connectDrive();
                  }}
                >
                  {t('export.drive.connect')}
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={!driveReady || isDrivePending}
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
