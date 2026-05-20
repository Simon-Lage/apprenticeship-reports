import { TFunction } from 'i18next';
import {
  FiActivity,
  FiBookOpen,
  FiBriefcase,
  FiCoffee,
  FiFlag,
  FiHome,
} from 'react-icons/fi';

import {
  getDailyReportDayTypePresentation,
  resolveFreeDayIconVariant,
} from '@/renderer/lib/daily-report-labels';

const t = ((key: string) =>
  ({
    'dailyReport.dayTypes.work': 'Arbeitstag',
    'dailyReport.dayTypes.school': 'Schultag',
    'dailyReport.dayTypes.free': 'Freier Tag',
  })[key] ?? key) as TFunction;

describe('daily report labels', () => {
  it('returns dedicated icons for work and school days', () => {
    expect(
      getDailyReportDayTypePresentation(t, {
        dayType: 'work',
        freeReason: '',
      }),
    ).toEqual({
      label: 'Arbeitstag',
      icon: FiBriefcase,
    });
    expect(
      getDailyReportDayTypePresentation(t, {
        dayType: 'school',
        freeReason: '',
      }),
    ).toEqual({
      label: 'Schultag',
      icon: FiBookOpen,
    });
  });

  it('uses specific free-day icons for weekend, sickness and holidays', () => {
    expect(resolveFreeDayIconVariant('Wochenende')).toBe('weekend');
    expect(resolveFreeDayIconVariant('Krankheit')).toBe('sick');
    expect(resolveFreeDayIconVariant('Karfreitag')).toBe('holiday');

    expect(
      getDailyReportDayTypePresentation(t, {
        dayType: 'free',
        freeReason: 'Wochenende',
      }),
    ).toEqual({
      label: 'Freier Tag (Wochenende)',
      icon: FiHome,
    });
    expect(
      getDailyReportDayTypePresentation(t, {
        dayType: 'free',
        freeReason: 'Krankheit',
      }),
    ).toEqual({
      label: 'Freier Tag (Krankheit)',
      icon: FiActivity,
    });
    expect(
      getDailyReportDayTypePresentation(t, {
        dayType: 'free',
        freeReason: 'Karfreitag',
      }),
    ).toEqual({
      label: 'Freier Tag (Karfreitag)',
      icon: FiFlag,
    });
  });

  it('keeps a default free-day icon for remaining reasons', () => {
    expect(
      getDailyReportDayTypePresentation(t, {
        dayType: 'free',
        freeReason: 'Urlaub',
      }),
    ).toEqual({
      label: 'Freier Tag (Urlaub)',
      icon: FiCoffee,
    });
  });
});
