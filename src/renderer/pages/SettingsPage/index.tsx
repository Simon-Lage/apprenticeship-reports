import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { FormField } from '@/renderer/components/app/FormField';
import JsonDiffViewer from '@/renderer/components/app/JsonDiffViewer';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import UnsavedChangesDialog from '@/renderer/components/app/UnsavedChangesDialog';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import useUnsavedChangesGuard from '@/renderer/hooks/useUnsavedChangesGuard';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
import {
  mergeOnboardingSettings,
  parseOnboardingIdentity,
  mergeUiSettings,
  parseOnboardingRegion,
  parseOnboardingTrainingPeriod,
  parseUiSettings,
  UiSettingsValues,
} from '@/renderer/lib/app-settings';
import { parseOnboardingStepValues } from '@/renderer/pages/OnboardingPage/schema';
import { germanSubdivisions } from '@/shared/absence/german-subdivisions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  mergeAbsenceSettings,
  parseAbsenceSettings,
} from '@/shared/absence/settings';
import { JsonObject } from '@/shared/common/json';
import { SettingsImportPreview } from '@/shared/settings/schema';

type SettingsFormValues = UiSettingsValues & {
  firstName: string;
  lastName: string;
  apprenticeIdentifier: string;
  profession: string;
  trainingStart: string;
  trainingEnd: string;
  reportsSince: string;
  subdivisionCode: string;
  autoSyncHolidays: boolean;
  ihkLink: string;
};

function resolveSettingsFormValues(values: JsonObject): SettingsFormValues {
  const parsedUiSettings = parseUiSettings(values);
  const identity = parseOnboardingIdentity(values);
  const trainingPeriod = parseOnboardingTrainingPeriod(values);
  const region = parseOnboardingRegion(values);
  const absence = parseAbsenceSettings(values);

  return {
    ...parsedUiSettings,
    firstName: identity.firstName ?? '',
    lastName: identity.lastName ?? '',
    apprenticeIdentifier: identity.apprenticeIdentifier ?? '',
    profession: identity.profession ?? '',
    trainingStart: trainingPeriod.trainingStart ?? '',
    trainingEnd: trainingPeriod.trainingEnd ?? '',
    reportsSince: trainingPeriod.reportsSince ?? '',
    subdivisionCode: region.subdivisionCode ?? '',
    autoSyncHolidays: absence.autoSyncHolidays,
    ihkLink: '',
  };
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const settingsSnapshot = useSettingsSnapshot();
  const [formValues, setFormValues] = useState<SettingsFormValues | null>(null);
  const [preview, setPreview] = useState<SettingsImportPreview | null>(null);
  const [isPending, setIsPending] = useState(false);
  const baselineFormValues = settingsSnapshot.value
    ? resolveSettingsFormValues(settingsSnapshot.value.values)
    : null;
  const isDirty =
    Boolean(formValues) &&
    Boolean(baselineFormValues) &&
    JSON.stringify(formValues) !== JSON.stringify(baselineFormValues);

  useEffect(() => {
    if (!settingsSnapshot.value) {
      return;
    }

    setFormValues(resolveSettingsFormValues(settingsSnapshot.value.values));
  }, [settingsSnapshot.value]);

  async function saveSettings() {
    if (!runtime.api || !settingsSnapshot.value || !formValues) {
      return false;
    }

    setIsPending(true);

    try {
      const identity = parseOnboardingStepValues('identity', {
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        apprenticeIdentifier: formValues.apprenticeIdentifier,
        profession: formValues.profession,
      }) as {
        firstName: string;
        lastName: string;
        apprenticeIdentifier: string;
        profession: string;
      };
      const trainingPeriod = parseOnboardingStepValues('training-period', {
        trainingStart: formValues.trainingStart,
        trainingEnd: formValues.trainingEnd,
        reportsSince: formValues.reportsSince,
      }) as {
        trainingStart: string;
        trainingEnd: string;
        reportsSince: string | null;
      };
      const workplace = parseOnboardingStepValues('workplace', {
        department: formValues.defaultDepartment,
        trainerEmail: formValues.supervisorEmailPrimary,
        ihkLink: formValues.ihkLink,
      }) as {
        department: string;
        trainerEmail: string;
        ihkLink: string | null;
      };
      const region = parseOnboardingStepValues('region', {
        subdivisionCode: formValues.subdivisionCode,
      }) as {
        subdivisionCode: string;
      };
      const withUiSettings = mergeUiSettings(
        settingsSnapshot.value.values,
        formValues,
      );
      const absence = parseAbsenceSettings(settingsSnapshot.value.values);
      const mergedSettings = mergeOnboardingSettings({
        values: mergeAbsenceSettings(withUiSettings, {
          ...absence,
          autoSyncHolidays: formValues.autoSyncHolidays,
        }),
        identity: {
          firstName: identity.firstName,
          lastName: identity.lastName,
          apprenticeIdentifier: identity.apprenticeIdentifier,
          profession: identity.profession,
        },
        trainingPeriod: {
          trainingStart: trainingPeriod.trainingStart,
          trainingEnd: trainingPeriod.trainingEnd,
          reportsSince: trainingPeriod.reportsSince,
        },
        workplace: {
          department: workplace.department,
          trainerEmail: workplace.trainerEmail,
          ihkLink: workplace.ihkLink,
        },
        region: {
          subdivisionCode: region.subdivisionCode,
        },
      });

      await runtime.api.setSettingsValues(mergedSettings);
      await runtime.refresh();
      await settingsSnapshot.refresh();
      toast.success(t('settings.feedback.saved'));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const code = error.issues[0]?.message;

        if (code === 'invalid-range') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.trainingPeriod.validationRange'),
          );
        } else if (code === 'invalid-reports-since-range') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.trainingPeriod.validationReportsSinceRange'),
          );
        } else if (code === 'invalid-subdivision') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.region.validationSubdivision'),
          );
        } else if (code === 'invalid-apprentice-identifier') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.identity.validationApprenticeIdentifier'),
          );
        } else if (code === 'required-department') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.workplace.validationDepartmentRequired'),
          );
        } else if (code === 'required-trainer-email') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.workplace.validationTrainerEmailRequired'),
          );
        } else if (code === 'invalid-email') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.workplace.validationEmail'),
          );
        } else if (code === 'invalid-url') {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.steps.workplace.validationUrl'),
          );
        } else {
          toast.error(
            t('settings.feedback.saveError'),
            t('onboarding.validation.generic'),
          );
        }

        return false;
      }

      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('settings.feedback.saveError'), message);
      return false;
    } finally {
      setIsPending(false);
    }
  }

  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    onSave: async () => saveSettings(),
  });

  if (!formValues) {
    return (
      <Alert className="border-primary-tint bg-primary-tint/30">
        <AlertTitle>{t('settings.loadingTitle')}</AlertTitle>
        <AlertDescription>{t('settings.loadingDescription')}</AlertDescription>
      </Alert>
    );
  }

  async function handleSettingsExport() {
    if (!runtime.api) {
      return;
    }

    try {
      const envelope = await runtime.api.exportSettings();
      const outputPath = await runtime.api.saveJsonFileDialog({
        defaultFileName: `settings-export-${new Date().toISOString().slice(0, 10)}.json`,
        serialized: JSON.stringify(envelope, null, 2),
      });
      if (!outputPath) {
        toast.info(t('settings.feedback.exportCanceled'));
        return;
      }
      await runtime.refresh();
      toast.success(t('settings.feedback.exported'), outputPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('settings.feedback.exportError'), message);
    }
  }

  async function handleSettingsImportFile() {
    if (!runtime.api) {
      return;
    }

    const serialized = await runtime.api.openJsonFileDialog();

    if (!serialized) {
      toast.info(t('settings.feedback.importCanceled'));
      return;
    }

    try {
      const nextPreview = await runtime.api.prepareSettingsImport(serialized);
      setPreview(nextPreview);
      toast.info(t('settings.feedback.importPrepared'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('settings.feedback.importPrepareError'), message);
    }
  }

  async function applySettingsImport() {
    if (!runtime.api || !preview) {
      return;
    }
    setIsPending(true);

    try {
      await runtime.api.applySettingsImport({ previewId: preview.id });
      setPreview(null);
      await runtime.refresh();
      await settingsSnapshot.refresh();
      toast.success(t('settings.feedback.importApplied'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('settings.feedback.importApplyError'), message);
    } finally {
      setIsPending(false);
    }
  }

  async function cancelSettingsImport() {
    if (!runtime.api) {
      return;
    }

    try {
      await runtime.api.cancelSettingsImport();
      setPreview(null);
      await runtime.refresh();
      toast.info(t('settings.feedback.importCanceled'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('settings.feedback.importApplyError'), message);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <SectionCard
        title={t('settings.general.title')}
        description={t('settings.general.description')}
        className="border-primary-tint bg-white"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="first-name"
            label={t('onboarding.steps.identity.firstName')}
          >
            <Input
              id="first-name"
              value={formValues.firstName}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? { ...current, firstName: event.target.value }
                    : current,
                )
              }
            />
          </FormField>
          <FormField
            id="last-name"
            label={t('onboarding.steps.identity.lastName')}
          >
            <Input
              id="last-name"
              value={formValues.lastName}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? { ...current, lastName: event.target.value }
                    : current,
                )
              }
            />
          </FormField>
          <FormField
            id="apprentice-identifier"
            label={t('settings.general.apprenticeIdentifier')}
          >
            <Input
              id="apprentice-identifier"
              inputMode="numeric"
              value={formValues.apprenticeIdentifier}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? {
                        ...current,
                        apprenticeIdentifier: event.target.value.replace(
                          /\D+/g,
                          '',
                        ),
                      }
                    : current,
                )
              }
            />
          </FormField>
          <FormField id="profession" label={t('settings.general.profession')}>
            <Input
              id="profession"
              value={formValues.profession}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? { ...current, profession: event.target.value }
                    : current,
                )
              }
            />
          </FormField>
          <FormField id="department" label={t('settings.general.department')}>
            <Input
              id="department"
              value={formValues.defaultDepartment}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? { ...current, defaultDepartment: event.target.value }
                    : current,
                )
              }
            />
          </FormField>
          <FormField
            id="supervisor-1"
            label={t('settings.general.supervisorPrimary')}
          >
            <Input
              id="supervisor-1"
              type="email"
              value={formValues.supervisorEmailPrimary}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? { ...current, supervisorEmailPrimary: event.target.value }
                    : current,
                )
              }
            />
          </FormField>
          <FormField id="ihk-link" label={t('settings.general.ihkLink')}>
            <Input
              id="ihk-link"
              type="url"
              value={formValues.ihkLink}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? { ...current, ihkLink: event.target.value }
                    : current,
                )
              }
            />
          </FormField>
          <FormField
            id="google-account"
            label={t('settings.general.googleAccount')}
          >
            <div className="flex h-9 items-center">
              <span className="text-sm font-medium text-text-color/80">
                {runtime.state.drive.connectedAccountEmail ||
                  t('authMethods.google.notLinked')}
              </span>
            </div>
          </FormField>
        </div>
      </SectionCard>
      <SectionCard
        title={t('settings.trainingPeriod.title')}
        description={t('settings.trainingPeriod.description')}
        className="border-primary-tint bg-white"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            id="training-start"
            label={t('settings.trainingPeriod.start')}
          >
            <Input
              id="training-start"
              type="date"
              value={formValues.trainingStart}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? { ...current, trainingStart: event.target.value }
                    : current,
                )
              }
            />
          </FormField>
          <FormField id="training-end" label={t('settings.trainingPeriod.end')}>
            <Input
              id="training-end"
              type="date"
              value={formValues.trainingEnd}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? { ...current, trainingEnd: event.target.value }
                    : current,
                )
              }
            />
          </FormField>
          <FormField
            id="reports-since"
            label={t('settings.trainingPeriod.reportsSince')}
          >
            <Input
              id="reports-since"
              type="date"
              value={formValues.reportsSince}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? { ...current, reportsSince: event.target.value }
                    : current,
                )
              }
            />
          </FormField>
        </div>
      </SectionCard>
      <SectionCard
        title={t('settings.region.title')}
        description={t('settings.region.description')}
        className="border-primary-tint bg-white"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            id="region-subdivision"
            label={t('settings.region.subdivisionCode')}
          >
            <select
              id="region-subdivision"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={formValues.subdivisionCode}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? { ...current, subdivisionCode: event.target.value }
                    : current,
                )
              }
            >
              <option value="">{t('settings.region.placeholder')}</option>
              {germanSubdivisions.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {t(`onboarding.steps.region.options.${entry.code}`)}
                </option>
              ))}
            </select>
          </FormField>
          <div className="flex flex-col justify-center space-y-1">
            <label
              htmlFor="auto-sync-holidays"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t('settings.region.autoSyncHolidays')}
            </label>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-sync-holidays"
                checked={formValues.autoSyncHolidays}
                onCheckedChange={(checked) =>
                  setFormValues((current) =>
                    current
                      ? { ...current, autoSyncHolidays: checked }
                      : current,
                  )
                }
              />
              <span className="text-sm text-text-color/70">
                {t('settings.region.autoSyncDescription')}
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t('settings.exchange.title')}
        description={t('settings.exchange.description')}
        className="border-primary-tint bg-white"
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-primary-tint"
            onClick={() => {
              handleSettingsExport();
            }}
          >
            {t('settings.exchange.export')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-primary-tint"
            onClick={() => {
              handleSettingsImportFile();
            }}
          >
            {t('settings.exchange.import')}
          </Button>
        </div>
      </SectionCard>
      {preview ? (
        <SectionCard
          title={t('settings.compare.title')}
          description={t('settings.compare.description')}
          className="border-primary-tint bg-white"
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-primary-tint"
                onClick={() => {
                  cancelSettingsImport();
                }}
              >
                {t('settings.compare.cancel')}
              </Button>
              <Button
                type="button"
                className="bg-primary text-primary-contrast hover:bg-primary-shade"
                onClick={() => {
                  applySettingsImport();
                }}
              >
                {t('settings.compare.apply')}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Alert className="border-primary-tint bg-primary-tint/30">
              <AlertTitle>{t('settings.compare.diffCount')}</AlertTitle>
              <AlertDescription>{preview.differences.length}</AlertDescription>
            </Alert>
            <p className="text-xs text-text-color/70">
              {preview.current.capturedAt} | {preview.incoming.capturedAt}
            </p>
            <JsonDiffViewer
              currentValue={preview.current.values}
              incomingValue={preview.incoming.values}
              currentTitle={`${t('settings.compare.currentTitle')} (${preview.current.capturedAt})`}
              incomingTitle={`${t('settings.compare.incomingTitle')} (${preview.incoming.capturedAt})`}
            />
            {preview.differences.length ? (
              <ul className="max-h-56 space-y-2 overflow-auto pr-1 text-sm">
                {preview.differences.slice(0, 12).map((difference) => (
                  <li
                    key={`${difference.path}-${difference.kind}`}
                    className="rounded-md border border-primary-tint/80 bg-primary-tint/20 px-3 py-2 text-text-color"
                  >
                    <strong>{difference.path}</strong> ({difference.kind})
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </SectionCard>
      ) : null}
      <div className="sticky bottom-3 z-20 rounded-xl border border-primary-tint/75 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isPending || !isDirty}
            className="border-primary-tint"
            onClick={() => {
              if (baselineFormValues) {
                setFormValues(baselineFormValues);
                toast.info(t('settings.reset'));
              }
            }}
          >
            {t('settings.reset')}
          </Button>
          <Button
            type="button"
            disabled={isPending || !isDirty}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={() => {
              saveSettings().catch(() => undefined);
            }}
          >
            {isPending ? t('common.loading') : t('settings.save')}
          </Button>
        </div>
      </div>
      <UnsavedChangesDialog
        open={unsavedChangesGuard.isOpen}
        isPending={unsavedChangesGuard.isPending}
        onCancel={unsavedChangesGuard.cancel}
        onDiscard={unsavedChangesGuard.discard}
        onSave={() => {
          unsavedChangesGuard.saveAndProceed().catch(() => undefined);
        }}
      />
    </div>
  );
}
