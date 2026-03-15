import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';

import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import PasswordInput from '@/renderer/components/app/PasswordInput';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ChangeAuthMethodsPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runtime.api) {
      return;
    }

    if (!currentPassword.trim().length || !nextPassword.trim().length) {
      toast.error(t('authMethods.feedback.passwordFieldsRequired'));
      return;
    }

    setIsPasswordPending(true);

    try {
      await runtime.api.changePassword({
        currentPassword: currentPassword.trim(),
        nextPassword: nextPassword.trim(),
      });
      setCurrentPassword('');
      setNextPassword('');
      await runtime.refresh();
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
            id="current-password"
            label={t('authMethods.password.current')}
          >
            <PasswordInput
              id="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              showLabel={t('common.password.show')}
              hideLabel={t('common.password.hide')}
            />
          </FormField>
          <FormField id="next-password" label={t('authMethods.password.next')}>
            <PasswordInput
              id="next-password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              showLabel={t('common.password.show')}
              hideLabel={t('common.password.hide')}
            />
          </FormField>
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
      <SectionCard
        title={t('authMethods.google.title')}
        description={t('authMethods.google.description')}
        className="border-primary-tint bg-white"
      >
        <div className="space-y-4">
          <Badge className="bg-primary-tint text-text-color">
            {runtime.state.drive.connectedAccountEmail
              ? runtime.state.drive.connectedAccountEmail
              : t('authMethods.google.notLinked')}
          </Badge>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={isGooglePending}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                handleGoogleConnect();
              }}
            >
              <FaGoogle className="size-4" />
              {isGooglePending
                ? t('common.loading')
                : t('authMethods.google.connect')}
            </Button>
            <Button
              type="button"
              disabled={
                isGooglePending || !runtime.state.drive.connectedAccountEmail
              }
              variant="outline"
              className="border-primary-tint"
              onClick={() => {
                handleGoogleRemove();
              }}
            >
              {t('authMethods.google.remove')}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
