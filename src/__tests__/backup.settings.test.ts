import {
  SettingsBackupScopeSchema,
  parseBackupSettings,
} from '@/shared/backup/settings';

describe('backup settings', () => {
  it('rejects empty settings backup scopes', () => {
    expect(() =>
      SettingsBackupScopeSchema.parse({
        onboarding: false,
        ui: false,
        absence: false,
      }),
    ).toThrow('settings-backup-scope-required');
  });

  it('keeps manual settings backup scope separate from automatic scope', () => {
    const settings = parseBackupSettings({
      backup: {
        automaticSettingsScope: {
          onboarding: true,
          ui: false,
          absence: false,
        },
        manualSettingsScope: {
          onboarding: false,
          ui: true,
          absence: false,
        },
      },
    });

    expect(settings.automaticSettingsScope).toEqual({
      onboarding: true,
      ui: false,
      absence: false,
    });
    expect(settings.manualSettingsScope).toEqual({
      onboarding: false,
      ui: true,
      absence: false,
    });
  });
});
