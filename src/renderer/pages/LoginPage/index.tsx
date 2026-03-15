import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormField } from '@/renderer/components/app/FormField';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function LoginPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const canUseGoogle = useMemo(
    () => Boolean(runtime.state.drive.connectedAccountEmail),
    [runtime.state.drive.connectedAccountEmail],
  );

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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('login.feedback.passwordError'), message);
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
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('login.feedback.googleError'), message);
    } finally {
      setIsGooglePending(false);
    }
  }

  return (
    <Card className="w-full max-w-xl border-primary-tint bg-white/95 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-text-color">{t('login.title')}</CardTitle>
        <CardDescription className="text-text-color/75">
          {t('login.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-primary-tint bg-primary-tint/35">
          <AlertTitle>{t('login.securityTitle')}</AlertTitle>
          <AlertDescription>{t('login.securityDescription')}</AlertDescription>
        </Alert>
        <form className="space-y-4" onSubmit={handlePasswordLogin}>
          <FormField
            id="password"
            label={t('login.passwordLabel')}
            error={passwordError ?? undefined}
          >
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormField>
          <div className="flex items-center justify-between rounded-md border border-primary-tint/80 px-3 py-2">
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    type="button"
                    disabled={!canUseGoogle || isGooglePending}
                    variant="outline"
                    className="w-full border-primary-tint text-text-color"
                    onClick={() => {
                      void handleGoogleLogin();
                    }}
                  >
                    {isGooglePending
                      ? t('common.loading')
                      : t('login.googleSubmit')}
                  </Button>
                </div>
              </TooltipTrigger>
              {!canUseGoogle ? (
                <TooltipContent>{t('login.googleDisabledHint')}</TooltipContent>
              ) : null}
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
