import { z } from 'zod';

import {
  JsonObject,
  JsonObjectSchema,
  deepCloneJson,
  ensureJsonObject,
} from '@/shared/common/json';
import { SettingsDifference, diffJsonValues } from '@/shared/settings/diff';

export const SettingsSnapshotSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  capturedAt: z.string().datetime(),
  values: JsonObjectSchema,
}).strict();

export const SettingsExportEnvelopeSchema = z.object({
  exportedAt: z.string().datetime(),
  snapshot: SettingsSnapshotSchema,
}).strict();

export const SettingsImportPreviewSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
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
): SettingsExportEnvelope {
  return SettingsExportEnvelopeSchema.parse({
    exportedAt,
    snapshot,
  });
}

export function parseSettingsImportEnvelope(
  serialized: string,
): SettingsExportEnvelope {
  const parsedValue = JSON.parse(serialized) as unknown;
  return SettingsExportEnvelopeSchema.parse(parsedValue);
}

export function createSettingsImportPreview(input: {
  id: string;
  createdAt: string;
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
