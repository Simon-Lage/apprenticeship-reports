import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuthActions } from '../../hooks/useAuthActions';

export default function SetupGooglePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { linkGoogle } = useAuthActions();
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const getErrorKey = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '';
    if (message.includes('token_exchange_failed:')) {
      return 'setupGoogle.errors.exchangeFailed';
    }
    if (message.includes('client_id_missing')) {
      return 'setupGoogle.errors.missingClientId';
    }
    if (message.includes('not_authenticated')) {
      return 'setupGoogle.errors.notAuthenticated';
    }
    if (message.includes('google_account_mismatch')) {
      return 'setupGoogle.errors.accountMismatch';
    }
    if (message.includes('timeout')) {
      return 'setupGoogle.errors.timeout';
    }
    if (message.includes('id_token_missing') || message.includes('invalid_id_token')) {
      return 'setupGoogle.errors.invalidToken';
    }
    return 'setupGoogle.errors.generic';
  };

  const getErrorDetails = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '';
    if (!message.includes('token_exchange_failed:')) {
      return null;
    }
    const details = message.split('token_exchange_failed:')[1]?.trim();
    return details || null;
  };

  const handleLink = async () => {
    setLoading(true);
    setErrorKey(null);
    setErrorDetails(null);
    try {
      await linkGoogle();
      navigate('/welcome/onboarding');
    } catch (error) {
      setErrorKey(getErrorKey(error));
      setErrorDetails(getErrorDetails(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/welcome/onboarding');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="text-lg font-semibold">{t('setupGoogle.title')}</div>
        <div className="text-sm text-muted-foreground">
          {t('setupGoogle.description')}
        </div>
        <div className="text-sm text-muted-foreground">
          {t('setupGoogle.reminder')}
        </div>
      </div>

      {errorKey ? (
        <div className="flex flex-col gap-1 text-sm text-destructive">
          <div>{t(errorKey)}</div>
          {errorDetails ? (
            <div className="text-xs text-destructive/80">
              {t('setupGoogle.errors.details', { details: errorDetails })}
            </div>
          ) : null}
        </div>
      ) : null}
      {loading ? (
        <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
          <div className="flex flex-col gap-1">
            <div>{t('setupGoogle.loading.title')}</div>
            <div>{t('setupGoogle.loading.description')}</div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button onClick={handleLink} disabled={loading}>
          {t('setupGoogle.link')}
        </Button>
        <Button type="button" variant="outline" onClick={handleSkip} disabled={loading}>
          {t('setupGoogle.skip')}
        </Button>
      </div>
    </div>
  );
}
