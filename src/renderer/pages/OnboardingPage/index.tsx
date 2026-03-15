import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiLock, FiXCircle } from 'react-icons/fi';
import { z } from 'zod';

import { SectionCard } from '@/renderer/components/app/SectionCard';
import PasswordInput from '@/renderer/components/app/PasswordInput';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
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
  optionalOnboardingSteps,
  parseOnboardingStepValues,
} from '@/renderer/pages/OnboardingPage/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/renderer/components/app/FormField';
import { JsonObject } from '@/shared/common/json';

const welcomeStorageKey = 'apprenticeship-reports.onboarding.welcome-seen.v1';

function readWelcomeSeen(): boolean {
  try {
    return window.localStorage.getItem(welcomeStorageKey) === 'true';
  } catch {
    return false;
  }
}

function persistWelcomeSeen(): void {
  try {
    window.localStorage.setItem(welcomeStorageKey, 'true');
  } catch {
    return;
  }
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
  const [welcomeSeen, setWelcomeSeen] = useState(() => readWelcomeSeen());
  const hasPassword = runtime.state.auth.passwordConfigured;
  const stepSettings = useSettingsSnapshot(
    hasPassword && runtime.state.auth.isAuthenticated,
  );
  const currentStepId = useMemo<OnboardingStepId | null>(() => {
    const next = runtime.state.onboarding.nextStepId;
    if (!next) {
      return onboardingStepOrder[0] ?? null;
    }
    if (onboardingStepOrder.includes(next as OnboardingStepId)) {
      return next as OnboardingStepId;
    }
    return null;
  }, [runtime.state.onboarding.nextStepId]);
  const passwordRules = useMemo(
    () => evaluatePasswordRules(password),
    [password],
  );

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

  async function handleStepSave(completeStep: boolean) {
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

      if (completeStep) {
        await runtime.api.completeOnboardingStep(currentStepId);
      }

      await runtime.refresh();
      await stepSettings.refresh();
      toast.success(
        completeStep
          ? t('onboarding.feedback.stepCompleted')
          : t('onboarding.feedback.stepSaved'),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issue = error.issues[0];
        const code = typeof issue?.message === 'string' ? issue.message : '';
        if (code === 'invalid-range') {
          setValidationError(
            t('onboarding.steps.trainingPeriod.validationRange'),
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

  async function handleSkipStep() {
    if (!runtime.api || !currentStepId) {
      return;
    }

    setIsPending(true);
    try {
      await runtime.api.skipOnboardingStep(currentStepId);
      await runtime.refresh();
      await stepSettings.refresh();
      toast.info(t('onboarding.feedback.stepSkipped'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('onboarding.feedback.stepError'), message);
    } finally {
      setIsPending(false);
    }
  }

  async function handleGoogleConnect() {
    if (!runtime.api) {
      return;
    }

    setIsPending(true);
    try {
      await runtime.api.authenticateWithGoogle({ rememberMe: true });
      setStepValues((current) => ({
        ...current,
        linked: 'true',
      }));
      await runtime.refresh();
      toast.success(t('onboarding.feedback.googleLinked'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('onboarding.feedback.stepError'), message);
    } finally {
      setIsPending(false);
    }
  }

  if (!hasPassword && !welcomeSeen) {
    return (
      <SectionCard
        title={t('onboarding.welcome.title')}
        description={t('onboarding.welcome.description')}
        className="w-full max-w-2xl border-primary-tint bg-white"
      >
        <div className="space-y-6">
          <div className="rounded-md border border-primary-tint/80 bg-primary-tint/25 p-4 text-sm text-text-color/85">
            {t('onboarding.welcome.hint')}
          </div>
          <Button
            type="button"
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={() => {
              persistWelcomeSeen();
              setWelcomeSeen(true);
            }}
          >
            {t('onboarding.welcome.start')}
          </Button>
        </div>
      </SectionCard>
    );
  }

  if (!hasPassword) {
    return (
      <SectionCard
        title={t('onboarding.password.title')}
        className="w-full max-w-2xl border-primary-tint bg-white"
      >
        <form className="space-y-4" onSubmit={handlePasswordSetup}>
          <div className="flex items-center gap-2 rounded-md border border-primary-tint/80 bg-primary-tint/25 px-3 py-2 text-sm text-text-color">
            <FiLock className="size-4" />
            <span>{t('onboarding.password.requirementsTitle')}</span>
          </div>
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
          <ul className="space-y-2 rounded-md border border-primary-tint/80 bg-primary-tint/15 p-3 text-sm">
            {passwordRules.map((rule) => (
              <li
                key={rule.id}
                className={`flex items-center gap-2 ${
                  rule.isValid ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {rule.isValid ? (
                  <FiCheckCircle className="size-4 shrink-0" />
                ) : (
                  <FiXCircle className="size-4 shrink-0" />
                )}
                <span>{t(`onboarding.password.rules.${rule.id}`)}</span>
              </li>
            ))}
          </ul>
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary text-primary-contrast hover:bg-primary-shade"
          >
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
  const isOptional = optionalOnboardingSteps.includes(currentStepId);

  return (
    <div className="w-full max-w-3xl space-y-5">
      <OnboardingProgress
        currentStepId={currentStepId}
        stepOrder={onboardingStepOrder}
        remainingStepIds={remainingStepIds}
        skippedStepIds={skippedStepIds}
      />
      <SectionCard
        title={t(`onboarding.steps.${currentStepId}.title`)}
        description={t(`onboarding.steps.${currentStepId}.description`)}
        className="border-primary-tint bg-white"
      >
        <div className="space-y-4">
          <OnboardingStepFields
            stepId={currentStepId}
            stepValues={stepValues}
            setStepValues={setStepValues}
            isPending={isPending}
            googleEmail={runtime.state.drive.connectedAccountEmail}
            onConnectGoogle={() => {
              handleGoogleConnect();
            }}
          />
          {validationError ? (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={isPending}
              variant="outline"
              className="border-primary-tint"
              onClick={() => {
                handleStepSave(false);
              }}
            >
              {t('onboarding.actions.saveDraft')}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                handleStepSave(true);
              }}
            >
              {t('onboarding.actions.completeStep')}
            </Button>
            {isOptional ? (
              <Button
                type="button"
                disabled={isPending}
                variant="outline"
                className="border-primary-tint"
                onClick={() => {
                  handleSkipStep();
                }}
              >
                {t('onboarding.actions.skipStep')}
              </Button>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
