import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';

import { FormField } from '@/renderer/components/app/FormField';
import PasswordInput from '@/renderer/components/app/PasswordInput';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import usePendingGoogleAuthorizationUrl from '@/renderer/hooks/usePendingGoogleAuthorizationUrl';
import { isGoogleAuthorizationCanceled } from '@/renderer/lib/google-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

export default function LoginPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const hasGoogleAccount = useMemo(
    () => Boolean(runtime.state.drive.connectedAccountEmail),
    [runtime.state.drive.connectedAccountEmail],
  );
  const canUseGoogle =
    hasGoogleAccount && runtime.state.auth.googleAuthConfigured;
  const googleAuthorizationUrl = usePendingGoogleAuthorizationUrl({
    isPending: isGooglePending,
    api: runtime.api,
  });
  const googleDisabledReason = useMemo(() => {
    if (isGooglePending) {
      return t('common.disabledReasons.googlePending');
    }
    if (hasGoogleAccount) {
      return t('login.googleUnavailableHint');
    }

    return t('login.googleDisabledHint');
  }, [hasGoogleAccount, isGooglePending, t]);

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runtime.api) {
      return;
    }

    setPasswordError(null);

    if (!password.trim().length) {
      setPasswordError(t('login.validation.passwordRequired'));
      return;
    }

    setIsPasswordPending(true);

    try {
      await runtime.api.authenticateWithPassword({
        password: password.trim(),
        rememberMe,
      });
      await runtime.refresh();
      toast.success(t('login.feedback.passwordSuccess'));
    } catch {
      toast.error(
        t('login.feedback.passwordError'),
        t('login.feedback.passwordInvalid'),
      );
    } finally {
      setIsPasswordPending(false);
    }
  }

  async function handleGoogleLogin() {
    if (!runtime.api || !canUseGoogle) {
      return;
    }

    setIsGooglePending(true);

    try {
      await runtime.api.authenticateWithGoogle({ rememberMe });
      await runtime.refresh();
      toast.success(t('login.feedback.googleSuccess'));
    } catch (error) {
      if (isGoogleAuthorizationCanceled(error)) {
        return;
      }

      toast.error(
        t('login.feedback.googleError'),
        t('login.feedback.googleAccountMismatch'),
      );
    } finally {
      setIsGooglePending(false);
    }
  }

  async function handleCancelGoogleLogin() {
    if (!runtime.api) {
      return;
    }

    await runtime.api.cancelPendingGoogleAuthorization();
    setIsGooglePending(false);
  }

  return (
    <Card className="w-full max-w-xl border-primary-tint bg-white/95 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-text-color">
          {t('login.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handlePasswordLogin}>
          <FormField
            id="password"
            label={t('login.passwordLabel')}
            error={passwordError ?? undefined}
          >
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              showLabel={t('common.password.show')}
              hideLabel={t('common.password.hide')}
            />
          </FormField>
          <div className="flex items-center justify-between p-1">
            <label htmlFor="remember-me" className="text-sm text-text-color">
              {t('login.rememberMe')}
            </label>
            <Switch
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={setRememberMe}
            />
          </div>
          <Button
            type="submit"
            disabled={isPasswordPending}
            disabledReason={t('common.disabledReasons.passwordPending')}
            className="w-full bg-primary text-primary-contrast hover:bg-primary-shade"
          >
            {isPasswordPending
              ? t('common.loading')
              : t('login.passwordSubmit')}
          </Button>
        </form>
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-color">
            {t('login.googleTitle')}
          </p>
          <Button
            type="button"
            disabled={!canUseGoogle || isGooglePending}
            disabledReason={googleDisabledReason}
            variant="outline"
            className="w-full border-primary-tint text-text-color"
            onClick={() => {
              handleGoogleLogin();
            }}
          >
            <FaGoogle className="size-4" />
            {isGooglePending ? t('common.loading') : t('login.googleSubmit')}
          </Button>
          {googleAuthorizationUrl ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <a
                href={googleAuthorizationUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('common.googleAuth.manualLink')}
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-primary-tint"
                onClick={() => {
                  handleCancelGoogleLogin().catch(() => undefined);
                }}
              >
                {t('common.googleAuth.cancel')}
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
