import { AppMetadata } from '@/shared/app/state';
import { deriveGoogleSessionState, GoogleSession } from '@/shared/auth/session';
import { deriveDriveAccessState } from '@/shared/drive/permissions';

import { OnboardingResolver } from '@/main/services/OnboardingResolver';

type AppAccessGuardOptions = {
  now: () => string;
  getCurrentSession: (currentState: AppMetadata) => GoogleSession | null;
  getPasswordConfigured: () => boolean;
  onboardingResolver: OnboardingResolver;
};

export class AppAccessGuard {
  private readonly now: () => string;

  private readonly getCurrentSession: (
    currentState: AppMetadata,
  ) => GoogleSession | null;

  private readonly getPasswordConfigured: () => boolean;

  private readonly onboardingResolver: OnboardingResolver;

  constructor(options: AppAccessGuardOptions) {
    this.now = options.now;
    this.getCurrentSession = options.getCurrentSession;
    this.getPasswordConfigured = options.getPasswordConfigured;
    this.onboardingResolver = options.onboardingResolver;
  }

  assertAuthenticated(currentState: AppMetadata): void {
    const authState = deriveGoogleSessionState(
      this.getCurrentSession(currentState),
      this.now(),
    );

    if (!authState.isAuthenticated) {
      throw new Error(
        'Die lokale Datenbank ist gesperrt, bis eine gueltige Anmeldung abgeschlossen ist.',
      );
    }
  }

  assertDatabaseUnlocked(currentState: AppMetadata): void {
    this.assertAuthenticated(currentState);
    const driveState = deriveDriveAccessState(currentState.drive, true);

    if (driveState.isLocked) {
      throw new Error(
        'Google-Drive-Berechtigungen fehlen. Die Anwendung bleibt bis zur Freigabe gesperrt.',
      );
    }
  }

  assertOnboardingAccessible(currentState: AppMetadata): void {
    this.assertPasswordConfigured();
    this.assertDatabaseUnlocked(currentState);
  }

  assertApplicationUnlocked(currentState: AppMetadata): void {
    this.assertOnboardingAccessible(currentState);
    const onboardingState = this.onboardingResolver.derive(currentState);

    if (onboardingState.isConfigured && !onboardingState.isComplete) {
      throw new Error(
        'Onboarding ist unvollstaendig. Bitte schliesse zuerst alle erforderlichen Angaben ab.',
      );
    }
  }

  assertPasswordConfigured(): void {
    if (!this.getPasswordConfigured()) {
      throw new Error(
        'Ein lokales Passwort muss eingerichtet werden, bevor die App verwendet werden kann.',
      );
    }
  }
}
