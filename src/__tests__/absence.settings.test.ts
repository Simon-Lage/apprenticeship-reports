import {
  getMissingAbsenceCatalogYears,
  getStaleAbsenceCatalogYears,
  hasStaleAbsenceCatalogs,
  listAbsenceCatalogYears,
  parseAbsenceSettings,
  resolveRequiredAbsenceCatalogYears,
} from '@/shared/absence/settings';

describe('absence settings helpers', () => {
  it('defaults auto sync to enabled for legacy settings', () => {
    const absenceSettings = parseAbsenceSettings({});

    expect(absenceSettings.autoSyncHolidays).toBe(true);
  });

  it('marks only older catalog years with entries as stale', () => {
    const absenceSettings = parseAbsenceSettings({
      absence: {
        catalogsByYear: {
          '2024': {
            year: 2024,
            subdivisionCode: 'DE-NW',
            fetchedAt: '2024-01-10T09:00:00.000Z',
            publicHolidays: [
              {
                id: 'holiday-2024',
                startDate: '2024-05-01',
                endDate: '2024-05-01',
                name: 'Tag der Arbeit',
                names: [],
                nationwide: true,
                subdivisionCodes: [],
              },
            ],
            schoolHolidays: [],
          },
          '2025': {
            year: 2025,
            subdivisionCode: 'DE-NW',
            fetchedAt: '2025-01-10T09:00:00.000Z',
            publicHolidays: [],
            schoolHolidays: [],
          },
          '2026': {
            year: 2026,
            subdivisionCode: 'DE-NW',
            fetchedAt: '2026-01-10T09:00:00.000Z',
            publicHolidays: [],
            schoolHolidays: [
              {
                id: 'holiday-2026',
                startDate: '2026-04-01',
                endDate: '2026-04-10',
                name: 'Osterferien',
                names: [],
                nationwide: false,
                subdivisionCodes: ['DE-NW'],
              },
            ],
          },
        },
      },
    });

    expect(listAbsenceCatalogYears(absenceSettings)).toEqual([
      2026, 2025, 2024,
    ]);
    expect(getStaleAbsenceCatalogYears(absenceSettings, 2026)).toEqual([2024]);
    expect(hasStaleAbsenceCatalogs(absenceSettings, 2026)).toBe(true);
  });

  it('resolves required catalog years from reportsSince to current year', () => {
    const years = resolveRequiredAbsenceCatalogYears({
      values: {
        onboarding: {
          'training-period': {
            trainingStart: '2024-08-01',
            trainingEnd: '2027-07-31',
            reportsSince: '2025-01-01',
          },
        },
      },
      currentYear: 2026,
    });

    expect(years).toEqual([2025, 2026]);
  });

  it('detects missing years or subdivision mismatches', () => {
    const absenceSettings = parseAbsenceSettings({
      absence: {
        catalogsByYear: {
          '2025': {
            year: 2025,
            subdivisionCode: 'DE-NW',
            fetchedAt: '2025-01-10T09:00:00.000Z',
            publicHolidays: [],
            schoolHolidays: [],
          },
          '2026': {
            year: 2026,
            subdivisionCode: 'DE-BY',
            fetchedAt: '2026-01-10T09:00:00.000Z',
            publicHolidays: [],
            schoolHolidays: [],
          },
        },
      },
    });
    const missingYears = getMissingAbsenceCatalogYears({
      absence: absenceSettings,
      subdivisionCode: 'DE-NW',
      requiredYears: [2025, 2026, 2027],
    });

    expect(missingYears).toEqual([2026, 2027]);
  });
});
