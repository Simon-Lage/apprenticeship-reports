import { UiSettingsValues } from '@/renderer/lib/app-settings';
import { resolveAutoDayType } from '@/renderer/pages/DailyReportPage/utils/day-type-defaults';
import { AbsenceSettings } from '@/shared/absence/settings';

function createUiSettings(): UiSettingsValues {
  return {
    defaultDepartment: '',
    supervisorEmailPrimary: '',
    teachers: [],
    subjects: [],
    timetable: {
      monday: [{ lesson: 1, subject: 'Mathe', teacher: 'Lehrer A' }],
      tuesday: [{ lesson: 1, subject: 'Deutsch', teacher: 'Lehrer B' }],
      wednesday: [],
      thursday: [],
      friday: [],
    },
    schoolDays: {
      monday: false,
      tuesday: false,
      wednesday: true,
      thursday: false,
      friday: false,
    },
    textSuggestions: {
      activities: { manual: [], ignored: [] },
      trainings: { manual: [], ignored: [] },
      schoolTopics: { manual: [], ignored: [] },
    },
  };
}

function createAbsenceSettings(): AbsenceSettings {
  return {
    subdivisionCode: 'DE-NI',
    lastSyncYear: 2026,
    lastSyncedAt: '2026-01-01T12:00:00.000Z',
    lastSyncError: null,
    autoSyncHolidays: true,
    catalogsByYear: {
      '2026': {
        year: 2026,
        subdivisionCode: 'DE-NI',
        fetchedAt: '2026-01-01T12:00:00.000Z',
        publicHolidays: [
          {
            id: 'h-1',
            startDate: '2026-01-01',
            endDate: '2026-01-01',
            name: 'Neujahr',
            names: [],
            nationwide: true,
            subdivisionCodes: [],
          },
        ],
        schoolHolidays: [
          {
            id: 's-1',
            startDate: '2026-02-02',
            endDate: '2026-02-03',
            name: 'Halbjahresferien',
            names: [],
            nationwide: false,
            subdivisionCodes: ['DE-NI'],
          },
        ],
      },
    },
    manualAbsences: [],
  };
}

describe('daily report auto day type', () => {
  it('prioritizes public holidays over all other rules', () => {
    const absenceSettings = createAbsenceSettings();
    absenceSettings.manualAbsences.push({
      id: 'm-1',
      type: 'sick',
      startDate: '2026-01-01',
      endDate: '2026-01-01',
      label: 'Krank',
      note: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const result = resolveAutoDayType({
      date: '2026-01-01',
      uiSettings: createUiSettings(),
      absenceSettings,
      currentYear: 2026,
    });

    expect(result.dayType).toBe('free');
    expect(result.reason.kind).toBe('public-holiday');
  });

  it('prioritizes weekend over sick entries', () => {
    const absenceSettings = createAbsenceSettings();
    absenceSettings.manualAbsences.push({
      id: 'm-weekend-sick',
      type: 'sick',
      startDate: '2026-02-01',
      endDate: '2026-02-01',
      label: 'Krank am Sonntag',
      note: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const result = resolveAutoDayType({
      date: '2026-02-01',
      uiSettings: createUiSettings(),
      absenceSettings,
      currentYear: 2026,
    });

    expect(result.dayType).toBe('free');
    expect(result.reason.kind).toBe('weekend');
  });

  it('applies vacation as free day when a school day has a vacation entry', () => {
    const absenceSettings = createAbsenceSettings();
    absenceSettings.manualAbsences.push({
      id: 'm-2',
      type: 'vacation',
      startDate: '2026-02-09',
      endDate: '2026-02-09',
      label: 'Urlaub',
      note: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const result = resolveAutoDayType({
      date: '2026-02-09',
      uiSettings: createUiSettings(),
      absenceSettings,
      currentYear: 2026,
    });

    expect(result.dayType).toBe('free');
    expect(result.reason.kind).toBe('vacation');
  });

  it('uses default labels for sick and vacation when no label is provided', () => {
    const absenceSettings = createAbsenceSettings();
    absenceSettings.manualAbsences.push(
      {
        id: 'm-empty-sick',
        type: 'sick',
        startDate: '2026-02-04',
        endDate: '2026-02-04',
        label: '',
        note: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'm-empty-vacation',
        type: 'vacation',
        startDate: '2026-02-05',
        endDate: '2026-02-05',
        label: '',
        note: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    );

    const sickResult = resolveAutoDayType({
      date: '2026-02-04',
      uiSettings: createUiSettings(),
      absenceSettings,
      currentYear: 2026,
    });
    const vacationResult = resolveAutoDayType({
      date: '2026-02-05',
      uiSettings: createUiSettings(),
      absenceSettings,
      currentYear: 2026,
    });

    expect(sickResult.dayType).toBe('free');
    expect(sickResult.freeReason).toBe('Krankheit');
    expect(vacationResult.dayType).toBe('free');
    expect(vacationResult.freeReason).toBe('Urlaub');
  });

  it('applies vacation on school holidays after school-to-work conversion', () => {
    const absenceSettings = createAbsenceSettings();
    absenceSettings.manualAbsences.push({
      id: 'm-vac-school-holiday',
      type: 'vacation',
      startDate: '2026-02-03',
      endDate: '2026-02-03',
      label: 'Urlaub',
      note: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const result = resolveAutoDayType({
      date: '2026-02-03',
      uiSettings: createUiSettings(),
      absenceSettings,
      currentYear: 2026,
    });

    expect(result.dayType).toBe('free');
    expect(result.reason.kind).toBe('vacation');
  });

  it('applies school holiday as free day on school days', () => {
    const result = resolveAutoDayType({
      date: '2026-02-03',
      uiSettings: createUiSettings(),
      absenceSettings: createAbsenceSettings(),
      currentYear: 2026,
    });

    expect(result.dayType).toBe('free');
    expect(result.reason.kind).toBe('school-holiday');
  });

  it('uses work as base when no rule matches', () => {
    const result = resolveAutoDayType({
      date: '2026-02-06',
      uiSettings: createUiSettings(),
      absenceSettings: createAbsenceSettings(),
      currentYear: 2026,
    });

    expect(result.dayType).toBe('work');
    expect(result.reason.kind).toBe('base');
  });

  it('uses manually marked timetable days as school days', () => {
    const result = resolveAutoDayType({
      date: '2026-02-04',
      uiSettings: createUiSettings(),
      absenceSettings: createAbsenceSettings(),
      currentYear: 2026,
    });

    expect(result.dayType).toBe('school');
    expect(result.reason.kind).toBe('base');
  });
});
