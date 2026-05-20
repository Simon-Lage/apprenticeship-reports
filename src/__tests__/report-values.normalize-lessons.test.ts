import { normalizeLessons } from '@/renderer/lib/report-values';

describe('normalizeLessons', () => {
  it('moves topics into the first lesson of an empty double-period pair', () => {
    const normalized = normalizeLessons([
      { lesson: 1, subject: 'Mathe', teacher: 'A', topics: [] },
      { lesson: 2, subject: 'Mathe', teacher: 'A', topics: ['Bruchrechnung'] },
    ]);

    expect(normalized).toEqual([
      { lesson: 1, subject: 'Mathe', teacher: 'A', topics: ['Bruchrechnung'] },
      { lesson: 2, subject: 'Mathe', teacher: 'A', topics: [] },
    ]);
  });

  it('does not copy topics between non-pair lessons 2/3', () => {
    const normalized = normalizeLessons([
      { lesson: 2, subject: 'Deutsch', teacher: 'B', topics: ['Erörterung'] },
      { lesson: 3, subject: 'Deutsch', teacher: 'B', topics: [] },
    ]);

    expect(normalized).toEqual([
      { lesson: 2, subject: 'Deutsch', teacher: 'B', topics: ['Erörterung'] },
      { lesson: 3, subject: 'Deutsch', teacher: 'B', topics: [] },
    ]);
  });

  it('clears the second lesson of a collapsed double-period pair 11/12', () => {
    const normalized = normalizeLessons([
      { lesson: 11, subject: 'Physik', teacher: 'C', topics: ['Optik'] },
      { lesson: 12, subject: 'Physik', teacher: 'C', topics: [] },
    ]);

    expect(normalized).toEqual([
      { lesson: 11, subject: 'Physik', teacher: 'C', topics: ['Optik'] },
      { lesson: 12, subject: 'Physik', teacher: 'C', topics: [] },
    ]);
  });

  it('keeps filled matching lessons separate unless the pair is collapsed', () => {
    const normalized = normalizeLessons([
      {
        lesson: 1,
        subject: 'Mathe',
        teacher: 'A',
        topics: ['Lineare Algebra'],
      },
      { lesson: 2, subject: 'Mathe', teacher: 'A', topics: ['Geometrie'] },
    ]);

    expect(normalized).toEqual([
      {
        lesson: 1,
        subject: 'Mathe',
        teacher: 'A',
        topics: ['Lineare Algebra'],
      },
      { lesson: 2, subject: 'Mathe', teacher: 'A', topics: ['Geometrie'] },
    ]);
  });

  it('merges filled matching lessons when the pair is explicitly collapsed', () => {
    const normalized = normalizeLessons(
      [
        {
          lesson: 1,
          subject: 'Mathe',
          teacher: 'A',
          topics: ['Lineare Algebra'],
        },
        { lesson: 2, subject: 'Mathe', teacher: 'A', topics: ['Geometrie'] },
      ],
      { collapsedDoubleLessonPairs: [1] },
    );

    expect(normalized).toEqual([
      {
        lesson: 1,
        subject: 'Mathe',
        teacher: 'A',
        topics: ['Lineare Algebra', 'Geometrie'],
      },
      { lesson: 2, subject: 'Mathe', teacher: 'A', topics: [] },
    ]);
  });
});
