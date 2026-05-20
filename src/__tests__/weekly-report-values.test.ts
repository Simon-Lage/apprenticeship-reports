import { parseWeeklyReportValues } from '@/renderer/lib/report-values';

describe('parseWeeklyReportValues', () => {
  it('accepts nullable week area values from persisted weekly reports', () => {
    expect(
      parseWeeklyReportValues({
        area: null,
      }).area,
    ).toBe('');
  });
});
