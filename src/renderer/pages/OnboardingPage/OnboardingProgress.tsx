import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';
import {
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
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
  const completedCount = useMemo(
    () =>
      stepOrder.filter((stepId) => !remainingStepIds.includes(stepId)).length,
    [remainingStepIds, stepOrder],
  );
  const progress =
    stepOrder.length === 0
      ? 0
      : Math.round((completedCount / stepOrder.length) * 100);

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
      <div className="space-y-3">
        {stepOrder.map((stepId) => {
          const StepIcon = getStepIcon(stepId);
          const isActive = currentStepId === stepId;
          const isDone =
            skippedStepIds.includes(stepId) || !remainingStepIds.includes(stepId);
          const stateLabel = isDone
            ? t('onboarding.progress.stateDone')
            : isActive
              ? t('onboarding.progress.stateCurrent')
              : t('onboarding.progress.statePending');

          return (
            <div
              key={stepId}
              className={cn(
                'flex items-center justify-between gap-3 rounded-md border border-primary-tint/70 px-3 py-2',
                isActive ? 'bg-primary-tint/40' : 'bg-white',
              )}
            >
              <div className="flex items-center gap-2 text-sm text-text-color">
                {isDone ? (
                  <FiCheckCircle className="size-4 shrink-0 text-primary" />
                ) : (
                  <span className="inline-flex size-4 shrink-0 rounded-full border border-primary-tint" />
                )}
                <StepIcon
                  className={cn(
                    'size-4 shrink-0',
                    isActive ? 'text-primary-shade' : 'text-text-color/70',
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    isActive ? 'text-text-color' : 'text-text-color/80',
                  )}
                >
                  {t(`onboarding.steps.${stepId}.title`)}
                </span>
              </div>
              <span
                className={cn(
                  'text-xs',
                  isDone
                    ? 'text-primary-shade'
                    : isActive
                      ? 'text-text-color'
                      : 'text-text-color/65',
                )}
              >
                {stateLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
