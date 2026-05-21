import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiGithub, FiRefreshCw } from 'react-icons/fi';

import { Button } from '@/components/ui/button';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { formatGermanDateTime } from '@/renderer/lib/date-format';
import type { AppBuildInfo } from '@/shared/ipc/app-api';

const githubRepositoryUrl =
  'https://github.com/Simon-Lage/apprenticeship-reports';

export default function AppFooter() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [buildInfo, setBuildInfo] = useState<AppBuildInfo | null>(null);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const buildVersion = buildInfo?.version ?? '-';
  const updatedAtLabel =
    formatGermanDateTime(buildInfo?.updatedAt) || t('home.footer.unknownDate');

  const loadBuildInfo = useCallback(async () => {
    if (!runtime.api) {
      return;
    }

    try {
      const info = await runtime.api.getAppBuildInfo();
      setBuildInfo(info);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('home.footer.feedback.loadError'), message);
    }
  }, [runtime.api, t, toast]);

  const handleCheckForUpdates = useCallback(async () => {
    if (!runtime.api || isCheckingForUpdates) {
      return;
    }

    setIsCheckingForUpdates(true);

    try {
      const result = await runtime.api.checkForUpdates();
      if (!result.started) {
        const feedbackKey =
          result.unavailableReason === 'not-packaged'
            ? 'home.footer.feedback.updateCheckUnavailableInDev'
            : 'home.footer.feedback.updateCheckUnavailable';
        toast.info(t(feedbackKey));
        return;
      }

      if (result.status === 'update-not-available') {
        toast.info(t('home.footer.feedback.updateCheckNotAvailable'));
        return;
      }

      if (result.status === 'error') {
        toast.error(t('home.footer.feedback.updateCheckRetryLater'));
        return;
      }

      toast.info(t('home.footer.feedback.updatePreparing'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('home.footer.feedback.updateCheckRetryLater'), message);
    } finally {
      setIsCheckingForUpdates(false);
    }
  }, [isCheckingForUpdates, runtime.api, t, toast]);

  useEffect(() => {
    loadBuildInfo().catch(() => undefined);
  }, [loadBuildInfo]);

  useEffect(() => {
    if (!runtime.api) {
      return undefined;
    }

    return runtime.api.onUpdateCheckStatus((status) => {
      if (status === 'update-available') {
        toast.success(t('home.footer.feedback.updateFound'));
      }
    });
  }, [runtime.api, t, toast]);

  return (
    <footer className="shrink-0 border-t border-primary-tint/60 bg-white/70 px-4 py-2 backdrop-blur-sm lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-text-color/60">
        <span>{t('home.footer.version', { version: buildVersion })}</span>
        <a
          href={githubRepositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-text-color/75"
        >
          <FiGithub className="size-3.5" />
          <span>{t('home.footer.github')}</span>
        </a>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCheckForUpdates}
          disabled={!runtime.api || isCheckingForUpdates}
          disabledReason={
            isCheckingForUpdates
              ? t('common.disabledReasons.pending')
              : t('common.disabledReasons.runtimeUnavailable')
          }
          className="h-6 cursor-pointer px-2 text-[11px] text-text-color/60 hover:bg-primary/5 hover:text-text-color/75"
        >
          <FiRefreshCw
            className={`size-3 ${isCheckingForUpdates ? 'animate-spin' : ''}`}
          />
          {t('home.footer.checkUpdates')}
        </Button>
        <span>{t('home.footer.lastUpdated', { date: updatedAtLabel })}</span>
      </div>
    </footer>
  );
}
