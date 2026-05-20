import { parseIsoDate } from '@/renderer/lib/iso-date';

export function formatGermanDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const isoDate = parseIsoDate(value);

  if (isoDate) {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(isoDate);
  }

  return value;
}

export function formatGermanDateShort(
  value: string | null | undefined,
): string {
  const formatted = formatGermanDate(value);

  if (!formatted || formatted.length < 5) {
    return formatted;
  }

  return formatted.slice(0, 5);
}

export function formatGermanWeekdayDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return '';
  }

  const isoDate = parseIsoDate(value);

  if (isoDate) {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(isoDate);
  }

  return value;
}

export function formatGermanDateTime(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}
