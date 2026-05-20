import {
  filterWeekRangesThroughCurrentWeek,
  listCoveredWeekRanges,
} from '@/renderer/pages/ReportsOverviewPage/week-ranges';

describe('reports overview week ranges', () => {
  it('keeps the current week and removes later weeks', () => {
    const ranges = [
      { weekStart: '2026-05-04', weekEnd: '2026-05-10' },
      { weekStart: '2026-05-11', weekEnd: '2026-05-17' },
      { weekStart: '2026-05-18', weekEnd: '2026-05-24' },
    ];

    expect(
      filterWeekRangesThroughCurrentWeek(
        ranges,
        new Date('2026-05-11T10:00:00.000Z'),
      ),
    ).toEqual([
      { weekStart: '2026-05-04', weekEnd: '2026-05-10' },
      { weekStart: '2026-05-11', weekEnd: '2026-05-17' },
    ]);
  });

  it('derives all touched weeks from a date range', () => {
    expect(
      listCoveredWeekRanges({
        startDate: '2026-05-15',
        endDate: '2026-05-20',
      }),
    ).toEqual([
      { weekStart: '2026-05-11', weekEnd: '2026-05-17' },
      { weekStart: '2026-05-18', weekEnd: '2026-05-24' },
    ]);
  });
});
