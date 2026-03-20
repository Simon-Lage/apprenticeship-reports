import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';

import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import PasswordInput from '@/renderer/components/app/PasswordInput';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import {
  evaluatePasswordRules,
  isPasswordStrong,
} from '@/renderer/pages/OnboardingPage/password-rules';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ChangeAuthMethodsPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [nextPassword, setNextPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [isGoogleRemoveConfirmOpen, setIsGoogleRemoveConfirmOpen] =
    useState(false);
  const isGoogleOauthConfigured = runtime.state.auth.googleAuthConfigured;
  const hasLinkedGoogleAccount = Boolean(
    runtime.state.drive.connectedAccountEmail,
  );
  const passwordRules = useMemo(
    () => evaluatePasswordRules(nextPassword),
    [nextPassword],
  );
  const hasPasswordInput = nextPassword.trim().length > 0;
  const isPasswordRepeatValid =
    passwordConfirm.trim().length > 0 && nextPassword === passwordConfirm;
  let googleButtonLabel = t('authMethods.google.connect');
  if (isGooglePending) {
    googleButtonLabel = t('common.loading');
  } else if (hasLinkedGoogleAccount) {
    googleButtonLabel = t('authMethods.google.switch');
  }

  function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runtime.api) {
      return;
    }

    setValidationError(null);

    if (!isPasswordStrong(nextPassword)) {
      setValidationError(t('onboarding.password.validationRules'));
      return;
    }

    if (nextPassword !== passwordConfirm) {
      setValidationError(t('onboarding.password.validationMatch'));
      return;
    }

    setIsPasswordConfirmOpen(true);
  }

  async function confirmPasswordChange() {
    if (!runtime.api) {
      return;
    }

    setIsPasswordPending(true);

    try {
      await runtime.api.changePassword({
        nextPassword: nextPassword.trim(),
      });
      setNextPassword('');
      setPasswordConfirm('');
      setValidationError(null);
      await runtime.refresh();
      setIsPasswordConfirmOpen(false);
      toast.success(t('authMethods.feedback.passwordChanged'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('authMethods.feedback.passwordError'), message);
    } finally {
      setIsPasswordPending(false);
    }
  }

  async function handleGoogleConnect() {
    if (!runtime.api) {
      return;
    }

    setIsGooglePending(true);

    try {
      await runtime.api.authenticateWithGoogle({ rememberMe: true });
      await runtime.refresh();
      toast.success(t('authMethods.feedback.googleLinked'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('authMethods.feedback.googleError'), message);
    } finally {
      setIsGooglePending(false);
    }
  }

  async function handleGoogleRemove() {
    if (!runtime.api) {
      return;
    }

    setIsGooglePending(true);

    try {
      await runtime.api.clearGoogleSession();
      await runtime.refresh();
      setIsGoogleRemoveConfirmOpen(false);
      toast.info(t('authMethods.feedback.googleRemoved'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('authMethods.feedback.googleError'), message);
    } finally {
      setIsGooglePending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('authMethods.title')}
        description={t('authMethods.description')}
      />
      <SectionCard
        title={t('authMethods.password.title')}
        description={t('authMethods.password.description')}
        className="border-primary-tint bg-white"
      >
        <form className="space-y-4" onSubmit={handlePasswordChange}>
          <FormField
            id="next-password"
            label={t('onboarding.password.passwordLabel')}
            error={validationError ?? undefined}
          >
            <PasswordInput
              id="next-password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              showLabel={t('common.password.show')}
              hideLabel={t('common.password.hide')}
            />
          </FormField>
          <FormField
            id="password-confirm"
            label={t('onboarding.password.confirmLabel')}
          >
            <PasswordInput
              id="password-confirm"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              showLabel={t('common.password.show')}
              hideLabel={t('common.password.hide')}
            />
          </FormField>
          <ul className="space-y-1 text-xs leading-5">
            {passwordRules.map((rule) => (
              <li
                key={rule.id}
                className={[
                  !hasPasswordInput ? 'text-primary-tint' : '',
                  hasPasswordInput && rule.isValid ? 'text-text-color/70' : '',
                  hasPasswordInput && !rule.isValid ? 'text-red-600' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span>{t(`onboarding.password.rules.${rule.id}`)}</span>
              </li>
            ))}
            <li
              className={[
                !hasPasswordInput ? 'text-primary-tint' : '',
                hasPasswordInput && isPasswordRepeatValid
                  ? 'text-text-color/70'
                  : '',
                hasPasswordInput && !isPasswordRepeatValid
                  ? 'text-red-600'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {t('onboarding.password.rules.repeatMatches')}
            </li>
          </ul>
          <Button
            type="submit"
            disabled={isPasswordPending}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
          >
            {isPasswordPending
              ? t('common.loading')
              : t('authMethods.password.submit')}
          </Button>
        </form>
      </SectionCard>
      <AlertDialog
        open={isPasswordConfirmOpen}
        onOpenChange={setIsPasswordConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('authMethods.confirm.password.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('authMethods.confirm.password.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPasswordPending}>
              {t('authMethods.confirm.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPasswordPending}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={(event) => {
                event.preventDefault();
                confirmPasswordChange();
              }}
            >
              {isPasswordPending
                ? t('common.loading')
                : t('authMethods.confirm.password.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={isGoogleRemoveConfirmOpen}
        onOpenChange={setIsGoogleRemoveConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('authMethods.confirm.googleRemove.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('authMethods.confirm.googleRemove.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGooglePending}>
              {t('authMethods.confirm.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isGooglePending}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={(event) => {
                event.preventDefault();
                handleGoogleRemove();
              }}
            >
              {isGooglePending
                ? t('common.loading')
                : t('authMethods.confirm.googleRemove.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SectionCard
        title={t('authMethods.google.title')}
        description={t('authMethods.google.description')}
        className="border-primary-tint bg-white"
      >
        <div className="space-y-4">
          <Badge className="bg-primary text-primary-contrast">
            {hasLinkedGoogleAccount
              ? runtime.state.drive.connectedAccountEmail
              : t('authMethods.google.notLinked')}
          </Badge>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={isGooglePending || !isGoogleOauthConfigured}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                handleGoogleConnect();
              }}
            >
              <FaGoogle className="size-4" />
              {googleButtonLabel}
            </Button>
            <Button
              type="button"
              disabled={isGooglePending || !hasLinkedGoogleAccount}
              variant="outline"
              className="border-primary-tint"
              onClick={() => {
                setIsGoogleRemoveConfirmOpen(true);
              }}
            >
              {t('authMethods.google.remove')}
            </Button>
          </div>
          <p className="text-sm text-text-color/75">
            {t('authMethods.google.browserHint')}
          </p>
          {!isGoogleOauthConfigured ? (
            <Alert className="border-primary-tint bg-primary-tint/30">
              <AlertTitle>{t('authMethods.google.title')}</AlertTitle>
              <AlertDescription>
                {t('authMethods.google.unavailable')}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
