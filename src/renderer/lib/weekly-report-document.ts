import { TFunction } from 'i18next';

import {
  buildWeeklySectionDayGroups,
  CompleteWeekWithReports,
  parseWeeklyReportValues,
  WeeklySectionDayEntry,
} from '@/renderer/lib/report-values';
import {
  parseOnboardingIdentity,
  parseOnboardingTrainingPeriod,
  parseOnboardingWorkplace,
  parseUiSettings,
} from '@/renderer/lib/app-settings';
import { JsonObject } from '@/shared/common/json';

export type WeeklyDocumentDensity = 'regular' | 'compact' | 'dense';

export type WeeklyDocumentField = {
  label: string;
  value: string;
};

export type WeeklyDocumentSectionEntry = {
  heading: string;
  items: string[];
};

export type WeeklyDocumentSection = {
  title: string;
  entries: WeeklyDocumentSectionEntry[];
  emptyValue: string;
};

export type WeeklyDocumentTranslations = {
  title: string;
  labels: {
    name: string;
    apprenticeIdentifier: string;
    profession: string;
    trainingPeriod: string;
    rangeStart: string;
    rangeEnd: string;
    area: string;
    supervisor: string;
    supervisorRepeat: string;
  };
  sections: {
    work: string;
    training: string;
    school: string;
  };
  emptyValue: string;
};

export type WeeklyDocumentData = {
  title: string;
  summaryFields: WeeklyDocumentField[];
  rangeStartField: WeeklyDocumentField;
  rangeEndField: WeeklyDocumentField;
  areaField: WeeklyDocumentField;
  supervisorField: WeeklyDocumentField;
  supervisorRepeatField: WeeklyDocumentField;
  sections: WeeklyDocumentSection[];
  density: WeeklyDocumentDensity;
};

export function createWeeklyDocumentTranslations(
  t: TFunction<'translation', undefined>,
): WeeklyDocumentTranslations {
  return {
    title: t('weeklyDocument.title'),
    labels: {
      name: t('weeklyDocument.labels.name'),
      apprenticeIdentifier: t('weeklyDocument.labels.apprenticeIdentifier'),
      profession: t('weeklyDocument.labels.profession'),
      trainingPeriod: t('weeklyDocument.labels.trainingPeriod'),
      rangeStart: t('weeklyDocument.labels.rangeStart'),
      rangeEnd: t('weeklyDocument.labels.rangeEnd'),
      area: t('weeklyDocument.labels.area'),
      supervisor: t('weeklyDocument.labels.supervisor'),
      supervisorRepeat: t('weeklyDocument.labels.supervisorRepeat'),
    },
    sections: {
      work: t('weeklyDocument.sections.work'),
      training: t('weeklyDocument.sections.training'),
      school: t('weeklyDocument.sections.school'),
    },
    emptyValue: t('weeklyDocument.emptyValue'),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toDisplayDate(value: string | null | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '';
  }

  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function formatWeekday(date: string): string {
  const value = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTrainingPeriod(start: string | null, end: string | null): string {
  const startValue = toDisplayDate(start);
  const endValue = toDisplayDate(end);

  if (!startValue && !endValue) {
    return '';
  }

  return `${startValue || '-'} - ${endValue || '-'}`;
}

function resolveValue(value: string | null | undefined, emptyValue: string): string {
  if (!value || !value.trim().length) {
    return emptyValue;
  }

  return value.trim();
}

function resolveSectionEntries(
  entries: WeeklySectionDayEntry[],
): WeeklyDocumentSectionEntry[] {
  return entries.map((entry) => ({
    heading: `${formatWeekday(entry.date)} - ${toDisplayDate(entry.date)}:`,
    items: entry.items,
  }));
}

function resolveDensity(sections: WeeklyDocumentSection[]): WeeklyDocumentDensity {
  const itemCount = sections.reduce(
    (sum, section) =>
      sum +
      section.entries.reduce((entrySum, entry) => entrySum + entry.items.length, 0),
    0,
  );
  const textLength = sections.reduce(
    (sum, section) =>
      sum +
      section.entries.reduce(
        (entrySum, entry) =>
          entrySum +
          entry.heading.length +
          entry.items.reduce((itemSum, item) => itemSum + item.length, 0),
        0,
      ),
    0,
  );

  if (itemCount > 24 || textLength > 1800) {
    return 'dense';
  }

  if (itemCount > 14 || textLength > 1000) {
    return 'compact';
  }

  return 'regular';
}

export function buildWeeklyDocumentData(input: {
  week: CompleteWeekWithReports;
  settingsValues: JsonObject;
  translations: WeeklyDocumentTranslations;
}): WeeklyDocumentData {
  const identity = parseOnboardingIdentity(input.settingsValues);
  const trainingPeriod = parseOnboardingTrainingPeriod(input.settingsValues);
  const workplace = parseOnboardingWorkplace(input.settingsValues);
  const uiSettings = parseUiSettings(input.settingsValues);
  const parsedWeek = parseWeeklyReportValues(input.week.weeklyReport.values);
  const nameValue = [identity.firstName, identity.lastName]
    .filter((value): value is string => Boolean(value && value.trim().length))
    .join(' ');
  const supervisorValue =
    parsedWeek.supervisorEmailPrimary ||
    workplace.trainerEmail ||
    uiSettings.supervisorEmailPrimary ||
    '';
  const areaValue =
    parsedWeek.area || workplace.department || uiSettings.defaultDepartment || '';
  const groups = buildWeeklySectionDayGroups(input.week.dailyReports);
  const sections: WeeklyDocumentSection[] = [
    {
      title: input.translations.sections.work,
      entries: resolveSectionEntries(groups.work),
      emptyValue: input.translations.emptyValue,
    },
    {
      title: input.translations.sections.training,
      entries: resolveSectionEntries(groups.trainings),
      emptyValue: input.translations.emptyValue,
    },
    {
      title: input.translations.sections.school,
      entries: resolveSectionEntries(groups.school),
      emptyValue: input.translations.emptyValue,
    },
  ];

  return {
    title: input.translations.title,
    summaryFields: [
      {
        label: input.translations.labels.name,
        value: resolveValue(nameValue, input.translations.emptyValue),
      },
      {
        label: input.translations.labels.apprenticeIdentifier,
        value: resolveValue(
          identity.apprenticeIdentifier,
          input.translations.emptyValue,
        ),
      },
      {
        label: input.translations.labels.profession,
        value: resolveValue(identity.profession, input.translations.emptyValue),
      },
      {
        label: input.translations.labels.trainingPeriod,
        value: resolveValue(
          formatTrainingPeriod(
            trainingPeriod.trainingStart,
            trainingPeriod.trainingEnd,
          ),
          input.translations.emptyValue,
        ),
      },
    ],
    rangeStartField: {
      label: input.translations.labels.rangeStart,
      value: resolveValue(
        toDisplayDate(input.week.weeklyReport.weekStart),
        input.translations.emptyValue,
      ),
    },
    rangeEndField: {
      label: input.translations.labels.rangeEnd,
      value: resolveValue(
        toDisplayDate(input.week.weeklyReport.weekEnd),
        input.translations.emptyValue,
      ),
    },
    areaField: {
      label: input.translations.labels.area,
      value: resolveValue(areaValue, input.translations.emptyValue),
    },
    supervisorField: {
      label: input.translations.labels.supervisor,
      value: resolveValue(supervisorValue, input.translations.emptyValue),
    },
    supervisorRepeatField: {
      label: input.translations.labels.supervisorRepeat,
      value: resolveValue(supervisorValue, input.translations.emptyValue),
    },
    density: resolveDensity(sections),
    sections,
  };
}

function buildSummaryFieldHtml(field: WeeklyDocumentField): string {
  return `<div class="summary-field"><span class="summary-label">${escapeHtml(field.label)}</span><span class="summary-value">${escapeHtml(field.value)}</span></div>`;
}

function buildBoxFieldHtml(field: WeeklyDocumentField): string {
  return `<div class="box-field"><div class="box-label">${escapeHtml(field.label)}</div><div class="box-value">${escapeHtml(field.value)}</div></div>`;
}

function buildSectionHtml(section: WeeklyDocumentSection): string {
  if (!section.entries.length) {
    return `<section class="content-section"><h2>${escapeHtml(section.title)}</h2><p class="section-empty">${escapeHtml(section.emptyValue)}</p></section>`;
  }

  return `<section class="content-section"><h2>${escapeHtml(section.title)}</h2>${section.entries
    .map(
      (entry) =>
        `<div class="section-entry"><h3>${escapeHtml(entry.heading)}</h3><ul>${entry.items
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join('')}</ul></div>`,
    )
    .join('')}</section>`;
}

export function buildWeeklyDocumentHtml(input: {
  document: WeeklyDocumentData;
}): string {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.document.title)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    html, body { margin: 0; padding: 0; background: #ffffff; color: #111827; font-family: "Segoe UI", Arial, sans-serif; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 190mm; min-height: 277mm; box-sizing: border-box; margin: 0 auto; padding: 8mm 7.5mm; }
    .page.regular { font-size: 12px; }
    .page.compact { font-size: 11px; }
    .page.dense { font-size: 10px; }
    h1 { margin: 0 0 6mm; text-align: center; font-size: 20px; font-weight: 700; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2.5mm 4mm; margin-bottom: 5mm; }
    .summary-field { display: flex; justify-content: space-between; gap: 2mm; align-items: baseline; }
    .summary-label { font-weight: 700; white-space: nowrap; }
    .summary-value { text-align: right; min-width: 0; word-break: break-word; }
    .box-row { display: grid; gap: 4mm; margin-bottom: 3.25mm; }
    .box-row.two-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .box-row.one-column { grid-template-columns: minmax(0, 1fr); }
    .box-label { margin-bottom: 1.5mm; font-weight: 700; }
    .box-value { min-height: 10.5mm; border: 1px solid #d1d5db; padding: 2.6mm 3mm; display: flex; align-items: center; }
    .content-section + .content-section { margin-top: 4.5mm; }
    .content-section h2 { margin: 0 0 2.5mm; font-size: 1.08em; font-weight: 700; }
    .section-entry + .section-entry { margin-top: 2.5mm; }
    .section-entry h3 { margin: 0 0 1.5mm; font-size: 1em; font-weight: 700; }
    .section-entry ul { margin: 0; padding-left: 4.5mm; }
    .section-entry li { margin: 0 0 1mm; line-height: 1.35; }
    .section-empty { margin: 0; }
    .page.compact .summary-grid { gap: 2mm 3.5mm; margin-bottom: 4mm; }
    .page.compact .box-row { gap: 3.5mm; margin-bottom: 2.75mm; }
    .page.compact .box-value { min-height: 9.5mm; padding: 2.2mm 2.8mm; }
    .page.compact .content-section + .content-section { margin-top: 4mm; }
    .page.compact .section-entry + .section-entry { margin-top: 2mm; }
    .page.dense .summary-grid { gap: 1.5mm 3mm; margin-bottom: 3.5mm; }
    .page.dense .box-row { gap: 3mm; margin-bottom: 2.2mm; }
    .page.dense .box-label { margin-bottom: 1mm; }
    .page.dense .box-value { min-height: 8.5mm; padding: 2mm 2.5mm; }
    .page.dense .content-section + .content-section { margin-top: 3mm; }
    .page.dense .section-entry + .section-entry { margin-top: 1.5mm; }
    .page.dense .section-entry li { margin-bottom: 0.7mm; line-height: 1.28; }
  </style>
</head>
<body>
  <main class="page ${input.document.density}">
    <h1>${escapeHtml(input.document.title)}</h1>
    <section class="summary-grid">${input.document.summaryFields
      .map(buildSummaryFieldHtml)
      .join('')}</section>
    <section class="box-row two-columns">${buildBoxFieldHtml(
      input.document.rangeStartField,
    )}${buildBoxFieldHtml(input.document.rangeEndField)}</section>
    <section class="box-row one-column">${buildBoxFieldHtml(
      input.document.areaField,
    )}</section>
    <section class="box-row two-columns">${buildBoxFieldHtml(
      input.document.supervisorField,
    )}${buildBoxFieldHtml(input.document.supervisorRepeatField)}</section>
    ${input.document.sections.map(buildSectionHtml).join('')}
  </main>
</body>
</html>`;
}
