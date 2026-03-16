import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';
import { FiHardDrive, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';

import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SetupDrivePage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [isPending, setIsPending] = useState(false);

  async function handleConnect() {
    if (!runtime.api) {
      return;
    }

    setIsPending(true);

    try {
      await runtime.api.connectGoogleDrive();
      await runtime.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('common.errors.unknown');
      toast.error(t('setupDrive.feedback.connectError'), message);
    } finally {
      setIsPending(false);
    }
  }

  const { missingScopes } = runtime.state.drive;
  const isOauthUnavailable = !runtime.state.auth.googleAuthConfigured;

  return (
    <Card className="w-full max-w-xl border-primary-tint bg-white/95 shadow-lg">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-3">
          <FiHardDrive className="size-6 text-primary" />
          <CardTitle className="text-2xl text-text-color">
            {t('setupDrive.title')}
          </CardTitle>
        </div>
        <CardDescription className="text-text-color/75">
          {t('setupDrive.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-primary-tint/60 bg-primary-tint/10">
          <FiAlertTriangle className="size-4 text-primary" />
          <AlertDescription className="text-text-color/80">
            {t('setupDrive.backupExplanation')}
          </AlertDescription>
        </Alert>

        {isOauthUnavailable ? (
          <Alert variant="destructive">
            <FiAlertCircle className="size-4" />
            <AlertTitle>{t('setupDrive.oauthUnavailableTitle')}</AlertTitle>
            <AlertDescription>
              {t('setupDrive.oauthUnavailableDescription')}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {missingScopes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-color">
                  {t('setupDrive.missingPermissions')}
                </p>
                <ul className="space-y-1 text-xs text-text-color/70">
                  {missingScopes.map((scope) => (
                    <li key={scope} className="font-mono">
                      {scope}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Button
              type="button"
              disabled={isPending}
              className="w-full bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                handleConnect();
              }}
            >
              <FaGoogle className="size-4" />
              {isPending ? t('common.loading') : t('setupDrive.connectButton')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
