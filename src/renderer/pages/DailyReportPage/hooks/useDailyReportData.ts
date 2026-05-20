import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { FiEdit3, FiLock } from 'react-icons/fi';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import {
  parseOnboardingTrainingPeriod,
  parseUiSettings,
} from '@/renderer/lib/app-settings';
import { resolveReportStartDateFromSettings } from '@/shared/settings/report-start-date';
import { parseAbsenceSettings } from '@/shared/absence/settings';
import {
  collectActivitySuggestions,
  collectSchoolTopicSuggestions,
  collectTrainingSuggestions,
  parseDailyReportValues,
} from '@/renderer/lib/report-values';
import { resolveDailyReportAbsenceConflict } from '@/renderer/lib/report-conflicts';
import { isWeeklyReportSubmitted } from '@/shared/reports/edit-locks';
import {
  formatGermanDate,
  formatGermanDateTime,
  formatGermanWeekdayDate,
} from '@/renderer/lib/date-format';
import { StatusBannerData } from '../components/StatusBanner';
import { resolveAutoDayType } from '../utils/day-type-defaults';
import { resolveWeekRangeForDate } from '../utils/calendar-date-utils';

type ResolvedDailyAbsenceConflict = ReturnType<
  typeof resolveDailyReportAbsenceConflict
>;

export default function useDailyReportData(date: string) {
  const { t } = useTranslation();
  const location = useLocation();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();

  const settingsValues = useMemo(
    () => settingsSnapshot.value?.values ?? {},
    [settingsSnapshot.value?.values],
  );
  const uiSettings = useMemo(
    () => parseUiSettings(settingsValues),
    [settingsValues],
  );
  const trainingPeriod = useMemo(
    () => parseOnboardingTrainingPeriod(settingsValues),
    [settingsValues],
  );
  const reportStartDate = useMemo(
    () => resolveReportStartDateFromSettings(settingsValues),
    [settingsValues],
  );
  const absenceSettings = useMemo(
    () => parseAbsenceSettings(settingsValues),
    [settingsValues],
  );
  const selectedWeekRange = useMemo(
    () => resolveWeekRangeForDate(date),
    [date],
  );
  const requestedDate = useMemo(() => {
    const search = new URLSearchParams(location.search);
    const candidate = search.get('date');
    if (!candidate || !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
    return candidate;
  }, [location.search]);
  const autoDayType = useMemo(() => {
    if (!date) return null;
    return resolveAutoDayType({
      date,
      uiSettings,
      absenceSettings,
      currentYear: new Date(date).getUTCFullYear(),
    });
  }, [absenceSettings, date, uiSettings]);
  const autoReasonText = useMemo(() => {
    if (!autoDayType) return null;
    if (autoDayType.reason.kind === 'public-holiday')
      return t('dailyReport.auto.reasonPublicHoliday', {
        name: autoDayType.reason.name,
      });
    if (autoDayType.reason.kind === 'weekend')
      return t('dailyReport.auto.reasonWeekend');
    if (autoDayType.reason.kind === 'sick')
      return t('dailyReport.auto.reasonSick', {
        name: autoDayType.reason.label ?? '-',
      });
    if (autoDayType.reason.kind === 'vacation')
      return t('dailyReport.auto.reasonVacation', {
        name: autoDayType.reason.label ?? '-',
      });
    if (autoDayType.reason.kind === 'school-holiday')
      return t('dailyReport.auto.reasonSchoolHoliday', {
        name: autoDayType.reason.name,
      });
    return t(
      autoDayType.reason.base === 'school'
        ? 'dailyReport.auto.reasonBaseSchool'
        : 'dailyReport.auto.reasonBaseWork',
    );
  }, [autoDayType, t]);

  const activitySuggestions = useMemo(
    () =>
      reportsState.value ? collectActivitySuggestions(reportsState.value) : [],
    [reportsState.value],
  );
  const trainingSuggestions = useMemo(
    () =>
      reportsState.value ? collectTrainingSuggestions(reportsState.value) : [],
    [reportsState.value],
  );
  const lessonTopicSuggestions = useMemo(
    () =>
      reportsState.value
        ? collectSchoolTopicSuggestions(reportsState.value)
        : [],
    [reportsState.value],
  );

  const currentWeeklyReport = useMemo(() => {
    if (!reportsState.value || !selectedWeekRange || !date) return null;
    return (
      Object.values(reportsState.value.weeklyReports).find(
        (report) =>
          report.weekStart === selectedWeekRange.weekStart &&
          report.weekEnd === selectedWeekRange.weekEnd,
      ) ?? null
    );
  }, [date, reportsState.value, selectedWeekRange]);
  const currentDailyReport = useMemo(() => {
    if (!reportsState.value || !currentWeeklyReport || !date) return null;
    return currentWeeklyReport.dailyReportIds
      .map((dailyReportId) => reportsState.value?.dailyReports[dailyReportId])
      .find((dailyReport) => dailyReport?.date === date);
  }, [currentWeeklyReport, date, reportsState.value]);
  const currentDailyValues = useMemo(
    () => parseDailyReportValues(currentDailyReport?.values),
    [currentDailyReport],
  );
  const isEditing = Boolean(currentDailyReport);
  const isCurrentWeeklyReportSubmitted =
    isWeeklyReportSubmitted(currentWeeklyReport);
  const isSubmittedDailyReport = Boolean(
    currentDailyReport && isCurrentWeeklyReportSubmitted,
  );
  const isContentReadOnly = isSubmittedDailyReport;

  const metaCardTitle = useMemo(() => {
    if (!date) return t('dailyReport.meta.title');
    return t('dailyReport.meta.titleWithDate', {
      date: formatGermanWeekdayDate(date),
    });
  }, [date, t]);

  const absenceConflict: ResolvedDailyAbsenceConflict | null = useMemo(() => {
    if (!currentDailyReport || isCurrentWeeklyReportSubmitted) return null;
    return resolveDailyReportAbsenceConflict({
      date: currentDailyReport.date,
      values: currentDailyReport.values,
      absenceSettings,
    });
  }, [absenceSettings, currentDailyReport, isCurrentWeeklyReportSubmitted]);

  const activeStatusBanner: StatusBannerData | null = useMemo(() => {
    if (!date || !currentDailyReport) return null;
    if (isSubmittedDailyReport) {
      return {
        tone: 'submitted' as const,
        icon: FiLock,
        title: t('dailyReport.status.submittedTitle'),
        description: t('dailyReport.status.submittedDescription'),
        meta: currentWeeklyReport?.updatedAt
          ? t('dailyReport.status.submittedAt', {
              date: formatGermanDateTime(currentWeeklyReport.updatedAt),
            })
          : null,
      };
    }
    return {
      tone: 'editing' as const,
      icon: FiEdit3,
      title: t('dailyReport.status.editingTitle'),
      description: t('dailyReport.status.editingDescription', {
        date: formatGermanDate(date),
      }),
      meta: null,
    };
  }, [
    currentDailyReport,
    currentWeeklyReport?.updatedAt,
    date,
    isSubmittedDailyReport,
    t,
  ]);

  return {
    uiSettings,
    trainingPeriod,
    reportStartDate,
    absenceSettings,
    selectedWeekRange,
    requestedDate,
    autoDayType,
    autoReasonText,
    activitySuggestions,
    trainingSuggestions,
    lessonTopicSuggestions,
    currentWeeklyReport,
    currentDailyReport,
    currentDailyValues,
    isEditing,
    isSubmittedDailyReport,
    isContentReadOnly,
    metaCardTitle,
    absenceConflict,
    activeStatusBanner,
    reportsState,
    settingsSnapshot,
  };
}
