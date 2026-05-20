export const schoolLessonNumbers = Array.from(
  { length: 12 },
  (_, index) => index + 1,
);

export function listMissingLessonNumbers(
  lessons: { lesson: number }[],
): number[] {
  const used = new Set(lessons.map((lesson) => lesson.lesson));
  return schoolLessonNumbers.filter((lessonNumber) => !used.has(lessonNumber));
}

export function listInsertOptions(input: {
  lessons: { lesson: number }[];
  insertIndex: number;
}): number[] {
  const missing = listMissingLessonNumbers(input.lessons);
  if (!missing.length) return [];

  const previousLesson = input.lessons[input.insertIndex - 1]?.lesson ?? 0;
  const nextLesson = input.lessons[input.insertIndex]?.lesson ?? 13;

  return missing.filter(
    (lessonNumber) =>
      lessonNumber > previousLesson && lessonNumber < nextLesson,
  );
}

export function normalizeDraftEntry(value: string): string | null {
  const normalized = value.trim();
  if (!normalized.length || normalized.length > 240) return null;
  return normalized;
}

export function buildLessonNumberReorderMap(
  sourceLessonNumber: number,
  targetLessonNumber: number,
  lessonCount = 1,
): Map<number, number> {
  const sourceLessonNumbers = Array.from(
    { length: lessonCount },
    (_, index) => sourceLessonNumber + index,
  ).filter(
    (lessonNumber) =>
      lessonNumber >= 1 && lessonNumber <= schoolLessonNumbers.length,
  );
  const remainingLessonNumbers = schoolLessonNumbers.filter(
    (lessonNumber) => !sourceLessonNumbers.includes(lessonNumber),
  );
  const removedBeforeTarget = sourceLessonNumbers.filter(
    (lessonNumber) => lessonNumber < targetLessonNumber,
  ).length;
  const insertIndex = Math.max(
    0,
    Math.min(
      remainingLessonNumbers.length,
      targetLessonNumber - 1 - removedBeforeTarget,
    ),
  );
  const nextLessonNumbers = [
    ...remainingLessonNumbers.slice(0, insertIndex),
    ...sourceLessonNumbers,
    ...remainingLessonNumbers.slice(insertIndex),
  ];

  return new Map(
    nextLessonNumbers.map((previousLessonNumber, index) => [
      previousLessonNumber,
      index + 1,
    ]),
  );
}
