import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import UnsavedChangesDialog from '@/renderer/components/app/UnsavedChangesDialog';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import WeeklyReportDocument, {
  WeeklyReportCopyField,
} from '@/renderer/components/weekly-report/WeeklyReportDocument';
import WeeklyReportWeekSelector from '@/renderer/components/weekly-report/WeeklyReportWeekSelector';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import useIhkOselgbWeeklyReportSave from '@/renderer/hooks/useIhkOselgbWeeklyReportSave';
import { useSelectedCompleteWeek } from '@/renderer/hooks/useSelectedCompleteWeek';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import useUnsavedChangesGuard from '@/renderer/hooks/useUnsavedChangesGuard';
import {
  parseOnboardingWorkplace,
  parseUiSettings,
} from '@/renderer/lib/app-settings';
import { appRoutes } from '@/renderer/lib/app-routes';
import { formatGermanDate } from '@/renderer/lib/date-format';
import { toLocalIsoDate } from '@/renderer/lib/iso-date';
import { notifyReportsStateChanged } from '@/renderer/lib/report-state-events';
import {
  buildWeeklyDocumentData,
  createWeeklyDocumentTranslations,
  serializeWeeklyDocumentSectionEntries,
} from '@/renderer/lib/weekly-report-document';
import { parseWeeklyReportValues } from '@/renderer/lib/report-values';
import { buildIhkOselgbWeeklyReportInput } from '@/renderer/lib/ihk-oselgb-weekly-report';
import { resolveReportStartDateFromSettings } from '@/shared/settings/report-start-date';
import { resolveWeeklyReportSubmissionBlock } from '@/shared/reports/edit-locks';
import {
  IhkOselgbCredentialStatus,
  isIhkOselgbLink,
} from '@/shared/ihk/ihk-oselgb';

export default function SendWeeklyReportPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const { saveWeeklyReportAtIhk } = useIhkOselgbWeeklyReportSave();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();
  const [isPending, setIsPending] = useState(false);
  const [ihkCredentialStatus, setIhkCredentialStatus] =
    useState<IhkOselgbCredentialStatus | null>(null);
  const [hasResolvedDecision, setHasResolvedDecision] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [isSendOrderDialogOpen, setIsSendOrderDialogOpen] = useState(false);
  const [failedIhkSubmission, setFailedIhkSubmission] = useState<{
    message: string;
  } | null>(null);
  const today = toLocalIsoDate(new Date());
  const allowEarlyWeeklyReportSubmission = useMemo(
    () =>
      settingsSnapshot.value
        ? parseUiSettings(settingsSnapshot.value.values)
            .allowEarlyWeeklyReportSubmission
        : false,
    [settingsSnapshot.value],
  );
  const {
    completeWeeks,
    requestedWeekRange,
    requestedWeekIsComplete,
    selectedWeek,
    selectedWeekIdentity,
    setSelectedWeekIdentity,
  } = useSelectedCompleteWeek(reportsState.value, location.search, {
    maxWeekEnd: allowEarlyWeeklyReportSubmission ? undefined : today,
  });
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
  const reportStartDate = useMemo(
    () =>
      settingsSnapshot.value
        ? resolveReportStartDateFromSettings(settingsSnapshot.value.values)
        : null,
    [settingsSnapshot.value],
  );
  const weeklySubmissionBlock = useMemo(() => {
    if (!reportsState.value || !selectedWeek) {
      return null;
    }

    return resolveWeeklyReportSubmissionBlock({
      reportsState: reportsState.value,
      reportStartDate,
      weekStart: selectedWeek.weeklyReport.weekStart,
      weekEnd: selectedWeek.weeklyReport.weekEnd,
      today,
      allowEarlySubmission: allowEarlyWeeklyReportSubmission,
    });
  }, [
    allowEarlyWeeklyReportSubmission,
    reportStartDate,
    reportsState.value,
    selectedWeek,
    today,
  ]);
  const sendOrderBlocksSelectedWeek =
    weeklySubmissionBlock?.kind === 'previous-week-unsubmitted' &&
    !parsedWeekValues?.submitted;
  const futureWeekBlocksSelectedWeek =
    weeklySubmissionBlock?.kind === 'future-week' &&
    !parsedWeekValues?.submitted;
  const blockingUnsubmittedWeek =
    weeklySubmissionBlock?.kind === 'previous-week-unsubmitted'
      ? weeklySubmissionBlock.blockingWeek
      : null;
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
  const ihkOselgbActive = Boolean(
    ihkCredentialStatus?.passwordConfigured && isIhkOselgbLink(ihkLink),
  );
  const emptyValue = t('weeklyDocument.emptyValue');
  const requestedWeekIsInvalid = Boolean(
    reportsState.value && requestedWeekRange && !requestedWeekIsComplete,
  );
  const isDirty = Boolean(
    !requestedWeekIsInvalid &&
      selectedWeek &&
      !parsedWeekValues?.submitted &&
      !hasResolvedDecision,
  );

  function resolveSubmitDisabledReason() {
    if (isPending) {
      return t('common.disabledReasons.pending');
    }
    if (!selectedWeek) {
      return t('common.disabledReasons.noSelectedWeek');
    }
    if (!documentData) {
      return t('common.disabledReasons.missingPreview');
    }
    if (parsedWeekValues?.submitted) {
      return t('common.disabledReasons.submittedReport');
    }
    if (futureWeekBlocksSelectedWeek) {
      return t('common.disabledReasons.futureWeekSend');
    }
    if (sendOrderBlocksSelectedWeek) {
      return t('common.disabledReasons.sendOrderBlocked');
    }

    return undefined;
  }

  const submitDisabledReason = resolveSubmitDisabledReason();

  useEffect(() => {
    setHasResolvedDecision(false);
    setFailedIhkSubmission(null);
  }, [selectedWeekIdentity]);

  useEffect(() => {
    let cancelled = false;

    if (!runtime.api) {
      setIhkCredentialStatus(null);
      return undefined;
    }

    runtime.api
      .getIhkOselgbCredentialStatus()
      .then((status) => {
        if (!cancelled) {
          setIhkCredentialStatus(status);
        }
        return undefined;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [runtime.api]);

  useEffect(() => {
    if (!pendingRoute || !hasResolvedDecision) {
      return;
    }

    navigate(pendingRoute);
    setPendingRoute(null);
  }, [hasResolvedDecision, navigate, pendingRoute]);

  useEffect(() => {
    if (!reportsState.value || !requestedWeekRange || requestedWeekIsComplete) {
      return;
    }

    navigate(
      `${appRoutes.weeklyReport}?weekStart=${encodeURIComponent(requestedWeekRange.weekStart)}&weekEnd=${encodeURIComponent(requestedWeekRange.weekEnd)}`,
      { replace: true },
    );
  }, [
    navigate,
    reportsState.value,
    requestedWeekIsComplete,
    requestedWeekRange,
  ]);

  useEffect(() => {
    if (
      !reportsState.value ||
      !requestedWeekRange ||
      !requestedWeekIsComplete ||
      !futureWeekBlocksSelectedWeek
    ) {
      return;
    }

    navigate(
      `${appRoutes.weeklyReport}?weekStart=${encodeURIComponent(requestedWeekRange.weekStart)}&weekEnd=${encodeURIComponent(requestedWeekRange.weekEnd)}`,
      { replace: true },
    );
  }, [
    futureWeekBlocksSelectedWeek,
    navigate,
    reportsState.value,
    requestedWeekIsComplete,
    requestedWeekRange,
  ]);

  const resolveReturnRoute = useCallback((): string => {
    if (!selectedWeek) {
      return appRoutes.weeklyReport;
    }

    return `${appRoutes.weeklyReport}?weekStart=${selectedWeek.weeklyReport.weekStart}&weekEnd=${selectedWeek.weeklyReport.weekEnd}`;
  }, [selectedWeek]);

  const openOldestUnsubmittedWeek = useCallback(() => {
    if (!blockingUnsubmittedWeek) {
      return;
    }

    setIsSendOrderDialogOpen(false);
    setHasResolvedDecision(true);
    setPendingRoute(
      `${appRoutes.weeklyReport}?weekStart=${blockingUnsubmittedWeek.weekStart}&weekEnd=${blockingUnsubmittedWeek.weekEnd}`,
    );
  }, [blockingUnsubmittedWeek]);

  const markSelectedWeekAsSubmitted =
    useCallback(async (): Promise<boolean> => {
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
              effectiveSupervisorEmail ??
              parsedWeekValues.supervisorEmailPrimary,
            submitted: true,
            submittedToEmail:
              effectiveSupervisorEmail ?? parsedWeekValues.submittedToEmail,
          },
        });
        await runtime.refresh();
        await reportsState.refresh();
        notifyReportsStateChanged();
        setHasResolvedDecision(true);
        toast.success(t('sendWeeklyReport.feedback.submitted'));
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('sendWeeklyReport.feedback.submitError'), message);
        return false;
      }
    }, [
      documentData,
      emptyValue,
      parsedWeekValues,
      reportsState,
      runtime,
      selectedWeek,
      t,
      toast,
    ]);

  const submitReport = useCallback(async (): Promise<boolean> => {
    if (sendOrderBlocksSelectedWeek) {
      setIsSendOrderDialogOpen(true);
      return false;
    }

    if (futureWeekBlocksSelectedWeek) {
      return false;
    }

    setIsPending(true);
    try {
      if (ihkOselgbActive && settingsSnapshot.value && selectedWeek) {
        const outcome = await saveWeeklyReportAtIhk(
          buildIhkOselgbWeeklyReportInput({
            week: selectedWeek,
            settingsValues: settingsSnapshot.value.values,
            t,
          }),
        );

        if (outcome.status === 'failed') {
          setFailedIhkSubmission({ message: outcome.message });
          return false;
        }
      }

      return await markSelectedWeekAsSubmitted();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('ihkOselgb.feedback.saveErrorTitle'), message);
      return false;
    } finally {
      setIsPending(false);
    }
  }, [
    futureWeekBlocksSelectedWeek,
    ihkOselgbActive,
    markSelectedWeekAsSubmitted,
    saveWeeklyReportAtIhk,
    selectedWeek,
    sendOrderBlocksSelectedWeek,
    settingsSnapshot.value,
    t,
    toast,
  ]);

  const handleCopySection = useCallback(
    async (sectionIndex: number) => {
      if (!documentData) {
        return;
      }

      const section = documentData.sections[sectionIndex];
      const content = section.entries.length
        ? serializeWeeklyDocumentSectionEntries(section.entries)
        : section.emptyValue;

      try {
        await navigator.clipboard.writeText(content);
        toast.success(t('sendWeeklyReport.feedback.copied'), section.title);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('sendWeeklyReport.feedback.copyError'), message);
      }
    },
    [documentData, t, toast],
  );

  const handleCopyField = useCallback(
    async (field: WeeklyReportCopyField, value: string) => {
      if (!documentData) {
        return;
      }

      const labels: Record<WeeklyReportCopyField, string> = {
        rangeStart: documentData.rangeStartField.label,
        rangeEnd: documentData.rangeEndField.label,
        area: documentData.areaField.label,
        supervisor: documentData.supervisorField.label,
        supervisorRepeat: documentData.supervisorRepeatField.label,
      };

      try {
        await navigator.clipboard.writeText(value);
        toast.success(t('sendWeeklyReport.feedback.copied'), labels[field]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('common.errors.unknown');
        toast.error(t('sendWeeklyReport.feedback.copyError'), message);
      }
    },
    [documentData, t, toast],
  );

  const handleOpenIhk = useCallback(() => {
    if (!ihkLink) {
      return;
    }

    window.open(ihkLink, '_blank', 'noopener,noreferrer');
  }, [ihkLink]);

  const handleCancel = useCallback(() => {
    setHasResolvedDecision(true);
    setPendingRoute(resolveReturnRoute());
  }, [resolveReturnRoute]);

  const handleMarkAsSubmitted = useCallback(async () => {
    const submitted = await submitReport();

    if (!submitted) {
      return;
    }

    setPendingRoute(appRoutes.weeklyReport);
  }, [submitReport]);

  const handleMarkAsSubmittedClick = useCallback(() => {
    handleMarkAsSubmitted().catch(() => undefined);
  }, [handleMarkAsSubmitted]);

  const handleSubmitDespiteIhkFailure = useCallback(async () => {
    if (!failedIhkSubmission) {
      return;
    }

    setIsPending(true);
    try {
      const submitted = await markSelectedWeekAsSubmitted();

      if (submitted) {
        setFailedIhkSubmission(null);
        handleOpenIhk();
        setPendingRoute(appRoutes.weeklyReport);
      }
    } finally {
      setIsPending(false);
    }
  }, [failedIhkSubmission, handleOpenIhk, markSelectedWeekAsSubmitted]);

  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    onSave: submitReport,
  });
  const handleUnsavedChangesSave = useCallback(() => {
    unsavedChangesGuard.saveAndProceed().catch(() => undefined);
  }, [unsavedChangesGuard]);

  return (
    <div className="space-y-6">
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
            disabledReason={t('common.disabledReasons.missingIhkLink')}
            onClick={handleOpenIhk}
          >
            {t('sendWeeklyReport.openIhk')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-[360px]">
            <WeeklyReportWeekSelector
              id="send-weekly-report-week"
              label={t('sendWeeklyReport.selectorLabel')}
              placeholder={t('sendWeeklyReport.selectorPlaceholder')}
              completeWeeks={completeWeeks}
              selectedWeekIdentity={selectedWeekIdentity}
              onSelectedWeekIdentityChange={setSelectedWeekIdentity}
            />
          </div>

          {parsedWeekValues?.submitted ? (
            <Alert className="w-full border-amber-300 bg-amber-50 text-amber-950 lg:max-w-xl">
              <AlertTitle>{t('sendWeeklyReport.submittedTitle')}</AlertTitle>
              <AlertDescription>
                {t('sendWeeklyReport.submittedDescription')}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </SectionCard>

      {selectedWeek && documentData ? (
        <WeeklyReportDocument
          document={documentData}
          copyActionLabel={t('sendWeeklyReport.copyAction')}
          onCopyField={handleCopyField}
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

      <div className="pointer-events-none fixed bottom-14 left-6 right-6 z-50 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          className="pointer-events-auto border-primary-tint/70 bg-white shadow-md"
          disabled={isPending}
          disabledReason={t('common.disabledReasons.pending')}
          onClick={handleCancel}
        >
          {t('sendWeeklyReport.cancelAction')}
        </Button>
        <Button
          type="button"
          disabled={
            isPending ||
            !selectedWeek ||
            !documentData ||
            parsedWeekValues?.submitted ||
            futureWeekBlocksSelectedWeek ||
            sendOrderBlocksSelectedWeek
          }
          disabledReason={submitDisabledReason}
          className="pointer-events-auto bg-primary text-primary-contrast shadow-md hover:bg-primary-shade"
          onClick={handleMarkAsSubmittedClick}
        >
          <FiCheckCircle className="size-4" />
          {isPending ? t('common.loading') : t('sendWeeklyReport.action')}
        </Button>
      </div>

      <Dialog
        open={isSendOrderDialogOpen}
        onOpenChange={setIsSendOrderDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('weeklyReport.sendOrderDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('weeklyReport.sendOrderDialog.description')}
            </DialogDescription>
          </DialogHeader>
          {blockingUnsubmittedWeek ? (
            <p className="rounded-md border border-primary-tint/70 bg-primary-tint/15 p-3 text-sm text-text-color">
              {t('weeklyReport.sendOrderDialog.oldestWeek', {
                start: formatGermanDate(blockingUnsubmittedWeek.weekStart),
                end: formatGermanDate(blockingUnsubmittedWeek.weekEnd),
              })}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button type="button" onClick={openOldestUnsubmittedWeek}>
              {t('weeklyReport.sendOrderDialog.openOldest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(failedIhkSubmission)}
        onOpenChange={(open) => {
          if (!open) {
            setFailedIhkSubmission(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ihkOselgb.fallbackDialog.title')}</DialogTitle>
            <DialogDescription>
              {selectedWeek && failedIhkSubmission
                ? t('ihkOselgb.fallbackDialog.description', {
                    range: `${formatGermanDate(selectedWeek.weeklyReport.weekStart)} - ${formatGermanDate(selectedWeek.weeklyReport.weekEnd)}`,
                    message: failedIhkSubmission.message,
                  })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setFailedIhkSubmission(null)}
            >
              {t('ihkOselgb.fallbackDialog.no')}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              disabledReason={t('common.disabledReasons.pending')}
              onClick={() => {
                handleSubmitDespiteIhkFailure().catch(() => undefined);
              }}
            >
              {isPending
                ? t('common.loading')
                : t('ihkOselgb.fallbackDialog.submitAndOpen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        onSave={handleUnsavedChangesSave}
      />
    </div>
  );
}
