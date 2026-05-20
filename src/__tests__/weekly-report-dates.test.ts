import { listWeekDates } from '@/renderer/lib/report-values';

describe('weekly report date helpers', () => {
  it('returns seven dates for a monday to sunday week range', () => {
    const dates = listWeekDates('2026-03-09', '2026-03-15');

    expect(dates).toEqual([
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-03-14',
      '2026-03-15',
    ]);
  });

  it('returns an empty list for invalid date ranges', () => {
    expect(listWeekDates('2026-03-15', '2026-03-09')).toEqual([]);
    expect(listWeekDates('invalid', '2026-03-09')).toEqual([]);
  });
});
