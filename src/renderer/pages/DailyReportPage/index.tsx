import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export default function DailyReportPage() {
  const { t } = useTranslation();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
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
            <FreeDaySection
              freeReason={form.freeReason}
              onChange={(value) =>
                formHook.setForm((current) => ({
                  ...current,
                  freeReason: value,
                }))
              }
            />
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
                />
              </div>
              {form.dayType === 'school' && (
                <SchoolSection
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
                />
              )}
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
