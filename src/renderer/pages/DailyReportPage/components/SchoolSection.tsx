import {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical } from 'lucide-react';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import SuggestionInput from '@/renderer/components/app/SuggestionInput';
import { Switch } from '@/components/ui/switch';
import { SchoolLessonInput } from '@/renderer/lib/report-values';
import { cn } from '@/renderer/lib/utils';
import { schoolLessonNumbers } from '../utils/lesson-utils';
import EditableTextEntryList from './EditableTextEntryList';

type LessonBlock = {
  start: number;
  lessonCount: number;
  lesson: SchoolLessonInput;
  secondLesson: SchoolLessonInput | null;
  isFreeLesson: boolean;
  canUseDoubleLesson: boolean;
  isDoubleLesson: boolean;
};

type SchoolSectionProps = {
  action?: ReactNode;
  lessons: SchoolLessonInput[];
  expandedDoubleLessonPairs: number[];
  onSetLessonFreeState: (lessonNumber: number, isFreeLesson: boolean) => void;
  onSetDoubleLessonState: (pairStart: number, isDoubleLesson: boolean) => void;
  onReorderLesson: (
    sourceLessonNumber: number,
    targetLessonNumber: number,
    lessonCount?: number,
  ) => void;
  onUpdateLessonField: (
    lessonNumber: number,
    key: 'subject' | 'teacher',
    value: string,
  ) => void;
  onUpdateLessonTopics: (lessonNumber: number, topics: string[]) => void;
  subjectSuggestions: string[];
  teacherSuggestions: string[];
  topicSuggestions: string[];
  editTopicSuggestionLabel?: string;
  deleteTopicSuggestionLabel?: string;
  onEditTopicSuggestion?: (value: string) => void;
  onDeleteTopicSuggestion?: (value: string) => void;
};

function mergeTopics(...topicLists: string[][]): string[] {
  return Array.from(new Set(topicLists.flat()));
}

function canUseDoubleLesson(
  lesson: SchoolLessonInput,
  secondLesson: SchoolLessonInput | null,
): secondLesson is SchoolLessonInput {
  return Boolean(
    secondLesson &&
      lesson.lesson % 2 === 1 &&
      lesson.subject.trim().length > 0 &&
      lesson.teacher.trim().length > 0 &&
      lesson.subject === secondLesson.subject &&
      lesson.teacher === secondLesson.teacher,
  );
}

export default function SchoolSection({
  action,
  lessons,
  expandedDoubleLessonPairs,
  onSetLessonFreeState,
  onSetDoubleLessonState,
  onReorderLesson,
  onUpdateLessonField,
  onUpdateLessonTopics,
  subjectSuggestions,
  teacherSuggestions,
  topicSuggestions,
  editTopicSuggestionLabel,
  deleteTopicSuggestionLabel,
  onEditTopicSuggestion,
  onDeleteTopicSuggestion,
}: SchoolSectionProps) {
  const { t } = useTranslation();
  const blockRefs = useRef(new Map<number, HTMLDivElement>());
  const [dragState, setDragState] = useState<{
    blockStart: number;
    lessonCount: number;
    targetBlockIndex: number;
  } | null>(null);
  const dragStateRef = useRef(dragState);
  const lessonsByNumber = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.lesson, lesson])),
    [lessons],
  );
  const expandedDoubleLessonPairSet = useMemo(
    () => new Set(expandedDoubleLessonPairs),
    [expandedDoubleLessonPairs],
  );
  const lessonBlocks = useMemo(() => {
    const blocks: LessonBlock[] = [];
    const skippedLessonNumbers = new Set<number>();

    schoolLessonNumbers.forEach((lessonNumber) => {
      if (skippedLessonNumbers.has(lessonNumber)) return;

      const lesson = lessonsByNumber.get(lessonNumber) ?? {
        lesson: lessonNumber,
        subject: '',
        teacher: '',
        topics: [],
      };
      const secondLesson = lessonsByNumber.get(lessonNumber + 1) ?? null;
      const isFreeLesson = !lessonsByNumber.has(lessonNumber);
      const canUseDouble = canUseDoubleLesson(lesson, secondLesson);
      const isDoubleLesson =
        canUseDouble &&
        !expandedDoubleLessonPairSet.has(lessonNumber) &&
        (!lesson.topics.length || !secondLesson.topics.length);

      if (isDoubleLesson) skippedLessonNumbers.add(lessonNumber + 1);

      blocks.push({
        start: lessonNumber,
        lessonCount: isDoubleLesson ? 2 : 1,
        lesson,
        secondLesson: isDoubleLesson ? secondLesson : null,
        isFreeLesson,
        canUseDoubleLesson: canUseDouble,
        isDoubleLesson,
      });
    });

    return blocks;
  }, [expandedDoubleLessonPairSet, lessonsByNumber]);
  const lessonBlocksRef = useRef(lessonBlocks);

  lessonBlocksRef.current = lessonBlocks;
  dragStateRef.current = dragState;

  const resolveTargetBlockIndex = useCallback(
    (clientY: number, sourceBlockStart: number) => {
      let targetIndex = 0;

      lessonBlocksRef.current.some((block) => {
        if (block.start === sourceBlockStart) return false;
        const element = blockRefs.current.get(block.start);
        if (!element) {
          targetIndex += 1;
          return false;
        }

        const rect = element.getBoundingClientRect();
        if (clientY <= rect.top + rect.height / 2) return true;
        targetIndex += 1;
        return false;
      });

      return targetIndex;
    },
    [],
  );

  useEffect(() => {
    if (!dragState) return undefined;

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      setDragState((current) => {
        if (!current) return current;
        return {
          ...current,
          targetBlockIndex: resolveTargetBlockIndex(
            event.clientY,
            current.blockStart,
          ),
        };
      });
    }

    function finishDrag() {
      const { current } = dragStateRef;
      setDragState(null);
      if (!current) return;

      const remainingBlocks = lessonBlocksRef.current.filter(
        (block) => block.start !== current.blockStart,
      );
      const targetLessonNumber =
        remainingBlocks[current.targetBlockIndex]?.start ??
        schoolLessonNumbers.length + 1;
      onReorderLesson(
        current.blockStart,
        targetLessonNumber,
        current.lessonCount,
      );
    }

    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, [dragState, onReorderLesson, resolveTargetBlockIndex]);

  function startLessonDrag(
    event: ReactPointerEvent<HTMLElement>,
    block: LessonBlock,
  ) {
    const element = blockRefs.current.get(block.start);
    if (!element) return;
    event.preventDefault();
    setDragState({
      blockStart: block.start,
      lessonCount: block.lessonCount,
      targetBlockIndex: resolveTargetBlockIndex(event.clientY, block.start),
    });
  }

  function shouldShowIndicatorBefore(blockIndex: number) {
    if (!dragState) return false;
    const block = lessonBlocks[blockIndex];
    if (block.start === dragState.blockStart) return false;

    const visibleBlocksBefore = lessonBlocks
      .slice(0, blockIndex)
      .filter((entry) => entry.start !== dragState.blockStart).length;
    return visibleBlocksBefore === dragState.targetBlockIndex;
  }

  function updateLessonField(
    block: LessonBlock,
    key: 'subject' | 'teacher',
    value: string,
  ) {
    onUpdateLessonField(block.start, key, value);
    if (block.isDoubleLesson) {
      onUpdateLessonField(block.start + 1, key, value);
    }
  }

  function updateLessonTopics(block: LessonBlock, topics: string[]) {
    onUpdateLessonTopics(block.start, topics);
    if (block.isDoubleLesson) {
      onUpdateLessonTopics(block.start + 1, []);
    }
  }

  const dropIndicator = dragState ? (
    <div className="h-1 rounded-full bg-primary shadow-sm" />
  ) : null;

  return (
    <SectionCard
      title={t('dailyReport.school.title')}
      action={action}
      preserveDescriptionSpace
      className="relative overflow-visible border-primary-tint bg-white"
    >
      <div className="relative flex flex-col gap-3">
        {lessonBlocks.map((block, index) => {
          const isDragging = dragState?.blockStart === block.start;
          const topics = block.isDoubleLesson
            ? mergeTopics(block.lesson.topics, block.secondLesson?.topics ?? [])
            : block.lesson.topics;

          return (
            <div key={block.start} className="flex flex-col gap-3">
              {shouldShowIndicatorBefore(index) ? dropIndicator : null}
              <div
                ref={(element) => {
                  if (element) {
                    blockRefs.current.set(block.start, element);
                  } else {
                    blockRefs.current.delete(block.start);
                  }
                }}
                className={cn(
                  'flex flex-row rounded-xl border border-primary-tint/70 transition-colors',
                  block.isFreeLesson
                    ? 'bg-primary-tint/10 text-text-color/45'
                    : '',
                  isDragging ? 'opacity-35' : '',
                )}
              >
                <div className="flex flex-row border-r border-primary-tint/60 !pr-5">
                  <div
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'flex min-h-24 touch-none items-center justify-center rounded-tl-xl text-text-color/50 hover:bg-primary-tint/40 hover:text-text-color',
                      block.isFreeLesson
                        ? 'cursor-default'
                        : 'cursor-grab active:cursor-grabbing',
                    )}
                    aria-label={t('dailyReport.school.dragLesson')}
                    onPointerDown={(event) => {
                      if (!block.isFreeLesson) startLessonDrag(event, block);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                      }
                    }}
                  >
                    <GripVertical />
                  </div>
                  <div className="flex flex-col items-center justify-center gap-3 px-3">
                    <div
                      className={cn(
                        'flex flex-col items-center gap-1 text-sm font-semibold',
                        block.isFreeLesson
                          ? 'text-text-color/45'
                          : 'text-text-color',
                      )}
                    >
                      <p>
                        {t('dailyReport.school.lessonLabel', {
                          lesson: block.start,
                        })}
                      </p>
                      {block.isDoubleLesson ? (
                        <p>
                          {t('dailyReport.school.lessonLabel', {
                            lesson: block.start + 1,
                          })}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      {block.canUseDoubleLesson ? (
                        <div className="flex cursor-pointer items-center gap-2">
                          <Switch
                            className="cursor-pointer data-[state=checked]:bg-primary"
                            checked={block.isDoubleLesson}
                            aria-label={t('dailyReport.school.doubleLesson')}
                            onCheckedChange={(checked) =>
                              onSetDoubleLessonState(block.start, checked)
                            }
                          />
                          <span>{t('dailyReport.school.doubleLesson')}</span>
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          'flex cursor-pointer items-center gap-2',
                          block.isFreeLesson
                            ? 'font-semibold text-primary'
                            : '',
                        )}
                      >
                        <Switch
                          className="cursor-pointer data-[state=checked]:bg-amber-500"
                          checked={block.isFreeLesson}
                          aria-label={t('dailyReport.school.freeLesson')}
                          onCheckedChange={(checked) =>
                            onSetLessonFreeState(block.start, checked)
                          }
                        />
                        <span>{t('dailyReport.school.freeLesson')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 p-3">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <SuggestionInput
                      disabled={block.isFreeLesson}
                      value={block.lesson.subject}
                      placeholder={t('dailyReport.school.subjectPlaceholder')}
                      suggestions={subjectSuggestions}
                      onValueChange={(value) =>
                        updateLessonField(block, 'subject', value)
                      }
                    />
                    <SuggestionInput
                      disabled={block.isFreeLesson}
                      value={block.lesson.teacher}
                      placeholder={t('dailyReport.school.teacherPlaceholder')}
                      suggestions={teacherSuggestions}
                      onValueChange={(value) =>
                        updateLessonField(block, 'teacher', value)
                      }
                    />
                  </div>

                  <EditableTextEntryList
                    className={
                      block.isFreeLesson ? 'pointer-events-none opacity-45' : ''
                    }
                    items={topics}
                    placeholder={t('dailyReport.school.topicPlaceholder')}
                    suggestions={topicSuggestions}
                    addLabel={t('dailyReport.list.addEntry')}
                    removeLabel={t('dailyReport.list.removeEntry')}
                    onChange={(nextTopics) =>
                      updateLessonTopics(block, nextTopics)
                    }
                    editSuggestionLabel={editTopicSuggestionLabel}
                    deleteSuggestionLabel={deleteTopicSuggestionLabel}
                    onEditSuggestion={onEditTopicSuggestion}
                    onDeleteSuggestion={onDeleteTopicSuggestion}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {dragState &&
        dragState.targetBlockIndex >=
          lessonBlocks.filter((block) => block.start !== dragState.blockStart)
            .length
          ? dropIndicator
          : null}
      </div>
    </SectionCard>
  );
}

SchoolSection.defaultProps = {
  action: undefined,
  editTopicSuggestionLabel: undefined,
  deleteTopicSuggestionLabel: undefined,
  onEditTopicSuggestion: undefined,
  onDeleteTopicSuggestion: undefined,
};
