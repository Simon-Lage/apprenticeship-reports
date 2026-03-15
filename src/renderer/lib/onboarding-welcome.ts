const onboardingWelcomeStorageKey =
  'apprenticeship-reports.onboarding.welcome-seen.v1';

export function hasSeenOnboardingWelcome(): boolean {
  try {
    return window.localStorage.getItem(onboardingWelcomeStorageKey) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingWelcomeSeen(): void {
  try {
    window.localStorage.setItem(onboardingWelcomeStorageKey, 'true');
  } catch {
    return;
  }
}
