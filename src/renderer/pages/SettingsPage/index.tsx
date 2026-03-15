import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { FormField } from '@/renderer/components/app/FormField';
import JsonDiffViewer from '@/renderer/components/app/JsonDiffViewer';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
import {
  mergeOnboardingSettings,
  mergeUiSettings,
  parseOnboardingRegion,
  parseOnboardingTrainingPeriod,
  parseOnboardingWorkplace,
  parseUiSettings,
  UiSettingsValues,
} from '@/renderer/lib/app-settings';
import { parseOnboardingStepValues } from '@/renderer/pages/OnboardingPage/schema';
import { germanSubdivisions } from '@/shared/absence/german-subdivisions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsImportPreview } from '@/shared/settings/schema';

type SettingsFormValues = UiSettingsValues & {
  trainingStart: string;
  trainingEnd: string;
  reportsSince: string;
  subdivisionCode: string;
  ihkLink: string;
};

export default function SettingsPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const settingsSnapshot = useSettingsSnapshot();
  const [formValues, setFormValues] = useState<SettingsFormValues | null>(null);
  const [preview, setPreview] = useState<SettingsImportPreview | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!settingsSnapshot.value) {
      return;
    }

    const parsedUiSettings = parseUiSettings(settingsSnapshot.value.values);
    const trainingPeriod = parseOnboardingTrainingPeriod(
      settingsSnapshot.value.values,
    );
    const workplace = parseOnboardingWorkplace(settingsSnapshot.value.values);
    const region = parseOnboardingRegion(settingsSnapshot.value.values);

    setFormValues({
      ...parsedUiSettings,
      trainingStart: trainingPeriod.trainingStart ?? '',
      trainingEnd: trainingPeriod.trainingEnd ?? '',
      reportsSince: trainingPeriod.reportsSince ?? '',
      subdivisionCode: region.subdivisionCode ?? '',
      ihkLink: workplace.ihkLink ?? '',
    });
  }, [settingsSnapshot.value]);

  if (!formValues) {
    return (
      <Alert className="border-primary-tint bg-primary-tint/30">
        <AlertTitle>{t('settings.loadingTitle')}</AlertTitle>
        <AlertDescription>{t('settings.loadingDescription')}</AlertDescription>
      </Alert>
    );
  }

  async function saveSettings() {
    if (!runtime.api || !settingsSnapshot.value || !formValues) {
      return;
    }

    setIsPending(true);

    try {
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
      const mergedSettings = mergeOnboardingSettings({
        values: withUiSettings,
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

        return;
      }

      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('settings.feedback.saveError'), message);
    } finally {
      setIsPending(false);
    }
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
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={isPending}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={() => {
              saveSettings();
            }}
          >
            {isPending ? t('common.loading') : t('settings.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
