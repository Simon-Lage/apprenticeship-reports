import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';
import {
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiCircle,
  FiUser,
} from 'react-icons/fi';

import { OnboardingStepId } from '@/renderer/pages/OnboardingPage/schema';
import { cn } from '@/renderer/lib/utils';

type OnboardingProgressProps = {
  currentStepId: OnboardingStepId;
  stepOrder: OnboardingStepId[];
  remainingStepIds: string[];
  skippedStepIds: string[];
};

function getStepIcon(stepId: OnboardingStepId) {
  if (stepId === 'google') {
    return FaGoogle;
  }
  if (stepId === 'identity') {
    return FiUser;
  }
  if (stepId === 'training-period') {
    return FiCalendar;
  }
  return FiBriefcase;
}

export default function OnboardingProgress({
  currentStepId,
  stepOrder,
  remainingStepIds,
  skippedStepIds,
}: OnboardingProgressProps) {
  const { t } = useTranslation();
  const completedStepIds = useMemo(
    () => new Set(skippedStepIds),
    [skippedStepIds],
  );
  const completedCount = useMemo(
    () =>
      stepOrder.filter((stepId) => !remainingStepIds.includes(stepId)).length,
    [remainingStepIds, stepOrder],
  );
  const progress = Math.round((completedCount / stepOrder.length) * 100);

  return (
    <div className="space-y-4 rounded-xl border border-primary-tint bg-white p-4">
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium text-text-color">
          {t('onboarding.progress.title')}
        </p>
        <p className="text-text-color/75">
          {t('onboarding.progress.counter', {
            done: completedCount,
            total: stepOrder.length,
          })}
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary-tint/60">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {stepOrder.map((stepId) => {
          const StepIcon = getStepIcon(stepId);
          const isActive = currentStepId === stepId;
          const isDone =
            completedStepIds.has(stepId) || !remainingStepIds.includes(stepId);
          let stepClasses =
            'border-primary-tint/70 bg-white text-text-color/80';

          if (isDone) {
            stepClasses =
              'border-primary-tint bg-primary-tint/35 text-text-color';
          }

          if (isActive) {
            stepClasses = 'border-primary bg-primary text-primary-contrast';
          }

          return (
            <div
              key={stepId}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                stepClasses,
              )}
            >
              {isDone ? (
                <FiCheckCircle className="size-4 shrink-0" />
              ) : (
                <FiCircle className="size-4 shrink-0" />
              )}
              <StepIcon className="size-4 shrink-0" />
              <span>{t(`onboarding.steps.${stepId}.title`)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
