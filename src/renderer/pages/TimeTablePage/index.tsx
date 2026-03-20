import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Pencil, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';

import CollectionAccordion from '@/renderer/components/app/CollectionAccordion';
import EditableCollectionList from '@/renderer/components/app/EditableCollectionList';
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
  renameUiCatalogEntry,
  TimetableSlot,
  UiCatalogEntryKind,
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
  action: 'add' | 'delete';
  kind: 'teacher' | 'subject';
  value: string;
};

type EditingCatalogEntry = {
  kind: UiCatalogEntryKind;
  value: string;
  draft: string;
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

function removeCatalogValueFromSlots(
  slots: TimetableSlot[],
  key: UiCatalogEntryKind,
  value: string,
): TimetableSlot[] {
  return slots
    .map((slot) => ({
      ...slot,
      [key]: slot[key] === value ? '' : slot[key],
    }))
    .filter((slot) => slot.subject || slot.teacher)
    .sort((left, right) => left.lesson - right.lesson);
}

function removeCatalogValueFromTimetable(
  timetable: UiSettingsValues['timetable'],
  key: UiCatalogEntryKind,
  value: string,
): UiSettingsValues['timetable'] {
  return {
    monday: removeCatalogValueFromSlots(timetable.monday, key, value),
    tuesday: removeCatalogValueFromSlots(timetable.tuesday, key, value),
    wednesday: removeCatalogValueFromSlots(timetable.wednesday, key, value),
    thursday: removeCatalogValueFromSlots(timetable.thursday, key, value),
    friday: removeCatalogValueFromSlots(timetable.friday, key, value),
  };
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
  const [editingCatalogEntry, setEditingCatalogEntry] =
    useState<EditingCatalogEntry | null>(null);

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
      toast.error(
        t('timeTable.feedback.saveError'),
        t('timeTable.feedback.teacherRequired'),
      );
      return;
    }
    if (teacherOptions.includes(nextValue)) {
      toast.error(
        t('timeTable.feedback.saveError'),
        t('timeTable.feedback.teacherExists'),
      );
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
      toast.error(
        t('timeTable.feedback.saveError'),
        t('timeTable.feedback.subjectRequired'),
      );
      return;
    }
    if (subjectOptions.includes(nextValue)) {
      toast.error(
        t('timeTable.feedback.saveError'),
        t('timeTable.feedback.subjectExists'),
      );
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

  function startCatalogEdit(kind: UiCatalogEntryKind, value: string) {
    setEditingCatalogEntry({
      kind,
      value,
      draft: value,
    });
  }

  function saveCatalogEdit() {
    if (!editingCatalogEntry) {
      return;
    }

    const nextValue = editingCatalogEntry.draft.trim();
    const currentValue = editingCatalogEntry.value.trim();
    const isTeacher = editingCatalogEntry.kind === 'teacher';
    const duplicateExists = isTeacher
      ? teacherOptions.includes(nextValue) && nextValue !== currentValue
      : subjectOptions.includes(nextValue) && nextValue !== currentValue;

    if (!nextValue) {
      toast.error(
        t('timeTable.feedback.saveError'),
        t(
          isTeacher
            ? 'timeTable.feedback.teacherRequired'
            : 'timeTable.feedback.subjectRequired',
        ),
      );
      return;
    }

    if (duplicateExists) {
      toast.error(
        t('timeTable.feedback.saveError'),
        t(
          isTeacher
            ? 'timeTable.feedback.teacherExists'
            : 'timeTable.feedback.subjectExists',
        ),
      );
      return;
    }

    setUiSettings((current) =>
      current
        ? renameUiCatalogEntry({
            uiSettings: current,
            kind: editingCatalogEntry.kind,
            currentValue: editingCatalogEntry.value,
            nextValue,
          })
        : current,
    );
    setEditingCatalogEntry(null);
  }

  function cancelCatalogEdit() {
    setEditingCatalogEntry(null);
  }

  function removeCatalogEntry(kind: UiCatalogEntryKind, value: string) {
    setPendingCatalogEntry({
      action: 'delete',
      kind,
      value,
    });
  }

  function confirmCatalogRemoval(kind: UiCatalogEntryKind, value: string) {
    setUiSettings((current) => {
      if (!current) {
        return current;
      }

      if (kind === 'teacher') {
        return {
          ...current,
          teachers: current.teachers.filter((candidate) => candidate !== value),
          timetable: removeCatalogValueFromTimetable(
            current.timetable,
            kind,
            value,
          ),
        };
      }

      return {
        ...current,
        subjects: current.subjects.filter((candidate) => candidate !== value),
        timetable: removeCatalogValueFromTimetable(
          current.timetable,
          kind,
          value,
        ),
      };
    });

    if (
      editingCatalogEntry?.kind === kind &&
      editingCatalogEntry.value === value
    ) {
      setEditingCatalogEntry(null);
    }
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
      action: 'add',
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
    <div className="space-y-4 ">
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
        <CollectionAccordion summary={t('timeTable.config.summary')}>
          <div className="space-y-3">
            <EditableCollectionList
              addSlot={
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
                      <Plus className="size-4" />
                      {t('common.add')}
                    </Button>
                  </div>
                </FormField>
              }
              items={teacherOptions}
              getKey={(teacher) => teacher}
              renderItem={(teacher) =>
                editingCatalogEntry?.kind === 'teacher' &&
                editingCatalogEntry.value === teacher ? (
                  <Input
                    value={editingCatalogEntry.draft}
                    onChange={(event) =>
                      setEditingCatalogEntry((current) =>
                        current
                          ? {
                              ...current,
                              draft: event.target.value,
                            }
                          : current,
                      )
                    }
                    onKeyDown={(event) =>
                      handleEnterAction(event, () => {
                        saveCatalogEdit();
                      })
                    }
                  />
                ) : (
                  <span>{teacher}</span>
                )
              }
              renderActions={(teacher) =>
                editingCatalogEntry?.kind === 'teacher' &&
                editingCatalogEntry.value === teacher ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t('timeTable.config.actions.saveEntry')}
                      title={t('timeTable.config.actions.saveEntry')}
                      onClick={() => {
                        saveCatalogEdit();
                      }}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t('timeTable.config.actions.cancelEdit')}
                      title={t('timeTable.config.actions.cancelEdit')}
                      onClick={() => {
                        cancelCatalogEdit();
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t('timeTable.config.actions.editEntry', {
                        value: teacher,
                      })}
                      title={t('timeTable.config.actions.editEntry', {
                        value: teacher,
                      })}
                      onClick={() => {
                        startCatalogEdit('teacher', teacher);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t('timeTable.config.actions.removeEntry', {
                        value: teacher,
                      })}
                      title={t('timeTable.config.actions.removeEntry', {
                        value: teacher,
                      })}
                      onClick={() => {
                        removeCatalogEntry('teacher', teacher);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )
              }
            />
          </div>
          <div className="space-y-3">
            <EditableCollectionList
              addSlot={
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
                      <Plus className="size-4" />
                      {t('common.add')}
                    </Button>
                  </div>
                </FormField>
              }
              items={subjectOptions}
              getKey={(subject) => subject}
              renderItem={(subject) =>
                editingCatalogEntry?.kind === 'subject' &&
                editingCatalogEntry.value === subject ? (
                  <Input
                    value={editingCatalogEntry.draft}
                    onChange={(event) =>
                      setEditingCatalogEntry((current) =>
                        current
                          ? {
                              ...current,
                              draft: event.target.value,
                            }
                          : current,
                      )
                    }
                    onKeyDown={(event) =>
                      handleEnterAction(event, () => {
                        saveCatalogEdit();
                      })
                    }
                  />
                ) : (
                  <span>{subject}</span>
                )
              }
              renderActions={(subject) =>
                editingCatalogEntry?.kind === 'subject' &&
                editingCatalogEntry.value === subject ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t('timeTable.config.actions.saveEntry')}
                      title={t('timeTable.config.actions.saveEntry')}
                      onClick={() => {
                        saveCatalogEdit();
                      }}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t('timeTable.config.actions.cancelEdit')}
                      title={t('timeTable.config.actions.cancelEdit')}
                      onClick={() => {
                        cancelCatalogEdit();
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t('timeTable.config.actions.editEntry', {
                        value: subject,
                      })}
                      title={t('timeTable.config.actions.editEntry', {
                        value: subject,
                      })}
                      onClick={() => {
                        startCatalogEdit('subject', subject);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t('timeTable.config.actions.removeEntry', {
                        value: subject,
                      })}
                      title={t('timeTable.config.actions.removeEntry', {
                        value: subject,
                      })}
                      onClick={() => {
                        removeCatalogEntry('subject', subject);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )
              }
            />
          </div>
        </CollectionAccordion>
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
      <div className="sticky bottom-0 z-20 rounded-xl border border-primary-tint/75 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !isDirty}
              className="border-primary-tint"
              onClick={() => {
                if (baselineUiSettings) {
                  setUiSettings(baselineUiSettings);
                  toast.info(t('timeTable.reset'));
                }
              }}
            >
              <RotateCcw className="size-4" />
              {t('timeTable.reset')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={isPending || !isDirty}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={() => {
                saveTimeTable().catch(() => undefined);
              }}
            >
              <Save className="size-4" />
              {isPending ? t('common.loading') : t('timeTable.save')}
            </Button>
          </div>
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
              {pendingCatalogEntry?.action === 'delete'
                ? pendingCatalogEntry.kind === 'teacher'
                  ? t('timeTable.confirmDelete.teacherTitle')
                  : t('timeTable.confirmDelete.subjectTitle')
                : pendingCatalogEntry?.kind === 'teacher'
                  ? t('timeTable.confirmAdd.teacherTitle')
                  : t('timeTable.confirmAdd.subjectTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCatalogEntry
                ? t(
                    pendingCatalogEntry.action === 'delete'
                      ? 'timeTable.confirmDelete.description'
                      : 'timeTable.confirmAdd.description',
                    {
                      value: pendingCatalogEntry.value,
                    },
                  )
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {pendingCatalogEntry?.action === 'delete'
                ? t('timeTable.confirmDelete.cancel')
                : t('timeTable.confirmAdd.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={(event) => {
                event.preventDefault();

                if (!pendingCatalogEntry) {
                  return;
                }

                if (pendingCatalogEntry.action === 'delete') {
                  confirmCatalogRemoval(
                    pendingCatalogEntry.kind,
                    pendingCatalogEntry.value,
                  );
                } else if (pendingCatalogEntry.kind === 'teacher') {
                  addTeacher(pendingCatalogEntry.value);
                } else {
                  addSubject(pendingCatalogEntry.value);
                }

                setPendingCatalogEntry(null);
              }}
            >
              {pendingCatalogEntry?.action === 'delete'
                ? t('timeTable.confirmDelete.confirm')
                : t('timeTable.confirmAdd.confirm')}
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
