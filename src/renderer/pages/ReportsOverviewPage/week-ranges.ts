import {
  addIsoDays,
  resolveWeekRangeForDate,
  toLocalIsoDate,
  WeekRange,
} from '@/renderer/lib/iso-date';

export function listCoveredWeekRanges(input: {
  startDate: string;
  endDate: string;
}): WeekRange[] {
  if (input.endDate < input.startDate) {
    return [];
  }

  const ranges: WeekRange[] = [];
  let cursor = input.startDate;

  for (
    let attempts = 0;
    attempts < 3660 && cursor <= input.endDate;
    attempts += 1
  ) {
    const range = resolveWeekRangeForDate(cursor);

    if (!range) {
      break;
    }

    ranges.push(range);

    const nextWeekStart = addIsoDays(range.weekEnd, 1);

    if (!nextWeekStart) {
      break;
    }

    cursor = nextWeekStart;
  }

  return ranges;
}

export function filterWeekRangesThroughCurrentWeek(
  ranges: WeekRange[],
  now = new Date(),
): WeekRange[] {
  const today = toLocalIsoDate(now);
  const currentWeek = resolveWeekRangeForDate(today);

  if (!currentWeek) {
    return ranges;
  }

  return ranges.filter((range) => range.weekStart <= currentWeek.weekStart);
}

export function listReportWeekRanges(input: {
  startDate: string | null;
  now?: Date;
}): WeekRange[] {
  if (!input.startDate) {
    return [];
  }

  const firstWeek = resolveWeekRangeForDate(input.startDate);
  const today = toLocalIsoDate(input.now ?? new Date());
  const currentWeek = resolveWeekRangeForDate(today);

  if (!firstWeek || !currentWeek || input.startDate > currentWeek.weekEnd) {
    return [];
  }

  const ranges: WeekRange[] = [
    {
      weekStart: input.startDate,
      weekEnd: firstWeek.weekEnd,
    },
  ];
  let cursor = addIsoDays(firstWeek.weekEnd, 1);

  for (
    let attempts = 0;
    attempts < 3660 && cursor && cursor <= currentWeek.weekStart;
    attempts += 1
  ) {
    const range = resolveWeekRangeForDate(cursor);

    if (!range) {
      break;
    }

    ranges.push(range);
    cursor = addIsoDays(range.weekEnd, 1);
  }

  return ranges;
}
