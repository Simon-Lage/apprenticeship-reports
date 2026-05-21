import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListChecks, Rows3 } from 'lucide-react';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import useUnsavedChangesGuard from '@/renderer/hooks/useUnsavedChangesGuard';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import DayTypeBadge from '@/renderer/components/app/DayTypeBadge';
import DateNavigationTitle from '@/renderer/components/app/DateNavigationTitle';
import ReportStickyHeader, {
  SubmittedReportBadge,
} from '@/renderer/components/app/ReportStickyHeader';
import UnsavedChangesDialog from '@/renderer/components/app/UnsavedChangesDialog';
import {
  addIsoDays,
  normalizeIsoDate,
  toLocalIsoDate,
} from '@/renderer/lib/iso-date';
import { formatGermanDate } from '@/renderer/lib/date-format';
import {
  ignoreTextSuggestion,
  mergeUiSettings,
  renameTextSuggestion,
  TextSuggestionKind,
} from '@/renderer/lib/app-settings';
import { notifyReportsStateChanged } from '@/renderer/lib/report-state-events';
import {
  isVacationFreeReason,
  parseDailyReportValues,
} from '@/renderer/lib/report-values';
import { isWeeklyReportSubmitted } from '@/shared/reports/edit-locks';
import {
  DailyReportRecord,
  ReportsState,
  WeeklyReportRecord,
} from '@/shared/reports/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import useDailyReportForm from './hooks/useDailyReportForm';
import { useDailyReportSave } from './services/daily-report-save';
import DatePickerField from './components/DatePickerField';
import DayTypeSelector from './components/DayTypeSelector';
import StatusBanner from './components/StatusBanner';
import AutoReasonText from './components/AutoReasonText';
import AbsenceConflictAlert from './components/AbsenceConflictAlert';
import FreeDaySection from './components/FreeDaySection';
import ActivitiesSection from './components/ActivitiesSection';
import TrainingsSection from './components/TrainingsSection';
import SchoolSection from './components/SchoolSection';
import StickyActionBar from './components/StickyActionBar';
import DeleteDialog from './components/DeleteDialog';
import ResetChangesDialog from './components/ResetChangesDialog';
import { resolveDailyReportUpperLimit } from './utils/calendar-date-utils';

type PendingSuggestion = {
  kind: TextSuggestionKind;
  value: string;
};

type SchoolEntryMode = 'topics' | 'lessons';

type EditableSuggestionOccurrence = {
  dailyReport: DailyReportRecord;
  weeklyReport: WeeklyReportRecord;
};

function replaceTextValue(
  values: string[],
  currentValue: string,
  nextValue: string,
) {
  return values.map((value) => (value === currentValue ? nextValue : value));
}

function reportContainsSuggestion(
  dailyReport: DailyReportRecord,
  kind: TextSuggestionKind,
  value: string,
): boolean {
  const values = parseDailyReportValues(dailyReport.values);

  if (kind === 'activities') return values.activities.includes(value);
  if (kind === 'trainings') return values.trainings.includes(value);

  return (
    values.schoolTopics.includes(value) ||
    values.lessons.some((lesson) => lesson.topics.includes(value))
  );
}

function findEditableSuggestionOccurrences(input: {
  reportsState: ReportsState;
  kind: TextSuggestionKind;
  value: string;
}): EditableSuggestionOccurrence[] {
  return Object.values(input.reportsState.weeklyReports).flatMap(
    (weeklyReport) => {
      if (isWeeklyReportSubmitted(weeklyReport)) {
        return [];
      }

      return weeklyReport.dailyReportIds
        .map((dailyReportId) => input.reportsState.dailyReports[dailyReportId])
        .filter(
          (dailyReport): dailyReport is DailyReportRecord =>
            Boolean(dailyReport) &&
            reportContainsSuggestion(dailyReport, input.kind, input.value),
        )
        .map((dailyReport) => ({ dailyReport, weeklyReport }));
    },
  );
}

function buildRenamedDailyReportValues(input: {
  dailyReport: DailyReportRecord;
  kind: TextSuggestionKind;
  currentValue: string;
  nextValue: string;
}) {
  const values = parseDailyReportValues(input.dailyReport.values);

  if (input.kind === 'activities') {
    return {
      ...values,
      activities: replaceTextValue(
        values.activities,
        input.currentValue,
        input.nextValue,
      ),
    };
  }

  if (input.kind === 'trainings') {
    return {
      ...values,
      trainings: replaceTextValue(
        values.trainings,
        input.currentValue,
        input.nextValue,
      ),
    };
  }

  return {
    ...values,
    schoolTopics: replaceTextValue(
      values.schoolTopics,
      input.currentValue,
      input.nextValue,
    ),
    lessons: values.lessons.map((lesson) => ({
      ...lesson,
      topics: replaceTextValue(
        lesson.topics,
        input.currentValue,
        input.nextValue,
      ),
    })),
  };
}

export default function DailyReportPage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [pendingSuggestionDelete, setPendingSuggestionDelete] =
    useState<PendingSuggestion | null>(null);
  const [pendingSuggestionEdit, setPendingSuggestionEdit] =
    useState<PendingSuggestion | null>(null);
  const [suggestionEditValue, setSuggestionEditValue] = useState('');
  const [updateReportsOnSuggestionEdit, setUpdateReportsOnSuggestionEdit] =
    useState(false);
  const [isSuggestionActionPending, setIsSuggestionActionPending] =
    useState(false);
  const [schoolEntryMode, setSchoolEntryMode] =
    useState<SchoolEntryMode>('topics');
  const formHook = useDailyReportForm();
  const { saveDailyReport, deleteDailyReport } = useDailyReportSave();

  const {
    form,
    isPending,
    setIsPending,
    isDatePickerOpen,
    setIsDatePickerOpen,
    calendarMonth,
    setCalendarMonth,
    lessonTopicDrafts,
    setLessonTopicDrafts,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isDeletePending,
    setIsDeletePending,
    uiSettings,
    trainingPeriod,
    reportStartDate,
    activitySuggestions,
    trainingSuggestions,
    lessonTopicSuggestions,
    selectedWeekRange,
    currentDailyReport,
    currentDailyValues,
    isEditing,
    isContentReadOnly,
    metaCardTitle,
    absenceConflict,
    activeStatusBanner,
    autoReasonText,
    isDirty,
    resolveCancelDisabledReason,
    resolveDeleteDisabledReason,
    resolveSubmitDisabledReason,
    resolveContentDisabledReason,
    selectDate,
    updateLessonField,
    setLessonFreeState,
    setDoubleLessonState,
    reorderLesson,
    resetToBaseline,
  } = formHook;

  let submitLabel = t('dailyReport.actions.save');
  if (isPending) {
    submitLabel = t('common.loading');
  } else if (isEditing) {
    submitLabel = t('dailyReport.actions.saveChanges');
  }
  const today = toLocalIsoDate(new Date());
  const reportStartLimit = normalizeIsoDate(reportStartDate) ?? today;
  const dailyUpperLimit = resolveDailyReportUpperLimit({
    reportsState: formHook.reportsState.value ?? null,
    trainingEnd: trainingPeriod.trainingEnd,
  });
  const previousCandidateDate = form.date ? addIsoDays(form.date, -1) : null;
  const nextCandidateDate = form.date ? addIsoDays(form.date, 1) : null;
  const previousDate =
    previousCandidateDate && previousCandidateDate >= reportStartLimit
      ? previousCandidateDate
      : null;
  const nextDate =
    nextCandidateDate && nextCandidateDate <= dailyUpperLimit
      ? nextCandidateDate
      : null;
  const usesSchoolLessons =
    form.dayType === 'school' && schoolEntryMode === 'lessons';
  const editableSuggestionOccurrences =
    pendingSuggestionEdit && formHook.reportsState.value
      ? findEditableSuggestionOccurrences({
          reportsState: formHook.reportsState.value,
          kind: pendingSuggestionEdit.kind,
          value: pendingSuggestionEdit.value,
        })
      : [];
  const editableSuggestionDates = editableSuggestionOccurrences.map(
    ({ dailyReport }) => formatGermanDate(dailyReport.date),
  );

  useEffect(() => {
    if (form.dayType !== 'school') {
      return;
    }

    setSchoolEntryMode(form.lessons.length ? 'lessons' : 'topics');
  }, [form.date, form.dayType, form.lessons.length]);

  const schoolModeToggleTarget =
    schoolEntryMode === 'lessons' ? 'topics' : 'lessons';
  const schoolModeToggle = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-primary-tint"
          onClick={() => {
            setSchoolEntryMode(schoolModeToggleTarget);
          }}
        >
          {schoolModeToggleTarget === 'topics' ? (
            <>
              <ListChecks className="size-4" />
              {t('dailyReport.school.showTopics')}
            </>
          ) : (
            <>
              <Rows3 className="size-4" />
              {t('dailyReport.school.showLessons')}
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        <p>
          {t(
            schoolModeToggleTarget === 'topics'
              ? 'dailyReport.school.showTopicsTooltip'
              : 'dailyReport.school.showLessonsTooltip',
          )}
        </p>
      </TooltipContent>
    </Tooltip>
  );

  const persistUiSettings = async (
    nextUiSettings: typeof uiSettings,
  ): Promise<boolean> => {
    if (!runtime.api || !formHook.settingsSnapshot.value) {
      return false;
    }

    await runtime.api.setSettingsValues(
      mergeUiSettings(formHook.settingsSnapshot.value.values, nextUiSettings),
    );
    await runtime.refresh();
    await formHook.settingsSnapshot.refresh();
    return true;
  };

  const openSuggestionEdit = (kind: TextSuggestionKind, value: string) => {
    setPendingSuggestionEdit({ kind, value });
    setSuggestionEditValue(value);
    setUpdateReportsOnSuggestionEdit(false);
  };

  const confirmSuggestionDelete = async () => {
    if (!pendingSuggestionDelete) return;

    setIsSuggestionActionPending(true);
    try {
      const saved = await persistUiSettings(
        ignoreTextSuggestion(
          uiSettings,
          pendingSuggestionDelete.kind,
          pendingSuggestionDelete.value,
        ),
      );
      if (saved) {
        toast.success(t('dailyReport.suggestions.deleted'));
      }
      setPendingSuggestionDelete(null);
    } catch (error) {
      toast.error(
        t('dailyReport.suggestions.saveError'),
        error instanceof Error ? error.message : t('common.errors.unknown'),
      );
    } finally {
      setIsSuggestionActionPending(false);
    }
  };

  const confirmSuggestionEdit = async () => {
    if (!pendingSuggestionEdit) return;

    const nextValue = suggestionEditValue.trim();
    if (!nextValue) {
      toast.error(t('dailyReport.suggestions.valueRequired'));
      return;
    }

    setIsSuggestionActionPending(true);
    try {
      const nextUiSettings = renameTextSuggestion({
        uiSettings,
        kind: pendingSuggestionEdit.kind,
        currentValue: pendingSuggestionEdit.value,
        nextValue,
      });
      const saved = await persistUiSettings(nextUiSettings);

      if (saved && updateReportsOnSuggestionEdit) {
        await Promise.all(
          editableSuggestionOccurrences.map(({ dailyReport, weeklyReport }) =>
            runtime.api!.upsertDailyReport({
              weekStart: weeklyReport.weekStart,
              weekEnd: weeklyReport.weekEnd,
              date: dailyReport.date,
              values: buildRenamedDailyReportValues({
                dailyReport,
                kind: pendingSuggestionEdit.kind,
                currentValue: pendingSuggestionEdit.value,
                nextValue,
              }),
            }),
          ),
        );
        await runtime.refresh();
        await formHook.reportsState.refresh();
        notifyReportsStateChanged();
      }

      toast.success(t('dailyReport.suggestions.saved'));
      setPendingSuggestionEdit(null);
    } catch (error) {
      toast.error(
        t('dailyReport.suggestions.saveError'),
        error instanceof Error ? error.message : t('common.errors.unknown'),
      );
    } finally {
      setIsSuggestionActionPending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    const result = await saveDailyReport(
      form,
      lessonTopicDrafts,
      selectedWeekRange!,
      currentDailyValues,
      uiSettings,
    );
    if (result.saved) {
      formHook.setForm(result.form);
      setLessonTopicDrafts(result.lessonTopicDrafts);
    }
    setIsPending(false);
  };

  const handleDelete = async () => {
    setIsDeletePending(true);
    await deleteDailyReport(
      form.date,
      selectedWeekRange!,
      Boolean(currentDailyReport),
    );
    setIsDeletePending(false);
    setIsDeleteDialogOpen(false);
  };

  const handleResetChanges = () => {
    resetToBaseline();
    setIsResetDialogOpen(false);
  };

  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    onSave: async () => {
      const result = await saveDailyReport(
        form,
        lessonTopicDrafts,
        selectedWeekRange!,
        currentDailyValues,
        uiSettings,
      );
      if (!result.saved) return false;
      formHook.setForm(result.form);
      setLessonTopicDrafts(result.lessonTopicDrafts);
      return true;
    },
  });

  return (
    <div className="space-y-4">
      <ReportStickyHeader
        title={
          <DateNavigationTitle
            title={metaCardTitle}
            previousLabel={t('common.aria.previousDay')}
            nextLabel={t('common.aria.nextDay')}
            previousDisabled={!previousDate}
            nextDisabled={!nextDate}
            onPrevious={() => {
              if (previousDate) selectDate(previousDate);
            }}
            onNext={() => {
              if (nextDate) selectDate(nextDate);
            }}
          />
        }
      >
        {form.date ? (
          <div className="inline-flex items-center rounded-full border border-primary-tint/70 bg-primary-tint/15 px-3 py-1.5 text-sm text-text-color">
            <DayTypeBadge
              dayType={form.dayType}
              freeReason={form.freeReason}
              labelClassName="font-medium"
            />
          </div>
        ) : null}
        {isContentReadOnly ? (
          <SubmittedReportBadge
            label={t('common.submittedReport.label')}
            tooltip={t('common.submittedReport.tooltip')}
          />
        ) : null}
      </ReportStickyHeader>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <SectionCard className="border-primary-tint bg-white">
          <div className="grid gap-4 md:grid-cols-2">
            <DatePickerField
              date={form.date}
              isOpen={isDatePickerOpen}
              onOpenChange={setIsDatePickerOpen}
              calendarMonth={calendarMonth}
              onCalendarMonthChange={setCalendarMonth}
              onSelectDate={selectDate}
              reportsState={formHook.reportsState.value ?? null}
              reportStartDate={reportStartDate}
              trainingEnd={trainingPeriod.trainingEnd}
            />
            <div className="flex flex-col items-end gap-2">
              <DayTypeSelector
                dayType={form.dayType}
                freeReason={form.freeReason}
                isContentReadOnly={isContentReadOnly}
                isPending={isPending}
                isDeletePending={isDeletePending}
                contentDisabledReason={resolveContentDisabledReason()}
                onChange={(dayType) =>
                  formHook.setForm((current) => ({ ...current, dayType }))
                }
              />
              <AutoReasonText
                text={autoReasonText}
                className="max-w-full text-right md:max-w-md"
              />
            </div>
          </div>
          <StatusBanner data={activeStatusBanner} />
        </SectionCard>

        <AbsenceConflictAlert conflict={absenceConflict} />

        <fieldset
          disabled={isContentReadOnly || isPending || isDeletePending}
          className={isContentReadOnly ? 'space-y-4 opacity-80' : 'space-y-4'}
        >
          {form.dayType === 'free' ? (
            <>
              <FreeDaySection
                freeReason={form.freeReason}
                onChange={(value) =>
                  formHook.setForm((current) => ({
                    ...current,
                    freeReason: value,
                  }))
                }
              />
              {isVacationFreeReason(form.freeReason) ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <ActivitiesSection
                    title={t('dailyReport.activities.title')}
                    items={form.activities}
                    placeholder={t('dailyReport.activities.placeholder')}
                    suggestions={activitySuggestions}
                    addLabel={t('dailyReport.list.addEntry')}
                    removeLabel={t('dailyReport.list.removeEntry')}
                    onChange={(items) =>
                      formHook.setForm((current) => ({
                        ...current,
                        activities: items,
                      }))
                    }
                    editSuggestionLabel={t('dailyReport.suggestions.edit')}
                    deleteSuggestionLabel={t('dailyReport.suggestions.delete')}
                    onEditSuggestion={(value) =>
                      openSuggestionEdit('activities', value)
                    }
                    onDeleteSuggestion={(value) =>
                      setPendingSuggestionDelete({
                        kind: 'activities',
                        value,
                      })
                    }
                  />
                  <TrainingsSection
                    items={form.trainings}
                    suggestions={trainingSuggestions}
                    onChange={(items) =>
                      formHook.setForm((current) => ({
                        ...current,
                        trainings: items,
                      }))
                    }
                    editSuggestionLabel={t('dailyReport.suggestions.edit')}
                    deleteSuggestionLabel={t('dailyReport.suggestions.delete')}
                    onEditSuggestion={(value) =>
                      openSuggestionEdit('trainings', value)
                    }
                    onDeleteSuggestion={(value) =>
                      setPendingSuggestionDelete({
                        kind: 'trainings',
                        value,
                      })
                    }
                  />
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <ActivitiesSection
                  title={
                    form.dayType === 'school'
                      ? t('dailyReport.activities.workTitleForSchoolDay')
                      : t('dailyReport.activities.title')
                  }
                  items={form.activities}
                  placeholder={t('dailyReport.activities.placeholder')}
                  suggestions={activitySuggestions}
                  addLabel={t('dailyReport.list.addEntry')}
                  removeLabel={t('dailyReport.list.removeEntry')}
                  onChange={(items) =>
                    formHook.setForm((current) => ({
                      ...current,
                      activities: items,
                    }))
                  }
                  editSuggestionLabel={t('dailyReport.suggestions.edit')}
                  deleteSuggestionLabel={t('dailyReport.suggestions.delete')}
                  onEditSuggestion={(value) =>
                    openSuggestionEdit('activities', value)
                  }
                  onDeleteSuggestion={(value) =>
                    setPendingSuggestionDelete({
                      kind: 'activities',
                      value,
                    })
                  }
                />
                <TrainingsSection
                  items={form.trainings}
                  suggestions={trainingSuggestions}
                  onChange={(items) =>
                    formHook.setForm((current) => ({
                      ...current,
                      trainings: items,
                    }))
                  }
                  editSuggestionLabel={t('dailyReport.suggestions.edit')}
                  deleteSuggestionLabel={t('dailyReport.suggestions.delete')}
                  onEditSuggestion={(value) =>
                    openSuggestionEdit('trainings', value)
                  }
                  onDeleteSuggestion={(value) =>
                    setPendingSuggestionDelete({
                      kind: 'trainings',
                      value,
                    })
                  }
                />
              </div>
              {form.dayType === 'school' && schoolEntryMode === 'topics' ? (
                <ActivitiesSection
                  title={t('dailyReport.school.title')}
                  action={schoolModeToggle}
                  items={form.schoolTopics}
                  placeholder={t('dailyReport.school.topicPlaceholder')}
                  suggestions={lessonTopicSuggestions}
                  addLabel={t('dailyReport.list.addEntry')}
                  removeLabel={t('dailyReport.list.removeEntry')}
                  onChange={(items) =>
                    formHook.setForm((current) => ({
                      ...current,
                      schoolTopics: items,
                    }))
                  }
                  editSuggestionLabel={t('dailyReport.suggestions.edit')}
                  deleteSuggestionLabel={t('dailyReport.suggestions.delete')}
                  onEditSuggestion={(value) =>
                    openSuggestionEdit('schoolTopics', value)
                  }
                  onDeleteSuggestion={(value) =>
                    setPendingSuggestionDelete({
                      kind: 'schoolTopics',
                      value,
                    })
                  }
                />
              ) : null}
              {usesSchoolLessons ? (
                <SchoolSection
                  action={schoolModeToggle}
                  lessons={form.lessons}
                  expandedDoubleLessonPairs={form.expandedDoubleLessonPairs}
                  onSetLessonFreeState={setLessonFreeState}
                  onSetDoubleLessonState={setDoubleLessonState}
                  onReorderLesson={reorderLesson}
                  onUpdateLessonField={updateLessonField}
                  onUpdateLessonTopics={(lessonNumber, topics) =>
                    formHook.setForm((current) => ({
                      ...current,
                      lessons: current.lessons.map((lesson) =>
                        lesson.lesson === lessonNumber
                          ? { ...lesson, topics }
                          : lesson,
                      ),
                    }))
                  }
                  subjectSuggestions={uiSettings.subjects}
                  teacherSuggestions={uiSettings.teachers}
                  topicSuggestions={lessonTopicSuggestions}
                  editTopicSuggestionLabel={t('dailyReport.suggestions.edit')}
                  deleteTopicSuggestionLabel={t(
                    'dailyReport.suggestions.delete',
                  )}
                  onEditTopicSuggestion={(value) =>
                    openSuggestionEdit('schoolTopics', value)
                  }
                  onDeleteTopicSuggestion={(value) =>
                    setPendingSuggestionDelete({
                      kind: 'schoolTopics',
                      value,
                    })
                  }
                />
              ) : null}
            </>
          )}
        </fieldset>

        <StickyActionBar
          isEditing={isEditing}
          isPending={isPending}
          isDeletePending={isDeletePending}
          isContentReadOnly={isContentReadOnly}
          isDirty={isDirty}
          submitLabel={submitLabel}
          cancelDisabledReason={resolveCancelDisabledReason()}
          deleteDisabledReason={resolveDeleteDisabledReason()}
          submitDisabledReason={resolveSubmitDisabledReason()}
          onCancel={() => setIsResetDialogOpen(true)}
          onDelete={() => setIsDeleteDialogOpen(true)}
        />
      </form>
      <ResetChangesDialog
        open={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
        onConfirm={handleResetChanges}
      />
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        isDeletePending={isDeletePending}
        date={form.date}
        onConfirm={handleDelete}
      />
      <AlertDialog
        open={Boolean(pendingSuggestionDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingSuggestionDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dailyReport.suggestions.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dailyReport.suggestions.deleteDescription', {
                value: pendingSuggestionDelete?.value ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSuggestionActionPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isSuggestionActionPending}
              onClick={(event) => {
                event.preventDefault();
                confirmSuggestionDelete().catch(() => undefined);
              }}
            >
              {isSuggestionActionPending
                ? t('common.loading')
                : t('dailyReport.suggestions.deleteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={Boolean(pendingSuggestionEdit)}
        onOpenChange={(open) => {
          if (!open) setPendingSuggestionEdit(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dailyReport.suggestions.editTitle')}</DialogTitle>
            <DialogDescription>
              {editableSuggestionOccurrences.length
                ? t('dailyReport.suggestions.editDescriptionWithReports', {
                    dates: editableSuggestionDates.join(', '),
                  })
                : t('dailyReport.suggestions.editDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={suggestionEditValue}
              onChange={(event) => setSuggestionEditValue(event.target.value)}
            />
            {editableSuggestionOccurrences.length ? (
              <div className="flex items-start gap-2 text-sm text-text-color/80">
                <input
                  id="daily-report-update-suggestion-reports"
                  type="checkbox"
                  className="mt-1"
                  checked={updateReportsOnSuggestionEdit}
                  onChange={(event) =>
                    setUpdateReportsOnSuggestionEdit(event.target.checked)
                  }
                />
                <label htmlFor="daily-report-update-suggestion-reports">
                  {t('dailyReport.suggestions.updateReports')}
                </label>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSuggestionActionPending}
              onClick={() => setPendingSuggestionEdit(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              disabled={isSuggestionActionPending}
              onClick={() => confirmSuggestionEdit().catch(() => undefined)}
            >
              {isSuggestionActionPending
                ? t('common.loading')
                : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={unsavedChangesGuard.isOpen}
        isPending={unsavedChangesGuard.isPending}
        onCancel={unsavedChangesGuard.cancel}
        onDiscard={unsavedChangesGuard.discard}
        onSave={() =>
          unsavedChangesGuard.saveAndProceed().catch(() => undefined)
        }
      />
    </div>
  );
}
