import { useTranslation } from 'react-i18next';

import { Switch } from '@/components/ui/switch';
import {
  SettingsBackupScopeValues,
  hasEnabledSettingsBackupScope,
} from '@/shared/backup/settings';

type SettingsBackupScopeSwitchesProps = {
  value: SettingsBackupScopeValues;
  onChange: (value: SettingsBackupScopeValues) => void;
  disabled?: boolean;
};

const settingsBackupScopeKeys = ['onboarding', 'ui', 'absence'] as const;

export default function SettingsBackupScopeSwitches({
  value,
  onChange,
  disabled = false,
}: SettingsBackupScopeSwitchesProps) {
  const { t } = useTranslation();
  const enabledCount = settingsBackupScopeKeys.filter(
    (key) => value[key],
  ).length;

  return (
    <div className="flex flex-col gap-3">
      {settingsBackupScopeKeys.map((key) => {
        const switchDisabled = disabled || (value[key] && enabledCount === 1);
        const switchId = `settings-backup-scope-${key}`;

        return (
          <div
            key={key}
            className="flex items-center justify-between gap-3 rounded-md border border-primary-tint/70 px-3 py-2"
          >
            <label
              htmlFor={switchId}
              className="text-sm font-medium text-text-color"
            >
              {t(`settings.backup.scope.${key}`)}
            </label>
            <Switch
              id={switchId}
              checked={value[key]}
              disabled={switchDisabled}
              aria-label={t(`settings.backup.scope.${key}`)}
              onCheckedChange={(checked) => {
                const nextValue = {
                  ...value,
                  [key]: checked,
                };

                if (hasEnabledSettingsBackupScope(nextValue)) {
                  onChange(nextValue);
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
