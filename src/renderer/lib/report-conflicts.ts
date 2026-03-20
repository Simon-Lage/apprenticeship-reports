import { TFunction } from 'i18next';

import { AbsenceSettings } from '@/shared/absence/settings';
import { DailyReportRecord } from '@/shared/reports/models';
import {
  AutoDayTypeReason,
  BaseDayType,
  resolveAutoDayTypeFromBase,
} from '@/renderer/pages/DailyReportPage/components/day-type-defaults';
import {
  DayTypeValue,
  parseDailyReportValues,
} from '@/renderer/lib/report-values';
import formatDailyReportDayTypeLabel from '@/renderer/lib/daily-report-labels';

export type DailyReportAbsenceConflict = {
  date: string;
  storedDayType: DayTypeValue;
  storedFreeReason: string;
  expectedDayType: DayTypeValue;
  expectedFreeReason: string;
  reason: AutoDayTypeReason;
};

function inferStoredBaseDayType(
  values: ReturnType<typeof parseDailyReportValues>,
): BaseDayType {
  if (
    values.dayType === 'school' ||
    values.lessons.length > 0 ||
    values.schoolTopics.length > 0
  ) {
    return 'school';
  }

  return 'work';
}

function isAbsenceDrivenReason(reason: AutoDayTypeReason): boolean {
  return (
    reason.kind === 'public-holiday' ||
    reason.kind === 'sick' ||
    reason.kind === 'vacation' ||
    reason.kind === 'school-holiday'
  );
}

export function resolveDailyReportAbsenceConflict(input: {
  date: string;
  values: unknown;
  absenceSettings: AbsenceSettings;
}): DailyReportAbsenceConflict | null {
  const stored = parseDailyReportValues(input.values);
  const expected = resolveAutoDayTypeFromBase({
    date: input.date,
    baseDayType: inferStoredBaseDayType(stored),
    absenceSettings: input.absenceSettings,
    currentYear: new Date(input.date).getUTCFullYear(),
  });
  const storedFreeReason = stored.freeReason.trim();
  const expectedFreeReason = expected.freeReason.trim();
  const sameDayType = stored.dayType === expected.dayType;
  const sameFreeReason =
    stored.dayType !== 'free' ||
    expected.dayType !== 'free' ||
    storedFreeReason === expectedFreeReason;

  if (sameDayType && sameFreeReason) {
    return null;
  }

  if (
    !isAbsenceDrivenReason(expected.reason) &&
    !(stored.dayType === 'free' && expected.dayType !== 'free')
  ) {
    return null;
  }

  return {
    date: input.date,
    storedDayType: stored.dayType,
    storedFreeReason,
    expectedDayType: expected.dayType,
    expectedFreeReason,
    reason: expected.reason,
  };
}

export function listDailyReportAbsenceConflicts(input: {
  dailyReports: DailyReportRecord[];
  absenceSettings: AbsenceSettings;
}): DailyReportAbsenceConflict[] {
  return input.dailyReports
    .map((dailyReport) =>
      resolveDailyReportAbsenceConflict({
        date: dailyReport.date,
        values: dailyReport.values,
        absenceSettings: input.absenceSettings,
      }),
    )
    .filter((conflict): conflict is DailyReportAbsenceConflict =>
      Boolean(conflict),
    )
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function formatConflictDayTypeLabel(
  t: TFunction,
  input: {
    dayType: DayTypeValue;
    freeReason: string;
  },
): string {
  return formatDailyReportDayTypeLabel(t, input);
}

export function formatConflictReasonLabel(
  t: TFunction,
  reason: AutoDayTypeReason,
): string {
  if (reason.kind === 'public-holiday') {
    return t('dailyReport.auto.reasonPublicHoliday', {
      name: reason.name,
    });
  }

  if (reason.kind === 'weekend') {
    return t('dailyReport.auto.reasonWeekend');
  }

  if (reason.kind === 'sick') {
    return t('dailyReport.auto.reasonSick', {
      name: reason.label ?? '-',
    });
  }

  if (reason.kind === 'vacation') {
    return t('dailyReport.auto.reasonVacation', {
      name: reason.label ?? '-',
    });
  }

  if (reason.kind === 'school-holiday') {
    return t('dailyReport.auto.reasonSchoolHoliday', {
      name: reason.name,
    });
  }

  return t(
    reason.base === 'school'
      ? 'dailyReport.auto.reasonBaseSchool'
      : 'dailyReport.auto.reasonBaseWork',
  );
}
