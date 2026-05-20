import { type CompleteWeekWithReports } from '@/renderer/lib/report-values';
import {
  buildWeeklyDocumentData,
  type WeeklyDocumentTranslations,
} from '@/renderer/lib/weekly-report-document';

const translations: WeeklyDocumentTranslations = {
  title: 'Ausbildungsnachweis',
  pageLabel: 'Seite {{page}} von {{total}}',
  emptyValue: '-',
  labels: {
    name: 'Name:',
    apprenticeIdentifier: 'Azubi-Ident-Nummer:',
    profession: 'Beruf:',
    trainingPeriod: 'Ausbildungszeitraum:',
    rangeStart: 'Zeitraum von: (*)',
    rangeEnd: 'bis: (*)',
    area: 'Ausbildungsabschnitt / - Abteilung: (*)',
    supervisor: 'E-Mail des Betreuers: (*)',
    supervisorRepeat: 'E-Mail des Betreuers (Wiederholung): (*)',
  },
  sections: {
    work: 'Betriebliche Tätigkeiten:',
    training: 'Unterweisungen:',
    school: 'Berufsschule:',
  },
};

describe('buildWeeklyDocumentData', () => {
  it('keeps the page label needed by the weekly PDF footer', () => {
    const week: CompleteWeekWithReports = {
      weeklyReport: {
        id: 'week-1',
        weekStart: '2026-06-15',
        weekEnd: '2026-06-21',
        values: {},
        dailyReportIds: ['day-1'],
        createdAt: '2026-06-15T00:00:00.000Z',
        updatedAt: '2026-06-15T00:00:00.000Z',
      },
      dailyReports: [
        {
          id: 'day-1',
          weeklyReportId: 'week-1',
          date: '2026-06-15',
          values: {
            dayType: 'work',
            activities: ['Code Review im Team durchgeführt'],
          },
          createdAt: '2026-06-15T00:00:00.000Z',
          updatedAt: '2026-06-15T00:00:00.000Z',
        },
      ],
      trackedDaysCount: 7,
      totalDaysCount: 7,
    };

    expect(
      buildWeeklyDocumentData({
        week,
        settingsValues: {},
        translations,
      }).pageLabel,
    ).toBe(translations.pageLabel);
  });
});
