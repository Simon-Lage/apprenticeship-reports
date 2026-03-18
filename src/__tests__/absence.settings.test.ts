import {
  getStaleAbsenceCatalogYears,
  hasStaleAbsenceCatalogs,
  listAbsenceCatalogYears,
  parseAbsenceSettings,
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
});
