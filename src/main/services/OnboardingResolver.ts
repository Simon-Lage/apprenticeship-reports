import { AppMetadata } from '@/shared/app/state';
import {
  deriveOnboardingState,
  OnboardingProgressSchema,
  OnboardingStepDefinition,
} from '@/shared/onboarding/progress';
import { isJsonObject, JsonObject } from '@/shared/common/json';

export type ResolvedOnboardingState = ReturnType<typeof deriveOnboardingState>;

export class OnboardingResolver {
  private readonly steps: OnboardingStepDefinition[];

  private readonly stepIds: string[];

  constructor(steps: OnboardingStepDefinition[], stepIds?: string[]) {
    this.steps = steps;
    this.stepIds = stepIds ?? steps.map((step) => step.id);
  }

  getStepIds(): string[] {
    return this.stepIds;
  }

  hasStep(stepId: string): boolean {
    return !this.stepIds.length || this.stepIds.includes(stepId);
  }

  assertStepIsKnown(stepId: string): void {
    if (this.stepIds.length && !this.stepIds.includes(stepId)) {
      throw new Error(`Unknown onboarding step: ${stepId}`);
    }
  }

  derive(currentState: AppMetadata): ResolvedOnboardingState {
    return deriveOnboardingState(
      this.steps,
      currentState.onboarding,
      OnboardingResolver.getStepValues(currentState),
    );
  }

  getStepValue(
    currentState: AppMetadata,
    stepId: string,
  ): JsonObject | undefined {
    this.assertStepIsKnown(stepId);
    return OnboardingResolver.getStepValues(currentState)[stepId];
  }

  activateStep(currentState: AppMetadata, stepId: string, now: string) {
    this.assertStepIsKnown(stepId);

    return OnboardingProgressSchema.parse({
      ...currentState.onboarding,
      lastActiveStepId: stepId,
      updatedAt: now,
    });
  }

  private static getStepValues(
    currentState: AppMetadata,
  ): Record<string, JsonObject | undefined> {
    const onboardingValues = currentState.settings.current.values.onboarding;

    if (!isJsonObject(onboardingValues)) {
      return {};
    }

    return Object.entries(onboardingValues).reduce<
      Record<string, JsonObject | undefined>
    >((result, [stepId, stepValue]) => {
      if (isJsonObject(stepValue)) {
        result[stepId] = stepValue;
      }

      return result;
    }, {});
  }
}
