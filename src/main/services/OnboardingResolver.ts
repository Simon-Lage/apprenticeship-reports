import { AppMetadata } from '@/shared/app/state';
import {
  deriveOnboardingState,
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

  assertStepIsKnown(stepId: string): void {
    if (this.stepIds.length && !this.stepIds.includes(stepId)) {
      throw new Error(`Unknown onboarding step: ${stepId}`);
    }
  }

  derive(currentState: AppMetadata): ResolvedOnboardingState {
    return deriveOnboardingState(
      this.steps,
      currentState.onboarding,
      this.getStepValues(currentState),
    );
  }

  private getStepValues(
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
