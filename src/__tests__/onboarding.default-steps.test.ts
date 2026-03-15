import defaultOnboardingSteps from '@/shared/onboarding/default-steps';
import {
  completeOnboardingStep,
  createOnboardingProgress,
  deriveOnboardingState,
  saveOnboardingStepDraft,
} from '@/shared/onboarding/progress';

describe('default onboarding steps', () => {
  it('accepts empty google linkage as nullable email', () => {
    const initialProgress = createOnboardingProgress(
      '2026-03-15T08:00:00.000Z',
    );

    const savedProgress = saveOnboardingStepDraft(
      defaultOnboardingSteps,
      initialProgress,
      'google',
      {
        linked: false,
        email: null,
      },
      '2026-03-15T08:01:00.000Z',
    );

    const completedProgress = completeOnboardingStep(
      defaultOnboardingSteps,
      savedProgress,
      'google',
      '2026-03-15T08:02:00.000Z',
    );

    const state = deriveOnboardingState(
      defaultOnboardingSteps,
      completedProgress,
      {
        google: {
          linked: false,
          email: null,
        },
      },
    );

    expect(savedProgress.drafts.google).toEqual({
      linked: false,
      email: null,
    });
    expect(state.completedStepIds).toContain('google');
  });
});
