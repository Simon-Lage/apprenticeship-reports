import { z } from 'zod';

import {
  completeOnboardingStep,
  createOnboardingProgress,
  deriveOnboardingState,
  saveOnboardingStepDraft,
  skipOnboardingStep,
} from '@/shared/onboarding/progress';

describe('onboarding progress', () => {
  const definitions = [
    {
      id: 'profile',
      schema: z.object({
        firstName: z.string().min(1),
      }),
    },
    {
      id: 'company',
      optional: true,
      schema: z.object({
        companyName: z.string().min(1),
      }),
    },
  ];

  it('stores validated drafts and derives the next required step', () => {
    const initialProgress = createOnboardingProgress(
      '2026-03-13T10:00:00.000Z',
    );
    const draftProgress = saveOnboardingStepDraft(
      definitions,
      initialProgress,
      'profile',
      { firstName: 'Simon' },
      '2026-03-13T10:05:00.000Z',
    );
    const completedProgress = completeOnboardingStep(
      definitions,
      draftProgress,
      'profile',
      '2026-03-13T10:06:00.000Z',
    );
    const state = deriveOnboardingState(definitions, completedProgress);

    expect(completedProgress.drafts.profile).toEqual({ firstName: 'Simon' });
    expect(state.isComplete).toBe(true);
    expect(state.nextStepId).toBeNull();
  });

  it('rejects invalid drafts', () => {
    const initialProgress = createOnboardingProgress(
      '2026-03-13T10:00:00.000Z',
    );

    expect(() =>
      saveOnboardingStepDraft(
        definitions,
        initialProgress,
        'profile',
        { firstName: '' },
        '2026-03-13T10:05:00.000Z',
      ),
    ).toThrow();
  });
});
