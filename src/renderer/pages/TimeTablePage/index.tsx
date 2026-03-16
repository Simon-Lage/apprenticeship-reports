import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormField } from '@/renderer/components/app/FormField';
import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import UnsavedChangesDialog from '@/renderer/components/app/UnsavedChangesDialog';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import useUnsavedChangesGuard from '@/renderer/hooks/useUnsavedChangesGuard';
import { useSettingsSnapshot } from '@/renderer/hooks/useKernelData';
import {
  mergeUiSettings,
  parseUiSettings,
  TimetableSlot,
  UiSettingsValues,
  weekDayKeys,
  WeekDayKey,
} from '@/renderer/lib/app-settings';
import handleEnterAction from '@/renderer/lib/keyboard';
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

const lessonCount = 10;

type PendingCatalogEntry = {
  kind: 'teacher' | 'subject';
  value: string;
};

function updateSlots(
  slots: TimetableSlot[],
  lesson: number,
  key: 'teacher' | 'subject',
  value: string,
): TimetableSlot[] {
  const currentSlot = slots.find((slot) => slot.lesson === lesson) ?? {
    lesson,
    subject: '',
    teacher: '',
  };
  const nextSlot = {
    ...currentSlot,
    [key]: value.trim(),
  };
  const nextSlots = slots.filter((slot) => slot.lesson !== lesson);

  if (nextSlot.subject || nextSlot.teacher) {
    nextSlots.push(nextSlot);
  }

  return nextSlots.sort((left, right) => left.lesson - right.lesson);
}

export default function TimeTablePage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const toast = useToastController();
  const settingsSnapshot = useSettingsSnapshot();
  const [uiSettings, setUiSettings] = useState<UiSettingsValues | null>(null);
  const [newTeacher, setNewTeacher] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [pendingCatalogEntry, setPendingCatalogEntry] =
    useState<PendingCatalogEntry | null>(null);

  useEffect(() => {
    if (!settingsSnapshot.value) {
      return;
    }

    setUiSettings(parseUiSettings(settingsSnapshot.value.values));
  }, [settingsSnapshot.value]);

  const teacherOptions = useMemo(
    () => uiSettings?.teachers ?? [],
    [uiSettings?.teachers],
  );
  const subjectOptions = useMemo(
    () => uiSettings?.subjects ?? [],
    [uiSettings?.subjects],
  );
  const baselineUiSettings = settingsSnapshot.value
    ? parseUiSettings(settingsSnapshot.value.values)
    : null;
  const isDirty =
    Boolean(uiSettings) &&
    Boolean(baselineUiSettings) &&
    JSON.stringify(uiSettings) !== JSON.stringify(baselineUiSettings);

  function addTeacher(value: string) {
    const nextValue = value.trim();
    if (!nextValue) {
      return;
    }
    setUiSettings((current) =>
      current && !current.teachers.includes(nextValue)
        ? {
            ...current,
            teachers: [...current.teachers, nextValue].sort((left, right) =>
              left.localeCompare(right),
            ),
          }
        : current,
    );
  }

  function addSubject(value: string) {
    const nextValue = value.trim();
    if (!nextValue) {
      return;
    }
    setUiSettings((current) =>
      current && !current.subjects.includes(nextValue)
        ? {
            ...current,
            subjects: [...current.subjects, nextValue].sort((left, right) =>
              left.localeCompare(right),
            ),
          }
        : current,
    );
  }

  function updateSlot(
    day: WeekDayKey,
    lesson: number,
    key: 'teacher' | 'subject',
    value: string,
  ) {
    setUiSettings((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        timetable: {
          ...current.timetable,
          [day]: updateSlots(current.timetable[day], lesson, key, value),
        },
      };
    });
  }

  function requestCatalogAdd(kind: 'teacher' | 'subject', value: string) {
    const nextValue = value.trim();

    if (!nextValue) {
      return;
    }

    if (kind === 'teacher' && teacherOptions.includes(nextValue)) {
      return;
    }

    if (kind === 'subject' && subjectOptions.includes(nextValue)) {
      return;
    }

    setPendingCatalogEntry({
      kind,
      value: nextValue,
    });
  }

  async function saveTimeTable() {
    if (!runtime.api || !settingsSnapshot.value || !uiSettings) {
      return false;
    }

    setIsPending(true);

    try {
      await runtime.api.setSettingsValues(
        mergeUiSettings(settingsSnapshot.value.values, uiSettings),
      );
      await runtime.refresh();
      await settingsSnapshot.refresh();
      toast.success(t('timeTable.feedback.saved'));
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('timeTable.feedback.saveError'), message);
      return false;
    } finally {
      setIsPending(false);
    }
  }

  const unsavedChangesGuard = useUnsavedChangesGuard({
    isDirty,
    onSave: async () => saveTimeTable(),
  });

  if (!uiSettings) {
    return null;
  }

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title={t('timeTable.title')}
        description={t('timeTable.description')}
      />
      <SectionCard className="border-primary-tint bg-white">
        <div className="overflow-x-auto rounded-md border border-primary-tint/60">
          <table className="w-full min-w-[900px] border-separate border-spacing-2">
            <thead>
              <tr>
                <th className="sticky top-0 z-20 rounded-md bg-primary px-2 py-2 text-left text-sm text-primary-contrast">
                  {t('timeTable.schedule.lesson')}
                </th>
                {weekDayKeys.map((day) => (
                  <th
                    key={day}
                    className="sticky top-0 z-20 rounded-md bg-primary px-2 py-2 text-left text-sm text-primary-contrast"
                  >
                    {t(`timeTable.days.${day}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: lessonCount }).map((_, index) => {
                const lesson = index + 1;
                return (
                  <tr key={lesson}>
                    <td className="rounded-md border border-primary-tint/70 bg-primary-tint/20 px-2 py-2 text-sm font-medium text-text-color">
                      {lesson}
                    </td>
                    {weekDayKeys.map((day) => {
                      const slot = uiSettings.timetable[day].find(
                        (candidate) => candidate.lesson === lesson,
                      );
                      return (
                        <td
                          key={`${day}-${lesson}`}
                          className="rounded-md border border-primary-tint/60 bg-white px-2 py-2"
                        >
                          <div className="grid gap-2">
                            <Input
                              value={slot?.subject ?? ''}
                              placeholder={t(
                                'timeTable.schedule.subjectPlaceholder',
                              )}
                              list="subjects-list"
                              onChange={(event) =>
                                updateSlot(
                                  day,
                                  lesson,
                                  'subject',
                                  event.target.value,
                                )
                              }
                              onBlur={(event) =>
                                requestCatalogAdd('subject', event.target.value)
                              }
                            />
                            <Input
                              value={slot?.teacher ?? ''}
                              placeholder={t(
                                'timeTable.schedule.teacherPlaceholder',
                              )}
                              list="teachers-list"
                              onChange={(event) =>
                                updateSlot(
                                  day,
                                  lesson,
                                  'teacher',
                                  event.target.value,
                                )
                              }
                              onBlur={(event) =>
                                requestCatalogAdd('teacher', event.target.value)
                              }
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard
        title={t('timeTable.config.title')}
        description={t('timeTable.config.description')}
        className="border-primary-tint bg-white"
      >
        <details className="group rounded-md border border-primary-tint/80 p-3">
          <summary className="cursor-pointer text-sm font-medium text-text-color">
            {t('timeTable.config.summary')}
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <FormField
                id="new-teacher"
                label={t('timeTable.config.newTeacher')}
              >
                <div className="flex gap-2">
                  <Input
                    id="new-teacher"
                    value={newTeacher}
                    onKeyDown={(event) =>
                      handleEnterAction(event, () => {
                        addTeacher(newTeacher);
                        setNewTeacher('');
                      })
                    }
                    onChange={(event) => setNewTeacher(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-primary-tint"
                    onClick={() => {
                      addTeacher(newTeacher);
                      setNewTeacher('');
                    }}
                  >
                    {t('common.add')}
                  </Button>
                </div>
              </FormField>
              <ul className="space-y-1 text-sm">
                {teacherOptions.map((teacher) => (
                  <li
                    key={teacher}
                    className="flex items-center justify-between rounded-md border border-primary-tint/70 px-3 py-2"
                  >
                    {teacher}
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        setUiSettings((current) =>
                          current
                            ? {
                                ...current,
                                teachers: current.teachers.filter(
                                  (candidate) => candidate !== teacher,
                                ),
                              }
                            : current,
                        )
                      }
                    >
                      {t('common.remove')}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <FormField
                id="new-subject"
                label={t('timeTable.config.newSubject')}
              >
                <div className="flex gap-2">
                  <Input
                    id="new-subject"
                    value={newSubject}
                    onKeyDown={(event) =>
                      handleEnterAction(event, () => {
                        addSubject(newSubject);
                        setNewSubject('');
                      })
                    }
                    onChange={(event) => setNewSubject(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-primary-tint"
                    onClick={() => {
                      addSubject(newSubject);
                      setNewSubject('');
                    }}
                  >
                    {t('common.add')}
                  </Button>
                </div>
              </FormField>
              <ul className="space-y-1 text-sm">
                {subjectOptions.map((subject) => (
                  <li
                    key={subject}
                    className="flex items-center justify-between rounded-md border border-primary-tint/70 px-3 py-2"
                  >
                    {subject}
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        setUiSettings((current) =>
                          current
                            ? {
                                ...current,
                                subjects: current.subjects.filter(
                                  (candidate) => candidate !== subject,
                                ),
                              }
                            : current,
                        )
                      }
                    >
                      {t('common.remove')}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </SectionCard>
      <datalist id="teachers-list">
        {teacherOptions.map((teacher) => (
          <option key={teacher} value={teacher}>
            {teacher}
          </option>
        ))}
      </datalist>
      <datalist id="subjects-list">
        {subjectOptions.map((subject) => (
          <option key={subject} value={subject}>
            {subject}
          </option>
        ))}
      </datalist>
      <div className="sticky bottom-3 z-20 rounded-xl border border-primary-tint/75 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={isPending}
            className="bg-primary text-primary-contrast hover:bg-primary-shade"
            onClick={() => {
              saveTimeTable().catch(() => undefined);
            }}
          >
            {isPending ? t('common.loading') : t('timeTable.save')}
          </Button>
        </div>
      </div>
      <AlertDialog
        open={Boolean(pendingCatalogEntry)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingCatalogEntry(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingCatalogEntry?.kind === 'teacher'
                ? t('timeTable.confirmAdd.teacherTitle')
                : t('timeTable.confirmAdd.subjectTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCatalogEntry
                ? t('timeTable.confirmAdd.description', {
                    value: pendingCatalogEntry.value,
                  })
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('timeTable.confirmAdd.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={(event) => {
                event.preventDefault();

                if (!pendingCatalogEntry) {
                  return;
                }

                if (pendingCatalogEntry.kind === 'teacher') {
                  addTeacher(pendingCatalogEntry.value);
                } else {
                  addSubject(pendingCatalogEntry.value);
                }

                setPendingCatalogEntry(null);
              }}
            >
              {t('timeTable.confirmAdd.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
