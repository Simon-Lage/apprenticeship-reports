import { resolveReportStartDateFromSettings } from '@/shared/settings/report-start-date';

describe('report start date settings helper', () => {
  it('uses reportsSince before trainingStart', () => {
    expect(
      resolveReportStartDateFromSettings({
        onboarding: {
          'training-period': {
            trainingStart: '2025-08-01',
            trainingEnd: '2028-07-31',
            reportsSince: '2026-01-15',
          },
        },
      }),
    ).toBe('2026-01-15');
  });

  it('falls back to trainingStart when reportsSince is missing', () => {
    expect(
      resolveReportStartDateFromSettings({
        onboarding: {
          'training-period': {
            trainingStart: '2025-08-01',
            trainingEnd: '2028-07-31',
            reportsSince: null,
          },
        },
      }),
    ).toBe('2025-08-01');
  });
});
