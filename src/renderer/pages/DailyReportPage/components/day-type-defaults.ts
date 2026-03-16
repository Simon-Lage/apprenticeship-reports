import { UiSettingsValues } from '@/renderer/lib/app-settings';
import {
  isWeekendDate,
  resolveDayKey,
} from '@/renderer/pages/DailyReportPage/components/date-logic';
import {
  AbsenceCatalogEntry,
  AbsenceSettings,
  ManualAbsence,
} from '@/shared/absence/settings';

type BaseDayType = 'work' | 'school';

export type AutoDayTypeReason =
  | { kind: 'public-holiday'; name: string }
  | { kind: 'weekend' }
  | { kind: 'sick'; label: string | null }
  | { kind: 'vacation'; label: string | null }
  | { kind: 'school-holiday'; name: string }
  | { kind: 'base'; base: BaseDayType };

export type AutoDayTypeResult = {
  dayType: 'work' | 'school' | 'free';
  freeReason: string;
  reason: AutoDayTypeReason;
};

function coversDate(input: {
  date: string;
  startDate: string;
  endDate: string;
}): boolean {
  return input.date >= input.startDate && input.date <= input.endDate;
}

function findMatchingCatalogEntry(
  entries: AbsenceCatalogEntry[],
  date: string,
): AbsenceCatalogEntry | null {
  const matches = entries.filter((entry) =>
    coversDate({
      date,
      startDate: entry.startDate,
      endDate: entry.endDate,
    }),
  );

  if (!matches.length) {
    return null;
  }

  return [...matches].sort((left, right) => {
    const byStart = left.startDate.localeCompare(right.startDate);
    if (byStart !== 0) {
      return byStart;
    }

    return left.name.localeCompare(right.name);
  })[0];
}

function findMatchingManualEntry(
  entries: ManualAbsence[],
  date: string,
  type: ManualAbsence['type'],
): ManualAbsence | null {
  const matches = entries.filter(
    (entry) =>
      entry.type === type &&
      coversDate({
        date,
        startDate: entry.startDate,
        endDate: entry.endDate,
      }),
  );

  if (!matches.length) {
    return null;
  }

  return [...matches].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )[0];
}

function resolveBaseDayType(input: {
  date: string;
  uiSettings: UiSettingsValues;
}): BaseDayType {
  const dayKey = resolveDayKey(input.date);

  if (!dayKey) {
    return 'work';
  }

  return input.uiSettings.timetable[dayKey].length > 0 ? 'school' : 'work';
}

export function resolveAutoDayType(input: {
  date: string;
  uiSettings: UiSettingsValues;
  absenceSettings: AbsenceSettings;
  currentYear: number;
}): AutoDayTypeResult {
  const baseDayType = resolveBaseDayType({
    date: input.date,
    uiSettings: input.uiSettings,
  });
  const currentYearCatalog =
    input.absenceSettings.catalogsByYear[String(input.currentYear)];
  const publicHolidayFromCatalog = currentYearCatalog
    ? findMatchingCatalogEntry(currentYearCatalog.publicHolidays, input.date)
    : null;
  const schoolHolidayFromCatalog = currentYearCatalog
    ? findMatchingCatalogEntry(currentYearCatalog.schoolHolidays, input.date)
    : null;
  const publicHolidayFromManual = findMatchingManualEntry(
    input.absenceSettings.manualAbsences,
    input.date,
    'public-holiday',
  );
  const schoolHolidayFromManual = findMatchingManualEntry(
    input.absenceSettings.manualAbsences,
    input.date,
    'school-holiday',
  );
  const sickFromManual = findMatchingManualEntry(
    input.absenceSettings.manualAbsences,
    input.date,
    'sick',
  );
  const vacationFromManual = findMatchingManualEntry(
    input.absenceSettings.manualAbsences,
    input.date,
    'vacation',
  );

  const publicHolidayName =
    publicHolidayFromManual?.label.trim() ||
    publicHolidayFromCatalog?.name ||
    null;

  if (publicHolidayName) {
    return {
      dayType: 'free',
      freeReason: publicHolidayName,
      reason: {
        kind: 'public-holiday',
        name: publicHolidayName,
      },
    };
  }

  if (isWeekendDate(input.date)) {
    return {
      dayType: 'free',
      freeReason: '',
      reason: {
        kind: 'weekend',
      },
    };
  }

  if (sickFromManual) {
    return {
      dayType: 'free',
      freeReason: sickFromManual.label.trim(),
      reason: {
        kind: 'sick',
        label: sickFromManual.label.trim() || null,
      },
    };
  }

  const schoolHolidayName =
    schoolHolidayFromManual?.label.trim() ||
    schoolHolidayFromCatalog?.name ||
    null;
  const effectiveBaseDayType: BaseDayType =
    schoolHolidayName && baseDayType === 'school' ? 'work' : baseDayType;

  if (vacationFromManual && effectiveBaseDayType !== 'school') {
    return {
      dayType: 'free',
      freeReason: vacationFromManual.label.trim(),
      reason: {
        kind: 'vacation',
        label: vacationFromManual.label.trim() || null,
      },
    };
  }

  if (schoolHolidayName && baseDayType === 'school') {
    return {
      dayType: 'work',
      freeReason: '',
      reason: {
        kind: 'school-holiday',
        name: schoolHolidayName,
      },
    };
  }

  return {
    dayType: effectiveBaseDayType,
    freeReason: '',
    reason: {
      kind: 'base',
      base: effectiveBaseDayType,
    },
  };
}
