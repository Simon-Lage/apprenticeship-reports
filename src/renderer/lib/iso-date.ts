const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export type WeekRange = {
  weekStart: string;
  weekEnd: string;
};

export function toLocalIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date | null {
  if (!isoDatePattern.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (parsed.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return parsed;
}

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addIsoDays(dateValue: string, days: number): string | null {
  const parsed = parseIsoDate(dateValue);

  if (!parsed) {
    return null;
  }

  parsed.setUTCDate(parsed.getUTCDate() + days);
  return toIsoDate(parsed);
}

export function normalizeIsoDate(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  return parseIsoDate(value) ? value : null;
}

export function resolveWeekRangeForDate(dateValue: string): WeekRange | null {
  const parsed = parseIsoDate(dateValue);

  if (!parsed) {
    return null;
  }

  const weekday = parsed.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  parsed.setUTCDate(parsed.getUTCDate() + mondayOffset);
  const weekStart = toIsoDate(parsed);
  parsed.setUTCDate(parsed.getUTCDate() + 6);
  const weekEnd = toIsoDate(parsed);

  return {
    weekStart,
    weekEnd,
  };
}

export function getIsoWeekNumber(dateValue: string): number | null {
  const parsed = parseIsoDate(dateValue);

  if (!parsed) {
    return null;
  }

  const weekday = parsed.getUTCDay() || 7;
  parsed.setUTCDate(parsed.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(parsed.getUTCFullYear(), 0, 1));

  return Math.ceil(
    ((parsed.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
}
