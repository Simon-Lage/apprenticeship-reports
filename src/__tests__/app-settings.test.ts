import {
  renameUiCatalogEntry,
  resolveWorkplaceSettingsValues,
} from '@/renderer/lib/app-settings';

describe('app settings', () => {
  it('prefers onboarding workplace values for settings fields', () => {
    const resolved = resolveWorkplaceSettingsValues({
      appUi: {
        defaultDepartment: 'Legacy Department',
        supervisorEmailPrimary: 'legacy@example.com',
      },
      onboarding: {
        workplace: {
          department: 'Current Department',
          trainerEmail: 'trainer@example.com',
          ihkLink: 'https://ihk.example.com/report',
        },
      },
    });

    expect(resolved).toEqual({
      department: 'Current Department',
      trainerEmail: 'trainer@example.com',
      ihkLink: 'https://ihk.example.com/report',
    });
  });

  it('falls back to legacy ui defaults when onboarding workplace values are absent', () => {
    const resolved = resolveWorkplaceSettingsValues({
      appUi: {
        defaultDepartment: 'Legacy Department',
        supervisorEmailPrimary: 'legacy@example.com',
      },
    });

    expect(resolved).toEqual({
      department: 'Legacy Department',
      trainerEmail: 'legacy@example.com',
      ihkLink: '',
    });
  });

  it('renames teachers across catalog and timetable entries', () => {
    const renamed = renameUiCatalogEntry({
      kind: 'teacher',
      currentValue: 'Mr Old',
      nextValue: 'Mr New',
      uiSettings: {
        defaultDepartment: '',
        supervisorEmailPrimary: '',
        supervisorEmailSecondary: '',
        teachers: ['Mr Old', 'Ms Other'],
        subjects: ['Math'],
        timetable: {
          monday: [
            {
              lesson: 1,
              subject: 'Math',
              teacher: 'Mr Old',
            },
          ],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [
            {
              lesson: 2,
              subject: 'Math',
              teacher: 'Mr Old',
            },
          ],
        },
      },
    });

    expect(renamed.teachers).toEqual(['Mr New', 'Ms Other']);
    expect(renamed.timetable.monday[0]?.teacher).toBe('Mr New');
    expect(renamed.timetable.friday[0]?.teacher).toBe('Mr New');
  });

  it('merges duplicate subject names when renaming', () => {
    const renamed = renameUiCatalogEntry({
      kind: 'subject',
      currentValue: 'Biology',
      nextValue: 'Math',
      uiSettings: {
        defaultDepartment: '',
        supervisorEmailPrimary: '',
        supervisorEmailSecondary: '',
        teachers: [],
        subjects: ['Biology', 'Math'],
        timetable: {
          monday: [
            {
              lesson: 1,
              subject: 'Biology',
              teacher: '',
            },
          ],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
        },
      },
    });

    expect(renamed.subjects).toEqual(['Math']);
    expect(renamed.timetable.monday[0]?.subject).toBe('Math');
  });
});
