import { TFunction } from 'i18next';
import { IconType } from 'react-icons';
import {
  FiActivity,
  FiBookOpen,
  FiBriefcase,
  FiCoffee,
  FiFlag,
  FiHome,
} from 'react-icons/fi';

import { DayTypeValue } from '@/renderer/lib/report-values';

export const dailyReportDayTypeIconConfig = {
  work: FiBriefcase,
  school: FiBookOpen,
  free: {
    default: FiCoffee,
    weekend: FiHome,
    sick: FiActivity,
    holiday: FiFlag,
  },
} satisfies {
  work: IconType;
  school: IconType;
  free: Record<'default' | 'weekend' | 'sick' | 'holiday', IconType>;
};

const holidayKeywords = [
  'feiertag',
  'ferien',
  'karfreitag',
  'ostermontag',
  'ostersonntag',
  'neujahr',
  'heilige drei konige',
  'tag der arbeit',
  'maifeiertag',
  'christi himmelfahrt',
  'pfingstmontag',
  'pfingstsonntag',
  'fronleichnam',
  'maria himmelfahrt',
  'weltkindertag',
  'tag der deutschen einheit',
  'reformationstag',
  'allerheiligen',
  'buss- und bettag',
  'weihnacht',
];

export type FreeDayIconVariant = 'default' | 'weekend' | 'sick' | 'holiday';

function normalizeFreeReason(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');
}

export function resolveFreeDayIconVariant(
  freeReason: string,
): FreeDayIconVariant {
  const normalizedReason = normalizeFreeReason(freeReason);

  if (!normalizedReason) {
    return 'default';
  }

  if (normalizedReason.includes('wochenend')) {
    return 'weekend';
  }

  if (normalizedReason.includes('krank')) {
    return 'sick';
  }

  if (holidayKeywords.some((keyword) => normalizedReason.includes(keyword))) {
    return 'holiday';
  }

  return 'default';
}

export default function formatDailyReportDayTypeLabel(
  t: TFunction,
  input: {
    dayType: DayTypeValue;
    freeReason: string;
  },
): string {
  const label = t(`dailyReport.dayTypes.${input.dayType}`);
  const freeReason = input.freeReason.trim();

  if (input.dayType !== 'free' || !freeReason) {
    return label;
  }

  return `${label} (${freeReason})`;
}

export function resolveDailyReportDayTypeIcon(input: {
  dayType: DayTypeValue;
  freeReason: string;
}): IconType {
  if (input.dayType === 'work') {
    return dailyReportDayTypeIconConfig.work;
  }

  if (input.dayType === 'school') {
    return dailyReportDayTypeIconConfig.school;
  }

  return dailyReportDayTypeIconConfig.free[
    resolveFreeDayIconVariant(input.freeReason)
  ];
}

export function getDailyReportDayTypePresentation(
  t: TFunction,
  input: {
    dayType: DayTypeValue;
    freeReason: string;
  },
) {
  return {
    label: formatDailyReportDayTypeLabel(t, input),
    icon: resolveDailyReportDayTypeIcon(input),
  };
}
