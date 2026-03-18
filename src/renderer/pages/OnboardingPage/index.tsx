import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiKey } from 'react-icons/fi';
import { z } from 'zod';

import { SectionCard } from '@/renderer/components/app/SectionCard';
import PasswordInput from '@/renderer/components/app/PasswordInput';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
import { appRoutes } from '@/renderer/lib/app-routes';
import { hasSeenOnboardingWelcome } from '@/renderer/lib/onboarding-welcome';
import {
  evaluatePasswordRules,
  isPasswordStrong,
} from '@/renderer/pages/OnboardingPage/password-rules';
import OnboardingProgress from '@/renderer/pages/OnboardingPage/OnboardingProgress';
import OnboardingStepFields from '@/renderer/pages/OnboardingPage/OnboardingStepFields';
import {
  getOnboardingStepDefaults,
  onboardingStepOrder,
  OnboardingStepId,
  parseOnboardingStepValues,
} from '@/renderer/pages/OnboardingPage/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/renderer/components/app/FormField';
import { JsonObject } from '@/shared/common/json';

function isGoogleOauthMissingError(message: string): boolean {
  return message.includes('Google OAuth ist nicht konfiguriert');
}

export default function OnboardingPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [stepValues, setStepValues] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const hasPassword = runtime.state.auth.passwordConfigured;
  const stepSettings = useSettingsSnapshot(
    hasPassword && runtime.state.auth.isAuthenticated,
  );
  const activeStepOrder = useMemo<OnboardingStepId[]>(() => {
    const allowedStepIds = new Set(
      runtime.state.onboarding.activeStepIds.filter((stepId) =>
        onboardingStepOrder.includes(stepId as OnboardingStepId),
      ),
    );

    return onboardingStepOrder.filter((stepId) => allowedStepIds.has(stepId));
  }, [runtime.state.onboarding.activeStepIds]);
  const backendStepId = useMemo<OnboardingStepId | null>(() => {
    const next = runtime.state.onboarding.nextStepId;

    if (next && onboardingStepOrder.includes(next as OnboardingStepId)) {
      return next as OnboardingStepId;
    }

    const fallbackStepId =
      activeStepOrder.find((stepId) =>
        runtime.state.onboarding.remainingStepIds.includes(stepId),
      ) ?? null;

    if (fallbackStepId) {
      return fallbackStepId;
    }

    return runtime.state.onboarding.isComplete
      ? null
      : (activeStepOrder[0] ?? null);
  }, [
    activeStepOrder,
    runtime.state.onboarding.isComplete,
    runtime.state.onboarding.nextStepId,
    runtime.state.onboarding.remainingStepIds,
  ]);
  const [selectedStepId, setSelectedStepId] = useState<OnboardingStepId | null>(
    backendStepId,
  );
  const currentStepId = useMemo<OnboardingStepId | null>(() => {
    if (!selectedStepId) {
      return backendStepId;
    }

    return activeStepOrder.includes(selectedStepId)
      ? selectedStepId
      : backendStepId;
  }, [activeStepOrder, backendStepId, selectedStepId]);
  const passwordRules = useMemo(
    () => evaluatePasswordRules(password),
    [password],
  );
  const hasPasswordInput = password.trim().length > 0;
  const isPasswordRepeatValid =
    passwordConfirm.trim().length > 0 && password === passwordConfirm;
  const currentStepIndex = currentStepId
    ? activeStepOrder.indexOf(currentStepId)
    : -1;
  const canGoBack = currentStepIndex > 0;
  const isLastStep =
    currentStepIndex >= 0 && currentStepIndex === activeStepOrder.length - 1;
  const nextButtonLabel = useMemo(() => {
    if (isPending) {
      return t('common.loading');
    }

    if (isLastStep) {
      return t('onboarding.actions.finish');
    }

    return t('onboarding.actions.next');
  }, [isLastStep, isPending, t]);

  useEffect(() => {
    setSelectedStepId(backendStepId);
  }, [backendStepId]);

  useEffect(() => {
    if (!currentStepId || !stepSettings.value) {
      return;
    }

    const onboardingValues =
      typeof stepSettings.value.values.onboarding === 'object' &&
      stepSettings.value.values.onboarding
        ? (stepSettings.value.values.onboarding as JsonObject)
        : {};
    const existing = onboardingValues[currentStepId];
    const source =
      typeof existing === 'object' && existing ? (existing as JsonObject) : {};
    setStepValues(
      getOnboardingStepDefaults({
        stepId: currentStepId,
        source,
        authProvider: runtime.state.auth.provider,
      }),
    );
  }, [currentStepId, runtime.state.auth.provider, stepSettings.value]);

  useEffect(() => {
    setValidationError(null);
  }, [currentStepId]);

  async function handlePasswordSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runtime.api) {
      return;
    }

    setValidationError(null);

    if (!isPasswordStrong(password)) {
      setValidationError(t('onboarding.password.validationRules'));
      return;
    }

    if (password !== passwordConfirm) {
      setValidationError(t('onboarding.password.validationMatch'));
      return;
    }

    setIsPending(true);
    try {
      await runtime.api.initializePasswordAuth({
        password: password.trim(),
        rememberMe: true,
      });
      await runtime.refresh();
      toast.success(t('onboarding.feedback.passwordSetupSuccess'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('onboarding.feedback.passwordSetupError'), message);
    } finally {
      setIsPending(false);
    }
  }

  async function handleContinue() {
    if (!runtime.api || !currentStepId) {
      return;
    }

    setValidationError(null);
    const normalizedValues = Object.entries(stepValues).reduce<JsonObject>(
      (result, [key, value]) => {
        result[key] = value.trim();
        return result;
      },
      {},
    );

    try {
      const parsed = parseOnboardingStepValues(currentStepId, normalizedValues);
      setIsPending(true);
      await runtime.api.saveOnboardingDraft({
        stepId: currentStepId,
        values: parsed,
      });

      await runtime.api.completeOnboardingStep(currentStepId);

      await runtime.refresh();
      await stepSettings.refresh();
      if (isLastStep) {
        toast.success(t('onboarding.feedback.stepCompleted'));
      } else {
        const nextStepId = activeStepOrder[currentStepIndex + 1] ?? null;
        setSelectedStepId(nextStepId);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issue = error.issues[0];
        const code = typeof issue?.message === 'string' ? issue.message : '';
        if (code === 'invalid-range') {
          setValidationError(
            t('onboarding.steps.trainingPeriod.validationRange'),
          );
        } else if (code === 'invalid-reports-since-range') {
          setValidationError(
            t('onboarding.steps.trainingPeriod.validationReportsSinceRange'),
          );
        } else if (code === 'invalid-subdivision') {
          setValidationError(
            t('onboarding.steps.region.validationSubdivision'),
          );
        } else if (code === 'invalid-apprentice-identifier') {
          setValidationError(
            t('onboarding.steps.identity.validationApprenticeIdentifier'),
          );
        } else if (code === 'required-department') {
          setValidationError(
            t('onboarding.steps.workplace.validationDepartmentRequired'),
          );
        } else if (code === 'required-trainer-email') {
          setValidationError(
            t('onboarding.steps.workplace.validationTrainerEmailRequired'),
          );
        } else if (code === 'invalid-email') {
          setValidationError(t('onboarding.steps.workplace.validationEmail'));
        } else if (code === 'invalid-url') {
          setValidationError(t('onboarding.steps.workplace.validationUrl'));
        } else {
          setValidationError(t('onboarding.validation.generic'));
        }
      } else {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('onboarding.feedback.stepError'), message);
      }
    } finally {
      setIsPending(false);
    }
  }

  async function handleGoogleConnect() {
    if (!runtime.api || !currentStepId || currentStepId !== 'google') {
      return;
    }

    setValidationError(null);
    setIsPending(true);

    try {
      const bootstrapAfterGoogle = await runtime.api.authenticateWithGoogle({
        rememberMe: true,
      });
      await runtime.api.saveOnboardingDraft({
        stepId: 'google',
        values: {
          linked: true,
          email:
            bootstrapAfterGoogle.drive.connectedAccountEmail ??
            (stepValues.email?.trim() || null),
        },
      });
      await runtime.api.completeOnboardingStep('google');
      setStepValues((current) => ({
        ...current,
        linked: 'true',
        email: bootstrapAfterGoogle.drive.connectedAccountEmail ?? '',
      }));
      await runtime.refresh();
      await stepSettings.refresh();
      const googleStepIndex = activeStepOrder.indexOf('google');
      if (
        googleStepIndex >= 0 &&
        googleStepIndex < activeStepOrder.length - 1
      ) {
        setSelectedStepId(activeStepOrder[googleStepIndex + 1] ?? null);
      }
      toast.success(t('onboarding.feedback.googleLinked'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');

      if (isGoogleOauthMissingError(message)) {
        setValidationError(t('onboarding.steps.google.unavailableDescription'));
      } else {
        toast.error(t('onboarding.feedback.stepError'), message);
      }
    } finally {
      setIsPending(false);
    }
  }

  if (!hasPassword) {
    if (!hasSeenOnboardingWelcome()) {
      return <Navigate to={appRoutes.welcome} replace />;
    }

    return (
      <SectionCard
        title={t('onboarding.password.title')}
        className="w-full max-w-2xl border-primary-tint bg-white"
        titleClassName="text-xl md:text-2xl"
      >
        <form className="space-y-4" onSubmit={handlePasswordSetup}>
          <FormField
            id="onboarding-password"
            label={t('onboarding.password.passwordLabel')}
            error={validationError ?? undefined}
          >
            <PasswordInput
              id="onboarding-password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              showLabel={t('common.password.show')}
              hideLabel={t('common.password.hide')}
            />
          </FormField>
          <FormField
            id="onboarding-password-confirm"
            label={t('onboarding.password.confirmLabel')}
          >
            <PasswordInput
              id="onboarding-password-confirm"
              autoComplete="new-password"
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
            disabled={isPending}
            className="w-full bg-primary text-primary-contrast hover:bg-primary-shade"
          >
            <FiKey className="size-4" />
            {isPending ? t('common.loading') : t('onboarding.password.submit')}
          </Button>
        </form>
      </SectionCard>
    );
  }

  if (!currentStepId) {
    return (
      <Alert className="w-full max-w-3xl border-primary-tint bg-primary-tint/35">
        <AlertTitle>{t('onboarding.completed.title')}</AlertTitle>
        <AlertDescription>
          {t('onboarding.completed.description')}
        </AlertDescription>
      </Alert>
    );
  }

  const { remainingStepIds, skippedStepIds } = runtime.state.onboarding;

  return (
    <div className="w-full space-y-5">
      <div className="mx-auto w-full max-w-6xl">
        <OnboardingProgress
          currentStepId={currentStepId}
          stepOrder={activeStepOrder}
          remainingStepIds={remainingStepIds}
          skippedStepIds={skippedStepIds}
          isPending={isPending}
          onSelectStep={(stepId) => {
            setValidationError(null);
            setSelectedStepId(stepId);
          }}
        />
      </div>
      <div className="mx-auto w-full max-w-3xl">
        <SectionCard
          title={t(`onboarding.steps.${currentStepId}.title`)}
          description={t(`onboarding.steps.${currentStepId}.description`)}
          className="border-primary-tint bg-white"
          titleClassName="text-xl md:text-2xl"
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleContinue();
            }}
          >
            <OnboardingStepFields
              stepId={currentStepId}
              stepValues={stepValues}
              setStepValues={setStepValues}
              isPending={isPending}
              isGoogleOauthConfigured={runtime.state.auth.googleAuthConfigured}
              onConnectGoogle={() => {
                handleGoogleConnect();
              }}
            />
            {validationError ? (
              <Alert variant="destructive">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex w-full items-center justify-between gap-2">
              {canGoBack ? (
                <Button
                  type="button"
                  disabled={isPending}
                  variant="outline"
                  className="border-primary-tint"
                  onClick={() => {
                    const previousStepId =
                      activeStepOrder[currentStepIndex - 1];
                    setSelectedStepId(previousStepId ?? null);
                  }}
                >
                  {t('onboarding.actions.back')}
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="submit"
                disabled={isPending}
                className="ml-auto bg-primary text-primary-contrast hover:bg-primary-shade"
              >
                {nextButtonLabel}
              </Button>
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
