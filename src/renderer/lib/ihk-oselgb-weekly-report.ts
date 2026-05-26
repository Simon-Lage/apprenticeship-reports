import { TFunction } from 'i18next';

import {
  buildWeeklyDocumentData,
  createWeeklyDocumentTranslations,
  serializeWeeklyDocumentSectionEntries,
} from '@/renderer/lib/weekly-report-document';
import { CompleteWeekWithReports } from '@/renderer/lib/report-values';
import { JsonObject } from '@/shared/common/json';
import {
  SaveIhkOselgbWeeklyReportInput,
  SaveIhkOselgbWeeklyReportInputSchema,
} from '@/shared/ihk/ihk-oselgb';

function normalizeDocumentValue(value: string, emptyValue: string): string {
  const normalized = value.trim();

  if (!normalized || normalized === emptyValue) {
    return '';
  }

  return normalized;
}

export function buildIhkOselgbWeeklyReportInput(input: {
  settingsValues: JsonObject;
  t: TFunction<'translation', undefined>;
  week: CompleteWeekWithReports;
}): SaveIhkOselgbWeeklyReportInput {
  const translations = createWeeklyDocumentTranslations(input.t);
  const documentData = buildWeeklyDocumentData({
    week: input.week,
    settingsValues: input.settingsValues,
    translations,
  });
  const { emptyValue, sections } = documentData;

  return SaveIhkOselgbWeeklyReportInputSchema.parse({
    weekStart: input.week.weeklyReport.weekStart,
    weekEnd: input.week.weeklyReport.weekEnd,
    area: normalizeDocumentValue(documentData.areaField.value, emptyValue),
    supervisorEmail: normalizeDocumentValue(
      documentData.supervisorField.value,
      emptyValue,
    ),
    workText: sections[0]?.entries.length
      ? serializeWeeklyDocumentSectionEntries(sections[0].entries)
      : '',
    trainingText: sections[1]?.entries.length
      ? serializeWeeklyDocumentSectionEntries(sections[1].entries)
      : '',
    schoolText: sections[2]?.entries.length
      ? serializeWeeklyDocumentSectionEntries(sections[2].entries)
      : '',
  });
}
