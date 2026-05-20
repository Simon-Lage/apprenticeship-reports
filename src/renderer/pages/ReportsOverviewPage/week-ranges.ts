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
