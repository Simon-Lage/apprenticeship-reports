import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';

import { FormField } from '@/renderer/components/app/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OnboardingStepId } from '@/renderer/pages/OnboardingPage/schema';

type OnboardingStepFieldsProps = {
  stepId: OnboardingStepId;
  stepValues: Record<string, string>;
  setStepValues: Dispatch<SetStateAction<Record<string, string>>>;
  isPending: boolean;
  googleEmail: string | null;
  onConnectGoogle: () => void;
};

export default function OnboardingStepFields({
  stepId,
  stepValues,
  setStepValues,
  isPending,
  googleEmail,
  onConnectGoogle,
}: OnboardingStepFieldsProps) {
  const { t } = useTranslation();

  if (stepId === 'identity') {
    return (
      <>
        <FormField
          id="identity-first-name"
          label={t('onboarding.steps.identity.firstName')}
        >
          <Input
            id="identity-first-name"
            value={stepValues.firstName ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          id="identity-last-name"
          label={t('onboarding.steps.identity.lastName')}
        >
          <Input
            id="identity-last-name"
            value={stepValues.lastName ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
          />
        </FormField>
      </>
    );
  }

  if (stepId === 'training-period') {
    return (
      <>
        <FormField
          id="training-start"
          label={t('onboarding.steps.trainingPeriod.start')}
        >
          <Input
            id="training-start"
            type="date"
            value={stepValues.trainingStart ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                trainingStart: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          id="training-end"
          label={t('onboarding.steps.trainingPeriod.end')}
        >
          <Input
            id="training-end"
            type="date"
            value={stepValues.trainingEnd ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                trainingEnd: event.target.value,
              }))
            }
          />
        </FormField>
      </>
    );
  }

  if (stepId === 'workplace') {
    return (
      <>
        <FormField
          id="workplace-department"
          label={t('onboarding.steps.workplace.department')}
        >
          <Input
            id="workplace-department"
            value={stepValues.department ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                department: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          id="workplace-email"
          label={t('onboarding.steps.workplace.trainerEmail')}
        >
          <Input
            id="workplace-email"
            type="email"
            value={stepValues.trainerEmail ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                trainerEmail: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField
          id="workplace-ihk"
          label={t('onboarding.steps.workplace.ihkLink')}
        >
          <Input
            id="workplace-ihk"
            type="url"
            value={stepValues.ihkLink ?? ''}
            onChange={(event) =>
              setStepValues((current) => ({
                ...current,
                ihkLink: event.target.value,
              }))
            }
          />
        </FormField>
      </>
    );
  }

  return (
    <>
      <Alert className="border-primary-tint bg-primary-tint/30">
        <AlertTitle>{t('onboarding.steps.google.statusTitle')}</AlertTitle>
        <AlertDescription>
          {stepValues.linked === 'true'
            ? t('onboarding.steps.google.statusLinked', {
                email: googleEmail ?? t('onboarding.steps.google.noEmail'),
              })
            : t('onboarding.steps.google.statusNotLinked')}
        </AlertDescription>
      </Alert>
      <p className="text-sm text-text-color/75">
        {t('onboarding.steps.google.browserHint')}
      </p>
      <Button
        type="button"
        disabled={isPending}
        className="bg-primary text-primary-contrast hover:bg-primary-shade"
        onClick={onConnectGoogle}
      >
        <FaGoogle className="size-4" />
        {t('onboarding.steps.google.connect')}
      </Button>
    </>
  );
}
