import { normalizeLessons } from '@/renderer/lib/report-values';

describe('normalizeLessons', () => {
  it('copies topics within double-period pair 1/2 when subject and teacher match', () => {
    const normalized = normalizeLessons([
      { lesson: 1, subject: 'Mathe', teacher: 'A', topics: [] },
      { lesson: 2, subject: 'Mathe', teacher: 'A', topics: ['Bruchrechnung'] },
    ]);

    expect(normalized).toEqual([
      { lesson: 1, subject: 'Mathe', teacher: 'A', topics: ['Bruchrechnung'] },
      { lesson: 2, subject: 'Mathe', teacher: 'A', topics: ['Bruchrechnung'] },
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
});
