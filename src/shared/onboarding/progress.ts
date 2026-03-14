import { z } from 'zod';

import { JsonObject, JsonObjectSchema } from '@/shared/common/json';

export const OnboardingProgressSchema = z.object({
  definitionVersion: z.string().min(1).nullable().default(null),
  drafts: z.record(z.string(), JsonObjectSchema).default({}),
  completedStepIds: z.array(z.string().min(1)).default([]),
  skippedStepIds: z.array(z.string().min(1)).default([]),
  lastActiveStepId: z.string().min(1).nullable().default(null),
  completedAt: z.string().datetime().nullable().default(null),
  updatedAt: z.string().datetime().nullable().default(null),
});

export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;

export type OnboardingStepDefinition = {
  id: string;
  optional?: boolean;
  schema: z.ZodType<JsonObject>;
};

function getStepDefinition(
  definitions: OnboardingStepDefinition[],
  stepId: string,
): OnboardingStepDefinition {
  const stepDefinition = definitions.find(
    (definition) => definition.id === stepId,
  );

  if (!stepDefinition) {
    throw new Error(`Unknown onboarding step: ${stepId}`);
  }

  return stepDefinition;
}

function deriveCompletionState(
  definitions: OnboardingStepDefinition[],
  completedStepIds: string[],
  progress: OnboardingProgress,
  now: string,
): string | null {
  const isComplete = definitions.every(
    (definition) =>
      definition.optional || completedStepIds.includes(definition.id),
  );

  return isComplete ? now : progress.completedAt;
}

export function createOnboardingProgress(
  now: string,
  definitionVersion: string | null = null,
): OnboardingProgress {
  return OnboardingProgressSchema.parse({
    definitionVersion,
    updatedAt: now,
  });
}

export function saveOnboardingStepDraft(
  definitions: OnboardingStepDefinition[],
  progress: OnboardingProgress,
  stepId: string,
  value: JsonObject,
  now: string,
): OnboardingProgress {
  const stepDefinition = getStepDefinition(definitions, stepId);
  const parsedValue = stepDefinition.schema.parse(value);

  return OnboardingProgressSchema.parse({
    ...progress,
    drafts: {
      ...progress.drafts,
      [stepId]: parsedValue,
    },
    lastActiveStepId: stepId,
    updatedAt: now,
  });
}

export function completeOnboardingStep(
  definitions: OnboardingStepDefinition[],
  progress: OnboardingProgress,
  stepId: string,
  now: string,
): OnboardingProgress {
  const stepDefinition = getStepDefinition(definitions, stepId);
  const draft = progress.drafts[stepId];

  if (!stepDefinition.optional || draft) {
    stepDefinition.schema.parse(draft ?? {});
  }

  const completedStepIds = Array.from(
    new Set([...progress.completedStepIds, stepId]),
  );

  return OnboardingProgressSchema.parse({
    ...progress,
    completedStepIds,
    skippedStepIds: progress.skippedStepIds.filter(
      (skippedStepId) => skippedStepId !== stepId,
    ),
    lastActiveStepId: stepId,
    completedAt: deriveCompletionState(
      definitions,
      completedStepIds,
      progress,
      now,
    ),
    updatedAt: now,
  });
}

export function skipOnboardingStep(
  definitions: OnboardingStepDefinition[],
  progress: OnboardingProgress,
  stepId: string,
  now: string,
): OnboardingProgress {
  const stepDefinition = getStepDefinition(definitions, stepId);

  if (!stepDefinition.optional) {
    throw new Error(`Onboarding step is not optional: ${stepId}`);
  }

  const completedStepIds = Array.from(
    new Set([...progress.completedStepIds, stepId]),
  );
  const skippedStepIds = Array.from(
    new Set([...progress.skippedStepIds, stepId]),
  );

  return OnboardingProgressSchema.parse({
    ...progress,
    completedStepIds,
    skippedStepIds,
    lastActiveStepId: stepId,
    completedAt: deriveCompletionState(
      definitions,
      completedStepIds,
      progress,
      now,
    ),
    updatedAt: now,
  });
}

export function deriveOnboardingState(
  definitions: OnboardingStepDefinition[],
  progress: OnboardingProgress,
) {
  const requiredStepIds = definitions
    .filter((definition) => !definition.optional)
    .map((definition) => definition.id);
  const completedStepIdSet = new Set(progress.completedStepIds);
  const skippedStepIdSet = new Set(progress.skippedStepIds);
  const nextStep = definitions.find(
    (definition) => !completedStepIdSet.has(definition.id),
  );
  const isComplete = requiredStepIds.every((stepId) =>
    completedStepIdSet.has(stepId),
  );

  return {
    isConfigured: definitions.length > 0,
    isComplete,
    nextStepId: isComplete ? null : (nextStep?.id ?? null),
    remainingStepIds: definitions
      .filter((definition) => !completedStepIdSet.has(definition.id))
      .map((definition) => definition.id),
    skippedStepIds: Array.from(skippedStepIdSet),
  };
}
