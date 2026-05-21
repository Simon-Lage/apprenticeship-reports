import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';

import { FormField } from '@/renderer/components/app/FormField';
import PasswordInput from '@/renderer/components/app/PasswordInput';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import usePendingGoogleAuthorizationUrl from '@/renderer/hooks/usePendingGoogleAuthorizationUrl';
import { isGoogleAuthorizationCanceled } from '@/renderer/lib/google-auth';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type SensitiveAction = 'password-change' | 'google-connect';

export default function ChangeAuthMethodsPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [nextPassword, setNextPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState<
    string | null
  >(null);
  const [pendingSensitiveAction, setPendingSensitiveAction] =
    useState<SensitiveAction | null>(null);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [isGoogleRemoveConfirmOpen, setIsGoogleRemoveConfirmOpen] =
    useState(false);
  const isGoogleOauthConfigured = runtime.state.auth.googleAuthConfigured;
  const hasLinkedGoogleAccount = Boolean(
    runtime.state.drive.connectedAccountEmail,
  );
  const hasActiveGoogleSession =
    runtime.state.auth.provider === 'google' && hasLinkedGoogleAccount;
  const googleAuthorizationUrl = usePendingGoogleAuthorizationUrl({
    isPending: isGooglePending,
    api: runtime.api,
  });
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

    if (hasActiveGoogleSession) {
      setIsPasswordConfirmOpen(true);
      return;
    }

    requestCurrentPassword('password-change');
  }

  function requestCurrentPassword(action: SensitiveAction) {
    setPendingSensitiveAction(action);
    setCurrentPassword('');
    setCurrentPasswordError(null);
  }

  function closeCurrentPasswordDialog() {
    if (isPasswordPending || isGooglePending) {
      return;
    }

    setPendingSensitiveAction(null);
    setCurrentPassword('');
    setCurrentPasswordError(null);
  }

  async function confirmPasswordChange(verifiedCurrentPassword?: string) {
    if (!runtime.api) {
      return;
    }

    setIsPasswordPending(true);

    try {
      await runtime.api.changePassword({
        nextPassword: nextPassword.trim(),
        currentPassword: verifiedCurrentPassword,
      });
      setNextPassword('');
      setPasswordConfirm('');
      setValidationError(null);
      setPendingSensitiveAction(null);
      setCurrentPassword('');
      setCurrentPasswordError(null);
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
      if (isGoogleAuthorizationCanceled(error)) {
        return;
      }

      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('authMethods.feedback.googleError'), message);
    } finally {
      setIsGooglePending(false);
    }
  }

  async function confirmCurrentPassword() {
    if (!runtime.api || !pendingSensitiveAction) {
      return;
    }

    const password = currentPassword.trim();

    if (!password) {
      setCurrentPasswordError(t('authMethods.currentPassword.required'));
      return;
    }

    setCurrentPasswordError(null);

    if (pendingSensitiveAction === 'password-change') {
      await confirmPasswordChange(password);
      return;
    }

    setIsGooglePending(true);

    try {
      const isValid = await runtime.api.verifyPassword({ password });

      if (!isValid) {
        setCurrentPasswordError(t('authMethods.currentPassword.invalid'));
        return;
      }

      setPendingSensitiveAction(null);
      setCurrentPassword('');
      await handleGoogleConnect();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      setCurrentPasswordError(message);
    } finally {
      setIsGooglePending(false);
    }
  }

  async function handleCancelGoogleConnect() {
    if (!runtime.api) {
      return;
    }

    await runtime.api.cancelPendingGoogleAuthorization();
    setIsGooglePending(false);
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
      <SectionCard
        title={t('authMethods.password.title')}
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
            disabledReason={t('common.disabledReasons.passwordPending')}
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
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isPasswordPending}
              disabledReason={t('common.disabledReasons.passwordPending')}
            >
              {t('authMethods.confirm.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPasswordPending}
              disabledReason={t('common.disabledReasons.passwordPending')}
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
            <AlertDialogCancel
              disabled={isGooglePending}
              disabledReason={t('common.disabledReasons.googlePending')}
            >
              {t('authMethods.confirm.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isGooglePending}
              disabledReason={t('common.disabledReasons.googlePending')}
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
              disabledReason={
                isGooglePending
                  ? t('common.disabledReasons.googlePending')
                  : t('common.disabledReasons.googleOauthUnavailable')
              }
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                requestCurrentPassword('google-connect');
              }}
            >
              <FaGoogle className="size-4" />
              {googleButtonLabel}
            </Button>
            <Button
              type="button"
              disabled={isGooglePending || !hasLinkedGoogleAccount}
              disabledReason={
                isGooglePending
                  ? t('common.disabledReasons.googlePending')
                  : t('common.disabledReasons.googleAccountMissing')
              }
              variant="outline"
              className="border-primary-tint"
              onClick={() => {
                setIsGoogleRemoveConfirmOpen(true);
              }}
            >
              {t('authMethods.google.remove')}
            </Button>
          </div>
          {googleAuthorizationUrl ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                  handleCancelGoogleConnect().catch(() => undefined);
                }}
              >
                {t('common.googleAuth.cancel')}
              </Button>
            </div>
          ) : null}
          <Alert className="border-amber-300 bg-amber-50 text-amber-950">
            <AlertTitle>{t('authMethods.google.browserHintTitle')}</AlertTitle>
            <AlertDescription>
              {t('authMethods.google.browserHint')}
            </AlertDescription>
          </Alert>
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
      <Dialog
        open={Boolean(pendingSensitiveAction)}
        onOpenChange={(open) => {
          if (!open) {
            closeCurrentPasswordDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('authMethods.currentPassword.title')}</DialogTitle>
            <DialogDescription>
              {pendingSensitiveAction === 'google-connect'
                ? t('authMethods.currentPassword.googleDescription')
                : t('authMethods.currentPassword.passwordDescription')}
            </DialogDescription>
          </DialogHeader>
          <FormField
            id="current-password"
            label={t('authMethods.password.current')}
            error={currentPasswordError ?? undefined}
          >
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              showLabel={t('common.password.show')}
              hideLabel={t('common.password.hide')}
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPasswordPending || isGooglePending}
              disabledReason={t('common.disabledReasons.pending')}
              onClick={closeCurrentPasswordDialog}
            >
              {t('authMethods.confirm.cancel')}
            </Button>
            <Button
              type="button"
              disabled={isPasswordPending || isGooglePending}
              disabledReason={t('common.disabledReasons.pending')}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                confirmCurrentPassword();
              }}
            >
              {isPasswordPending || isGooglePending
                ? t('common.loading')
                : t('authMethods.currentPassword.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
