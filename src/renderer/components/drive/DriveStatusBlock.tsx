import { useTranslation } from 'react-i18next';
import { FaGoogleDrive } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { appRoutes } from '@/renderer/lib/app-routes';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type DriveStatusBlockProps = {
  driveReady: boolean;
  isGoogleOauthConfigured: boolean;
  connectedAccountEmail: string | null;
  isPending: boolean;
  onConnect: () => void;
};

export default function DriveStatusBlock({
  driveReady,
  isGoogleOauthConfigured,
  connectedAccountEmail,
  isPending,
  onConnect,
}: DriveStatusBlockProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <Badge className="w-fit bg-primary text-primary-contrast">
        {driveReady ? t('export.drive.ready') : t('export.drive.notReady')}
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
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-text-color/85">
            {t('export.drive.connectedAccount', {
              email: connectedAccountEmail ?? '-',
            })}
          </p>
          <Link
            to={appRoutes.changeAuthMethods}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            {t('export.drive.changeAccountLink')}
          </Link>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-fit border-primary-tint"
          disabled={isPending || !isGoogleOauthConfigured}
          disabledReason={
            isPending
              ? t('common.disabledReasons.pending')
              : t('common.disabledReasons.googleOauthUnavailable')
          }
          onClick={onConnect}
        >
          <FaGoogleDrive />
          {t('export.drive.connect')}
        </Button>
      )}
    </div>
  );
}
