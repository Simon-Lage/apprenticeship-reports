import {
  parseOnboardingIdentity,
  mergeOnboardingSettings,
} from '@/renderer/lib/app-settings';
import {
  getOnboardingStepDefaults,
  parseOnboardingStepValues,
} from '@/renderer/pages/OnboardingPage/schema';

describe('onboarding identity fields', () => {
  it('parses apprentice identifier and profession in the identity step', () => {
    expect(
      parseOnboardingStepValues('identity', {
        firstName: 'Ada',
        lastName: 'Lovelace',
        apprenticeIdentifier: '12345',
        profession: 'Fachinformatikerin',
      }),
    ).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      apprenticeIdentifier: '12345',
      profession: 'Fachinformatikerin',
    });
  });

  it('exposes identity defaults for settings and onboarding editing', () => {
    expect(
      getOnboardingStepDefaults({
        stepId: 'identity',
        source: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          apprenticeIdentifier: '12345',
          profession: 'Fachinformatikerin',
        },
        authProvider: null,
      }),
    ).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      apprenticeIdentifier: '12345',
      profession: 'Fachinformatikerin',
    });
  });

  it('stores identity values in onboarding settings', () => {
    const values = mergeOnboardingSettings({
      values: {},
      identity: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        apprenticeIdentifier: '12345',
        profession: 'Fachinformatikerin',
      },
      trainingPeriod: {
        trainingStart: '2026-01-01',
        trainingEnd: '2026-12-31',
        reportsSince: null,
      },
      workplace: {
        department: 'IT',
        trainerEmail: 'trainer@example.com',
        ihkLink: null,
      },
      region: {
        subdivisionCode: 'DE-NW',
      },
    });

    expect(parseOnboardingIdentity(values)).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      apprenticeIdentifier: '12345',
      profession: 'Fachinformatikerin',
    });
  });
});
