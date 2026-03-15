import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CompareLayout } from '@/renderer/layouts/CompareLayout';
import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
import { useSettingsComparison } from '@/renderer/hooks/useSettingsComparison';
import { downloadTextFile, readTextFile } from '@/renderer/lib/file-io';
import { mergeUiSettings, parseUiSettings, UiSettingsValues } from '@/renderer/lib/app-settings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsImportPreview } from '@/shared/settings/schema';

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-primary-tint/80 bg-primary-tint/20 p-3 text-xs text-text-color">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const settingsSnapshot = useSettingsSnapshot();
  const [formValues, setFormValues] = useState<UiSettingsValues | null>(null);
  const [preview, setPreview] = useState<SettingsImportPreview | null>(null);
  const [isPending, setIsPending] = useState(false);
  const comparison = useSettingsComparison(
    preview?.current.values ?? {},
    preview?.incoming.values ?? {},
  );

  useEffect(() => {
    if (!settingsSnapshot.value) {
      return;
    }

    setFormValues(parseUiSettings(settingsSnapshot.value.values));
  }, [settingsSnapshot.value]);

  const hasDifferences = useMemo(
    () => comparison.hasDifferences && Boolean(preview),
    [comparison.hasDifferences, preview],
  );

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
      const merged = mergeUiSettings(settingsSnapshot.value.values, formValues);
      await runtime.api.setSettingsValues(merged);
      await runtime.refresh();
      await settingsSnapshot.refresh();
      toast.success(t('settings.feedback.saved'));
    } catch (error) {
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
      downloadTextFile({
        fileName: `settings-export-${new Date().toISOString().slice(0, 10)}.json`,
        content: JSON.stringify(envelope, null, 2),
      });
      await runtime.refresh();
      toast.success(t('settings.feedback.exported'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('settings.feedback.exportError'), message);
    }
  }

  async function handleSettingsImportFile(event: ChangeEvent<HTMLInputElement>) {
    if (!runtime.api) {
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const serialized = await readTextFile(file);
      const nextPreview = await runtime.api.prepareSettingsImport(serialized);
      setPreview(nextPreview);
      toast.info(t('settings.feedback.importPrepared'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('settings.feedback.importPrepareError'), message);
    } finally {
      event.target.value = '';
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
    <div className="space-y-6">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
        action={
          <Button
            type="button"
            disabled={isPending}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={() => {
              void saveSettings();
            }}
          >
            {isPending ? t('common.loading') : t('settings.save')}
          </Button>
        }
      />
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
          <FormField id="supervisor-1" label={t('settings.general.supervisorPrimary')}>
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
          <FormField id="supervisor-2" label={t('settings.general.supervisorSecondary')}>
            <Input
              id="supervisor-2"
              type="email"
              value={formValues.supervisorEmailSecondary}
              onChange={(event) =>
                setFormValues((current) =>
                  current
                    ? { ...current, supervisorEmailSecondary: event.target.value }
                    : current,
                )
              }
            />
          </FormField>
        </div>
      </SectionCard>
      <SectionCard
        title={t('settings.exchange.title')}
        description={t('settings.exchange.description')}
        className="border-primary-tint bg-white"
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="border-primary-tint" onClick={() => {
            void handleSettingsExport();
          }}>
            {t('settings.exchange.export')}
          </Button>
          <label className="inline-flex cursor-pointer items-center rounded-md border border-primary-tint px-3 py-2 text-sm text-text-color">
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => {
                void handleSettingsImportFile(event);
              }}
            />
            {t('settings.exchange.import')}
          </label>
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
                  void cancelSettingsImport();
                }}
              >
                {t('settings.compare.cancel')}
              </Button>
              <Button
                type="button"
                className="bg-primary text-primary-contrast hover:bg-primary-shade"
                onClick={() => {
                  void applySettingsImport();
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
              <AlertDescription>
                {preview.differences.length}
              </AlertDescription>
            </Alert>
            <CompareLayout
              leftTitle={t('settings.compare.currentTitle')}
              rightTitle={t('settings.compare.incomingTitle')}
              left={<JsonPreview value={preview.current.values} />}
              right={<JsonPreview value={preview.incoming.values} />}
            />
            {hasDifferences ? (
              <ul className="space-y-2 text-sm">
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
    </div>
  );
}
