import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import UnsavedChangesDialog from '@/renderer/components/app/UnsavedChangesDialog';
import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import WeeklyReportDocument from '@/renderer/components/weekly-report/WeeklyReportDocument';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import { useSelectedCompleteWeek } from '@/renderer/hooks/useSelectedCompleteWeek';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import useUnsavedChangesGuard from '@/renderer/hooks/useUnsavedChangesGuard';
import { parseOnboardingWorkplace } from '@/renderer/lib/app-settings';
import { appRoutes } from '@/renderer/lib/app-routes';
import {
  buildWeeklyDocumentData,
  createWeeklyDocumentTranslations,
} from '@/renderer/lib/weekly-report-document';
import { parseWeeklyReportValues } from '@/renderer/lib/report-values';

function toDisplayDate(value: string): string {
  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

function serializeSectionContent(input: {
  heading: string;
  items: string[];
}[]): string {
  return input
    .map((entry) => [entry.heading, ...entry.items.map((item) => `- ${item}`)].join('\n'))
    .join('\n\n');
}

export default function SendWeeklyReportPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();
  const [isPending, setIsPending] = useState(false);
  const [hasResolvedDecision, setHasResolvedDecision] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const { completeWeeks, selectedWeek, selectedWeekIdentity, setSelectedWeekIdentity } =
    useSelectedCompleteWeek(reportsState.value, location.search);
  const workplace = useMemo(
    () =>
      settingsSnapshot.value
        ? parseOnboardingWorkplace(settingsSnapshot.value.values)
        : null,
    [settingsSnapshot.value],
  );
  const documentTranslations = useMemo(
    () => createWeeklyDocumentTranslations(t),
    [t],
  );
  const parsedWeekValues = useMemo(
    () =>
      selectedWeek
        ? parseWeeklyReportValues(selectedWeek.weeklyReport.values)
        : null,
    [selectedWeek],
  );
  const documentData = useMemo(() => {
    if (!selectedWeek || !settingsSnapshot.value) {
      return null;
    }

    return buildWeeklyDocumentData({
      week: selectedWeek,
      settingsValues: settingsSnapshot.value.values,
      translations: documentTranslations,
    });
  }, [documentTranslations, selectedWeek, settingsSnapshot.value]);
  const ihkLink = workplace?.ihkLink ?? null;
  const emptyValue = t('weeklyDocument.emptyValue');
  const isDirty = Boolean(
    selectedWeek && !parsedWeekValues?.submitted && !hasResolvedDecision,
  );

  useEffect(() => {
    setHasResolvedDecision(false);
  }, [selectedWeekIdentity]);

  useEffect(() => {
    if (!pendingRoute || !hasResolvedDecision) {
      return;
    }

    navigate(pendingRoute);
    setPendingRoute(null);
  }, [hasResolvedDecision, navigate, pendingRoute]);

  function resolveReturnRoute(): string {
    if (!selectedWeek) {
      return appRoutes.weeklyReport;
    }

    return `${appRoutes.weeklyReport}?weekStart=${selectedWeek.weeklyReport.weekStart}&weekEnd=${selectedWeek.weeklyReport.weekEnd}`;
  }

  async function submitReport(): Promise<boolean> {
    if (!runtime.api || !selectedWeek || !parsedWeekValues || !documentData) {
      toast.info(t('sendWeeklyReport.feedback.selectWeekFirst'));
      return false;
    }

    const effectiveArea =
      documentData.areaField.value === emptyValue
        ? null
        : documentData.areaField.value;
    const effectiveSupervisorEmail =
      documentData.supervisorField.value === emptyValue
        ? null
        : documentData.supervisorField.value;

    setIsPending(true);
    try {
      await runtime.api.upsertWeeklyReport({
        weekStart: selectedWeek.weeklyReport.weekStart,
        weekEnd: selectedWeek.weeklyReport.weekEnd,
        values: {
          ...parsedWeekValues,
          area: effectiveArea,
          supervisorEmailPrimary:
            effectiveSupervisorEmail ?? parsedWeekValues.supervisorEmailPrimary,
          supervisorEmailSecondary:
            effectiveSupervisorEmail ??
            parsedWeekValues.supervisorEmailSecondary,
          submitted: true,
          submittedToEmail:
            effectiveSupervisorEmail ?? parsedWeekValues.submittedToEmail,
        },
      });
      await runtime.refresh();
      await reportsState.refresh();
      setHasResolvedDecision(true);
      toast.success(
        t('sendWeeklyReport.feedback.submitted'),
        effectiveSupervisorEmail || undefined,
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('sendWeeklyReport.feedback.submitError'), message);
      return false;
    } finally {
      setIsPending(false);
    }
  }

  async function handleCopySection(sectionIndex: number) {
    if (!documentData) {
      return;
    }

    const section = documentData.sections[sectionIndex];
    const content = section.entries.length
      ? serializeSectionContent(section.entries)
      : section.emptyValue;

    try {
      await navigator.clipboard.writeText(content);
      toast.success(t('sendWeeklyReport.feedback.copied'), section.title);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('sendWeeklyReport.feedback.copyError'), message);
    }
  }

  function handleOpenIhk() {
    if (!ihkLink) {
      return;
    }

    window.open(ihkLink, '_blank', 'noopener,noreferrer');
  }

  function handleCancel() {
    setHasResolvedDecision(true);
    setPendingRoute(resolveReturnRoute());
  }

  async function handleMarkAsSubmitted() {
    const submitted = await submitReport();

    if (!submitted) {
      return;
    }

    setPendingRoute(resolveReturnRoute());
  }

  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    onSave: submitReport,
  });

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={t('sendWeeklyReport.title')}
        description={t('sendWeeklyReport.description')}
      />

      <SectionCard
        title={t('sendWeeklyReport.selectorTitle')}
        description={t('sendWeeklyReport.selectorDescription')}
        className="border-primary-tint bg-white"
        action={
          <Button
            type="button"
            variant="outline"
            className="border-primary-tint"
            disabled={!ihkLink}
            onClick={handleOpenIhk}
          >
            {t('sendWeeklyReport.openIhk')}
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-end">
          <FormField
            id="send-weekly-report-week"
            label={t('sendWeeklyReport.selectorLabel')}
          >
            <select
              id="send-weekly-report-week"
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              value={selectedWeekIdentity}
              onChange={(event) => setSelectedWeekIdentity(event.target.value)}
              disabled={!completeWeeks.length}
            >
              <option value="">{t('sendWeeklyReport.selectorPlaceholder')}</option>
              {completeWeeks.map((week) => {
                const identity = `${week.weeklyReport.weekStart}:${week.weeklyReport.weekEnd}`;
                const label = `${toDisplayDate(week.weeklyReport.weekStart)} - ${toDisplayDate(week.weeklyReport.weekEnd)}`;

                return (
                  <option key={identity} value={identity}>
                    {label}
                  </option>
                );
              })}
            </select>
          </FormField>
          <Alert className="border-primary-tint bg-primary-tint/20">
            <AlertTitle>{t('sendWeeklyReport.completeWeeksTitle')}</AlertTitle>
            <AlertDescription>
              {ihkLink
                ? t('sendWeeklyReport.completeWeeksDescription')
                : t('sendWeeklyReport.completeWeeksDescriptionMissingIhk')}
            </AlertDescription>
          </Alert>
        </div>
      </SectionCard>

      {parsedWeekValues?.submitted ? (
        <Alert className="border-primary-tint bg-primary-tint/20">
          <AlertTitle>{t('sendWeeklyReport.submittedTitle')}</AlertTitle>
          <AlertDescription>
            {parsedWeekValues.submittedToEmail
              ? t('sendWeeklyReport.submittedDescriptionWithEmail', {
                  email: parsedWeekValues.submittedToEmail,
                })
              : t('sendWeeklyReport.submittedDescription')}
          </AlertDescription>
        </Alert>
      ) : null}

      {selectedWeek && documentData ? (
        <WeeklyReportDocument
          document={documentData}
          copyActionLabel={t('sendWeeklyReport.copyAction')}
          onCopySection={handleCopySection}
        />
      ) : (
        <Alert className="border-primary-tint bg-primary-tint/20">
          <AlertTitle>{t('sendWeeklyReport.emptyTitle')}</AlertTitle>
          <AlertDescription>
            {completeWeeks.length
              ? t('sendWeeklyReport.emptyDescription')
              : t('sendWeeklyReport.noCompleteWeeks')}
          </AlertDescription>
        </Alert>
      )}

      <div className="sticky bottom-3 z-20 rounded-xl border border-primary-tint/75 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-primary-tint"
            disabled={isPending}
            onClick={handleCancel}
          >
            {t('sendWeeklyReport.cancelAction')}
          </Button>
          <Button
            type="button"
            disabled={
              isPending || !selectedWeek || !documentData || parsedWeekValues?.submitted
            }
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={() => {
              handleMarkAsSubmitted().catch(() => undefined);
            }}
          >
            {isPending ? t('common.loading') : t('sendWeeklyReport.action')}
          </Button>
        </div>
      </div>

      <UnsavedChangesDialog
        open={unsavedChangesGuard.isOpen}
        isPending={unsavedChangesGuard.isPending}
        titleKey="sendWeeklyReport.leaveDialog.title"
        descriptionKey="sendWeeklyReport.leaveDialog.description"
        saveLabelKey="sendWeeklyReport.leaveDialog.sent"
        discardLabelKey="sendWeeklyReport.leaveDialog.notSent"
        cancelLabelKey="sendWeeklyReport.leaveDialog.stay"
        onCancel={unsavedChangesGuard.cancel}
        onDiscard={unsavedChangesGuard.discard}
        onSave={() => {
          unsavedChangesGuard.saveAndProceed().catch(() => undefined);
        }}
      />
    </div>
  );
}
