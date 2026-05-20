import { z } from 'zod';
import { JsonObject, ensureJsonObject } from '@/shared/common/json';

export const SettingsBackupScopeSchema = z
  .object({
    onboarding: z.boolean().default(true),
    ui: z.boolean().default(true),
    absence: z.boolean().default(true),
  })
  .refine(
    (scope) => scope.onboarding || scope.ui || scope.absence,
    'settings-backup-scope-required',
  );

export type SettingsBackupScopeValues = z.infer<
  typeof SettingsBackupScopeSchema
>;

export const BackupSettingsSchema = z.object({
  reportsEnabled: z.boolean().default(true),
  reportsDailyThreshold: z.number().int().min(1).max(100).default(10),
  settingsEnabled: z.boolean().default(true),
  automaticBackupsEncrypted: z.boolean().default(true),
  automaticSettingsScope: SettingsBackupScopeSchema.default({
    onboarding: true,
    ui: true,
    absence: true,
  }),
  manualSettingsScope: SettingsBackupScopeSchema.default({
    onboarding: true,
    ui: true,
    absence: true,
  }),
});

export type BackupSettingsValues = z.infer<typeof BackupSettingsSchema>;

export const defaultSettingsBackupScope: SettingsBackupScopeValues = {
  onboarding: true,
  ui: true,
  absence: true,
};

export function hasEnabledSettingsBackupScope(
  scope: SettingsBackupScopeValues,
): boolean {
  return scope.onboarding || scope.ui || scope.absence;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseSettingsBackupScope(
  value: unknown,
  fallback: SettingsBackupScopeValues = defaultSettingsBackupScope,
): SettingsBackupScopeValues {
  const rawScope =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const scope = {
    onboarding: readBoolean(rawScope.onboarding, fallback.onboarding),
    ui: readBoolean(rawScope.ui, fallback.ui),
    absence: readBoolean(rawScope.absence, fallback.absence),
  };

  if (!hasEnabledSettingsBackupScope(scope)) {
    return fallback;
  }

  return SettingsBackupScopeSchema.parse(scope);
}

export function parseBackupSettings(values: JsonObject): BackupSettingsValues {
  const backup = ensureJsonObject(values.backup ?? {});
  const legacyAutomaticScope = parseSettingsBackupScope({
    onboarding: backup.exportSettingsOnboarding,
    ui: backup.exportSettingsUi,
    absence: backup.exportSettingsAbsence,
  });
  const automaticSettingsScope = parseSettingsBackupScope(
    backup.automaticSettingsScope,
    legacyAutomaticScope,
  );
  const manualSettingsScope = parseSettingsBackupScope(
    backup.manualSettingsScope,
    automaticSettingsScope,
  );
  const reportsEnabled =
    typeof backup.reportsEnabled === 'boolean'
      ? backup.reportsEnabled
      : readBoolean(backup.enabled, true);
  const settingsEnabled =
    typeof backup.settingsEnabled === 'boolean'
      ? backup.settingsEnabled
      : readBoolean(backup.enabled, true);
  const automaticBackupsEncrypted = readBoolean(
    backup.automaticBackupsEncrypted,
    true,
  );

  return BackupSettingsSchema.parse({
    reportsEnabled,
    reportsDailyThreshold:
      typeof backup.reportsDailyThreshold === 'number'
        ? backup.reportsDailyThreshold
        : 10,
    settingsEnabled,
    automaticBackupsEncrypted,
    automaticSettingsScope,
    manualSettingsScope,
  });
}

export function mergeBackupSettings(
  values: JsonObject,
  backupSettings: BackupSettingsValues,
): JsonObject {
  return {
    ...values,
    backup: BackupSettingsSchema.parse(backupSettings),
  };
}
