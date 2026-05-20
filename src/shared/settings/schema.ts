import { z } from 'zod';

import {
  JsonObject,
  JsonObjectSchema,
  deepCloneJson,
  ensureJsonObject,
} from '@/shared/common/json';
import {
  SettingsBackupScopeSchema,
  SettingsBackupScopeValues,
} from '@/shared/backup/settings';
import { SettingsDifference, diffJsonValues } from '@/shared/settings/diff';

export const SettingsSnapshotSchema = z
  .object({
    id: z.string().min(1),
    schemaVersion: z.number().int().positive(),
    capturedAt: z.string().datetime(),
    values: JsonObjectSchema,
  })
  .strict();

export const SettingsExportEnvelopeSchema = z
  .object({
    exportedAt: z.string().datetime(),
    settings: JsonObjectSchema,
  })
  .strict();

const LegacySettingsExportEnvelopeSchema = z
  .object({
    exportedAt: z.string().datetime(),
    snapshot: SettingsSnapshotSchema,
  })
  .strict();

export const SettingsImportPreviewSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  importedAt: z.string().datetime().nullable().default(null),
  affectedKeys: z.array(z.string().min(1)).default([]),
  current: SettingsSnapshotSchema,
  incoming: SettingsSnapshotSchema,
  differences: z.array(
    z.object({
      path: z.string(),
      kind: z.enum(['added', 'removed', 'changed', 'type-changed']),
      currentValue: z.unknown().optional(),
      incomingValue: z.unknown().optional(),
    }),
  ),
  warning: z.string().min(1),
});

export type SettingsSnapshot = z.infer<typeof SettingsSnapshotSchema>;
export type SettingsExportEnvelope = z.infer<
  typeof SettingsExportEnvelopeSchema
>;
export type SettingsImportPreview = z.infer<typeof SettingsImportPreviewSchema>;
export type SettingsValues = JsonObject;

export function createSettingsSnapshot(input: {
  id: string;
  schemaVersion: number;
  capturedAt: string;
  values: JsonObject;
}): SettingsSnapshot {
  return SettingsSnapshotSchema.parse({
    ...input,
    values: deepCloneJson(input.values),
  });
}

export function createSettingsExportEnvelope(
  snapshot: SettingsSnapshot,
  exportedAt: string,
  scope?: SettingsBackupScopeValues,
): SettingsExportEnvelope {
  const values = scope
    ? pickSettingsExportValues(snapshot.values, scope)
    : snapshot.values;

  return SettingsExportEnvelopeSchema.parse({
    exportedAt,
    settings: deepCloneJson(values),
  });
}

export function mergeSettingsImportValues(input: {
  currentValues: JsonObject;
  incomingValues: JsonObject;
}): JsonObject {
  return Object.entries(input.incomingValues).reduce<JsonObject>(
    (mergedValues, [key, value]) => ({
      ...mergedValues,
      [key]: deepCloneJson(value),
    }),
    deepCloneJson(input.currentValues),
  );
}

export function pickSettingsExportValues(
  values: JsonObject,
  scope: SettingsBackupScopeValues,
): JsonObject {
  const parsedScope = SettingsBackupScopeSchema.parse(scope);
  const pickedValues: JsonObject = {};

  if (parsedScope.onboarding) {
    pickedValues.onboarding = deepCloneJson(
      ensureJsonObject(values.onboarding ?? {}),
    );
  }

  if (parsedScope.ui) {
    pickedValues.appUi = deepCloneJson(ensureJsonObject(values.appUi ?? {}));
  }

  if (parsedScope.absence) {
    pickedValues.absence = deepCloneJson(
      ensureJsonObject(values.absence ?? {}),
    );
  }

  return pickedValues;
}

export function parseSettingsImportEnvelope(
  serialized: string,
): SettingsExportEnvelope {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(serialized) as unknown;
  } catch {
    throw new Error('Settings import expects valid JSON.');
  }
  const parsedEnvelope = SettingsExportEnvelopeSchema.safeParse(parsedValue);

  if (parsedEnvelope.success) {
    return parsedEnvelope.data;
  }

  const parsedLegacyEnvelope =
    LegacySettingsExportEnvelopeSchema.safeParse(parsedValue);

  if (!parsedLegacyEnvelope.success) {
    throw parsedEnvelope.error;
  }

  return SettingsExportEnvelopeSchema.parse({
    exportedAt: parsedLegacyEnvelope.data.exportedAt,
    settings: parsedLegacyEnvelope.data.snapshot.values,
  });
}

export function createSettingsImportPreview(input: {
  id: string;
  createdAt: string;
  importedAt?: string | null;
  affectedKeys?: string[];
  current: SettingsSnapshot;
  incoming: SettingsSnapshot;
  warning?: string;
}): SettingsImportPreview {
  const differences = diffJsonValues(
    input.current.values,
    input.incoming.values,
  ) as SettingsDifference[];

  return SettingsImportPreviewSchema.parse({
    id: input.id,
    createdAt: input.createdAt,
    importedAt: input.importedAt ?? null,
    affectedKeys: input.affectedKeys ?? [],
    current: input.current,
    incoming: input.incoming,
    differences,
    warning:
      input.warning ??
      'Der Import ueberschreibt die aktuellen Einstellungen nach dem Vergleich.',
  });
}

export function normalizeSettingsValues(value: unknown): SettingsValues {
  return ensureJsonObject(value);
}
