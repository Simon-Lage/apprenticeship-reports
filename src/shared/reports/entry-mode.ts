export type DailyReportEntryMode = 'manual' | 'automatic';

export function resolveDailyReportEntryMode(
  values: unknown,
): DailyReportEntryMode {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return 'manual';
  }

  const entryMode =
    'entryMode' in values && typeof values.entryMode === 'string'
      ? values.entryMode
      : null;

  if (entryMode === 'automatic') {
    return 'automatic';
  }

  if (entryMode === 'manual') {
    return 'manual';
  }

  const legacyType =
    'type' in values && typeof values.type === 'string' ? values.type : null;
  const dayType =
    'dayType' in values && typeof values.dayType === 'string'
      ? values.dayType
      : null;

  return legacyType === 'free' && !dayType ? 'automatic' : 'manual';
}
