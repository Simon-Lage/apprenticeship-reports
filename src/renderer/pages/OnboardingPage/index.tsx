import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { FormField } from '@/renderer/components/app/FormField';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { JsonObject } from '@/shared/common/json';

type OnboardingStepId = 'identity' | 'training-period' | 'workplace';

const identitySchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

const trainingPeriodSchema = z
  .object({
    trainingStart: z.string().date(),
    trainingEnd: z.string().date(),
  })
  .superRefine((value, context) => {
    if (value.trainingEnd < value.trainingStart) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['trainingEnd'],
        message: 'invalid-range',
      });
    }
  });

const workplaceSchema = z.object({
  department: z.string().trim().max(120),
  trainerEmail: z
    .string()
    .trim()
    .max(320)
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'invalid-email',
    }),
  ihkLink: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => !value || z.string().url().safeParse(value).success, {
      message: 'invalid-url',
    }),
});

const stepOrder: OnboardingStepId[] = ['identity', 'training-period', 'workplace'];
const optionalSteps: OnboardingStepId[] = ['workplace'];

function parseStepValues(stepId: OnboardingStepId, value: unknown): JsonObject {
  if (stepId === 'identity') {
    return identitySchema.parse(value);
  }
  if (stepId === 'training-period') {
    return trainingPeriodSchema.parse(value);
  }
  return workplaceSchema.parse(value);
}

export default function OnboardingPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [rememberMe, setRememberMe] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [stepValues, setStepValues] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const hasPassword = runtime.state.auth.passwordConfigured;
  const stepSettings = useSettingsSnapshot(
    hasPassword && runtime.state.auth.isAuthenticated,
  );
  const currentStepId = useMemo<OnboardingStepId | null>(() => {
    const next = runtime.state.onboarding.nextStepId;
    if (!next) {
      return stepOrder[0] ?? null;
    }
    if (stepOrder.includes(next as OnboardingStepId)) {
      return next as OnboardingStepId;
    }
    return null;
  }, [runtime.state.onboarding.nextStepId]);

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
    let defaultValues: Record<string, string>;

    if (currentStepId === 'identity') {
      defaultValues = {
        firstName: typeof source.firstName === 'string' ? source.firstName : '',
        lastName: typeof source.lastName === 'string' ? source.lastName : '',
      };
    } else if (currentStepId === 'training-period') {
      defaultValues = {
        trainingStart:
          typeof source.trainingStart === 'string' ? source.trainingStart : '',
        trainingEnd: typeof source.trainingEnd === 'string' ? source.trainingEnd : '',
      };
    } else {
      defaultValues = {
        department: typeof source.department === 'string' ? source.department : '',
        trainerEmail:
          typeof source.trainerEmail === 'string' ? source.trainerEmail : '',
        ihkLink: typeof source.ihkLink === 'string' ? source.ihkLink : '',
      };
    }

    setStepValues(defaultValues);
  }, [currentStepId, stepSettings.value]);

  async function handlePasswordSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runtime.api) {
      return;
    }
    setValidationError(null);

    if (password.trim().length < 8) {
      setValidationError(t('onboarding.password.validationLength'));
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
        rememberMe,
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
      const parsed = parseStepValues(currentStepId, normalizedValues);
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
          setValidationError(t('onboarding.steps.trainingPeriod.validationRange'));
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

  if (!hasPassword) {
    return (
      <SectionCard
        title={t('onboarding.password.title')}
        description={t('onboarding.password.description')}
        className="w-full max-w-2xl border-primary-tint bg-white"
      >
        <form className="space-y-4" onSubmit={handlePasswordSetup}>
          <FormField
            id="onboarding-password"
            label={t('onboarding.password.passwordLabel')}
            error={validationError ?? undefined}
          >
            <Input
              id="onboarding-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormField>
          <FormField id="onboarding-password-confirm" label={t('onboarding.password.confirmLabel')}>
            <Input
              id="onboarding-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
            />
          </FormField>
          <div className="flex items-center justify-between rounded-md border border-primary-tint/80 px-3 py-2">
            <label htmlFor="onboarding-remember" className="text-sm text-text-color">
              {t('onboarding.password.rememberMe')}
            </label>
            <Switch
              id="onboarding-remember"
              checked={rememberMe}
              onCheckedChange={setRememberMe}
            />
          </div>
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
        <AlertDescription>{t('onboarding.completed.description')}</AlertDescription>
      </Alert>
    );
  }

  const isOptional = optionalSteps.includes(currentStepId);
  const completedStepIds = new Set(runtime.state.onboarding.skippedStepIds);

  return (
    <div className="w-full max-w-3xl space-y-5">
      <div className="flex flex-wrap gap-2">
        {stepOrder.map((stepId) => (
          <Badge
            key={stepId}
            className={
              currentStepId === stepId
                ? 'bg-primary text-primary-contrast'
                : completedStepIds.has(stepId) ||
                    !runtime.state.onboarding.remainingStepIds.includes(stepId)
                  ? 'bg-primary-tint text-text-color'
                  : 'bg-white text-text-color'
            }
          >
            {t(`onboarding.steps.${stepId}.title`)}
          </Badge>
        ))}
      </div>
      <SectionCard
        title={t(`onboarding.steps.${currentStepId}.title`)}
        description={t(`onboarding.steps.${currentStepId}.description`)}
        className="border-primary-tint bg-white"
      >
        <div className="space-y-4">
          {currentStepId === 'identity' ? (
            <>
              <FormField id="identity-first-name" label={t('onboarding.steps.identity.firstName')}>
                <Input
                  id="identity-first-name"
                  value={stepValues.firstName ?? ''}
                  onChange={(event) =>
                    setStepValues((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </FormField>
              <FormField id="identity-last-name" label={t('onboarding.steps.identity.lastName')}>
                <Input
                  id="identity-last-name"
                  value={stepValues.lastName ?? ''}
                  onChange={(event) =>
                    setStepValues((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </FormField>
            </>
          ) : null}
          {currentStepId === 'training-period' ? (
            <>
              <FormField id="training-start" label={t('onboarding.steps.trainingPeriod.start')}>
                <Input
                  id="training-start"
                  type="date"
                  value={stepValues.trainingStart ?? ''}
                  onChange={(event) =>
                    setStepValues((current) => ({ ...current, trainingStart: event.target.value }))
                  }
                />
              </FormField>
              <FormField id="training-end" label={t('onboarding.steps.trainingPeriod.end')}>
                <Input
                  id="training-end"
                  type="date"
                  value={stepValues.trainingEnd ?? ''}
                  onChange={(event) =>
                    setStepValues((current) => ({ ...current, trainingEnd: event.target.value }))
                  }
                />
              </FormField>
            </>
          ) : null}
          {currentStepId === 'workplace' ? (
            <>
              <FormField id="workplace-department" label={t('onboarding.steps.workplace.department')}>
                <Input
                  id="workplace-department"
                  value={stepValues.department ?? ''}
                  onChange={(event) =>
                    setStepValues((current) => ({ ...current, department: event.target.value }))
                  }
                />
              </FormField>
              <FormField id="workplace-email" label={t('onboarding.steps.workplace.trainerEmail')}>
                <Input
                  id="workplace-email"
                  type="email"
                  value={stepValues.trainerEmail ?? ''}
                  onChange={(event) =>
                    setStepValues((current) => ({ ...current, trainerEmail: event.target.value }))
                  }
                />
              </FormField>
              <FormField id="workplace-ihk" label={t('onboarding.steps.workplace.ihkLink')}>
                <Input
                  id="workplace-ihk"
                  type="url"
                  value={stepValues.ihkLink ?? ''}
                  onChange={(event) =>
                    setStepValues((current) => ({ ...current, ihkLink: event.target.value }))
                  }
                />
              </FormField>
            </>
          ) : null}
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
                void handleStepSave(false);
              }}
            >
              {t('onboarding.actions.saveDraft')}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                void handleStepSave(true);
              }}
            >
              {t('onboarding.actions.completeStep')}
            </Button>
            {isOptional ? (
              <Button
                type="button"
                disabled={isPending}
                variant="ghost"
                className="text-text-color"
                onClick={() => {
                  void handleSkipStep();
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
