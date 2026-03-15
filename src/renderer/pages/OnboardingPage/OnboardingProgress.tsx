import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';
import {
  FiBriefcase,
  FiCalendar,
  FiChevronRight,
  FiCheckCircle,
  FiMapPin,
  FiUser,
} from 'react-icons/fi';

import { OnboardingStepId } from '@/renderer/pages/OnboardingPage/schema';
import { cn } from '@/renderer/lib/utils';

type OnboardingProgressProps = {
  currentStepId: OnboardingStepId;
  stepOrder: OnboardingStepId[];
  remainingStepIds: string[];
  skippedStepIds: string[];
  isPending: boolean;
  onSelectStep: (stepId: OnboardingStepId) => void;
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
  if (stepId === 'region') {
    return FiMapPin;
  }
  return FiBriefcase;
}

export default function OnboardingProgress({
  currentStepId,
  stepOrder,
  remainingStepIds,
  skippedStepIds,
  isPending,
  onSelectStep,
}: OnboardingProgressProps) {
  const { t } = useTranslation();
  const completedCount = useMemo(
    () =>
      stepOrder.filter((stepId) => !remainingStepIds.includes(stepId)).length,
    [remainingStepIds, stepOrder],
  );
  const currentStepIndex = stepOrder.indexOf(currentStepId);

  return (
    <div className="space-y-3 rounded-xl border border-primary-tint bg-white p-4">
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
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-max items-center gap-1">
          {stepOrder.map((stepId, index) => {
            const StepIcon = getStepIcon(stepId);
            const isActive = currentStepId === stepId;
            const isDone =
              skippedStepIds.includes(stepId) ||
              !remainingStepIds.includes(stepId);
            const isSelectable = index <= currentStepIndex;
            let stateLabel = t('onboarding.progress.statePending');

            if (isDone) {
              stateLabel = t('onboarding.progress.stateDone');
            } else if (isActive) {
              stateLabel = t('onboarding.progress.stateCurrent');
            }

            let stepDotClass =
              'border-primary-tint bg-white text-text-color/80';

            if (isActive) {
              stepDotClass =
                'border-primary-contrast/60 bg-primary-shade/30 text-primary-contrast';
            } else if (isDone) {
              stepDotClass = 'border-primary bg-primary text-primary-contrast';
            }

            return (
              <li key={stepId} className="flex items-center">
                <button
                  type="button"
                  disabled={!isSelectable || isPending}
                  className={cn(
                    'group flex min-w-40 items-center gap-2 rounded-lg border px-3 py-2 text-left transition',
                    isActive
                      ? 'border-primary bg-primary text-primary-contrast'
                      : 'border-primary-tint bg-white text-text-color',
                    isSelectable && !isActive
                      ? 'hover:border-primary-shade hover:bg-primary-tint/25'
                      : '',
                    !isSelectable ? 'cursor-not-allowed opacity-65' : '',
                  )}
                  onClick={() => {
                    if (!isSelectable || isPending) {
                      return;
                    }

                    onSelectStep(stepId);
                  }}
                >
                  <span
                    className={cn(
                      'inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      stepDotClass,
                    )}
                  >
                    {isDone ? (
                      <FiCheckCircle className="size-3.5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <StepIcon
                        className={cn(
                          'size-3.5 shrink-0',
                          isActive
                            ? 'text-primary-contrast'
                            : 'text-text-color/75 group-hover:text-text-color',
                        )}
                      />
                      <span className="truncate text-sm font-medium">
                        {t(`onboarding.steps.${stepId}.title`)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'block text-xs',
                        isActive
                          ? 'text-primary-contrast/85'
                          : 'text-text-color/65',
                      )}
                    >
                      {stateLabel}
                    </span>
                  </span>
                </button>
                {index < stepOrder.length - 1 ? (
                  <FiChevronRight className="mx-1 size-4 shrink-0 text-text-color/45" />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="grid grid-cols-1 gap-1 text-xs text-text-color/70 md:grid-cols-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-primary" />
          {t('onboarding.progress.stateDone')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full border border-primary-tint bg-white" />
          {t('onboarding.progress.stateCurrent')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-primary-tint/70" />
          {t('onboarding.progress.statePending')}
        </span>
      </div>
    </div>
  );
}
