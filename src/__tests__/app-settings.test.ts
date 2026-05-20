import {
  mergeUiCatalogWithLessonValues,
  parseUiSettings,
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

  it('sanitizes invalid ui settings values and enforces max 12 lessons', () => {
    const parsed = parseUiSettings({
      appUi: {
        defaultDepartment: '  Department  ',
        supervisorEmailPrimary: 'not-an-email',
        teachers: ['  Mr One  ', '', 'Mr One', 123],
        subjects: ['Math', '', 'Math', true],
        timetable: {
          monday: [
            { lesson: 1, subject: 'Math', teacher: 'Mr One' },
            { lesson: 13, subject: 'Should be ignored', teacher: 'X' },
            { lesson: 1, subject: 'Math 2', teacher: 'Mr Two' },
            { lesson: 11, subject: 'Valid 11', teacher: 'Teacher 11' },
            { lesson: 2, subject: 'Valid', teacher: 'Teacher' },
          ],
          tuesday: [{ lesson: 0, subject: 'Invalid', teacher: 'Invalid' }],
        },
      },
    });

    expect(parsed.defaultDepartment).toBe('Department');
    expect(parsed.supervisorEmailPrimary).toBe('');
    expect(parsed.teachers).toEqual(['Mr One']);
    expect(parsed.subjects).toEqual(['Math']);
    expect(parsed.timetable.monday).toEqual([
      { lesson: 1, subject: 'Math 2', teacher: 'Mr Two' },
      { lesson: 2, subject: 'Valid', teacher: 'Teacher' },
      { lesson: 11, subject: 'Valid 11', teacher: 'Teacher 11' },
    ]);
    expect(parsed.timetable.tuesday).toEqual([]);
  });

  it('merges subject and teacher presets from lesson values without duplicates', () => {
    const merged = mergeUiCatalogWithLessonValues({
      uiSettings: {
        defaultDepartment: '',
        supervisorEmailPrimary: '',
        teachers: ['Ms Existing'],
        subjects: ['Math'],
        timetable: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
        },
      },
      lessons: [
        { subject: 'Math', teacher: 'Ms Existing' },
        { subject: 'Physics', teacher: 'Mr New' },
        { subject: '  ', teacher: '' },
      ],
    });

    expect(merged.subjects).toEqual(['Math', 'Physics']);
    expect(merged.teachers).toEqual(['Mr New', 'Ms Existing']);
  });
});
