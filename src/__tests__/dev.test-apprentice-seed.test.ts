import {
  createDevTestApprenticeSeed,
  DEV_TEST_APPRENTICE_DRIVE_SCOPE,
} from '@/shared/dev/test-apprentice-seed';
import { parseAbsenceSettings } from '@/shared/absence/settings';
import { parseDailyReportValues } from '@/renderer/lib/report-values';

describe('dev test apprentice seed', () => {
  it('creates a complete and consistent yearly dataset', () => {
    const seed = createDevTestApprenticeSeed({
      now: '2026-12-31T18:00:00.000Z',
      driveScope: DEV_TEST_APPRENTICE_DRIVE_SCOPE,
    });
    const { metadata } = seed;

    expect(seed.stats.reportsStartDate).toBe('2026-08-01');
    expect(seed.stats.reportsEndDate).toBe('2026-12-31');
    expect(seed.stats.trainingStartDate).toBe('2026-08-01');
    expect(seed.stats.trainingEndDate).toBe('2029-07-31');
    expect(seed.stats.dailyReportCount).toBe(153);
    expect(seed.stats.weeklyReportCount).toBe(
      Object.keys(metadata.reports.weeklyReports).length,
    );
    expect(Object.keys(metadata.reports.weeklyHashes)).toHaveLength(
      Object.keys(metadata.reports.weeklyReports).length,
    );
    expect(metadata.auth.persistedSession?.provider).toBe('password');
    expect(metadata.auth.persistedSession?.rememberMe).toBe(true);
    expect(metadata.drive.requiredScopes).toEqual([
      DEV_TEST_APPRENTICE_DRIVE_SCOPE,
    ]);
    expect(metadata.drive.grantedScopes).toEqual([
      DEV_TEST_APPRENTICE_DRIVE_SCOPE,
    ]);
    const onboarding = metadata.settings.current.values.onboarding as Record<
      string,
      unknown
    >;

    expect(onboarding['training-period']).toMatchObject({
      trainingStart: '2026-08-01',
      reportsSince: null,
    });
  });

  it('contains realistic absence and school-day coverage', () => {
    const seed = createDevTestApprenticeSeed({
      now: '2026-12-31T18:00:00.000Z',
    });
    const absence = parseAbsenceSettings(seed.metadata.settings.current.values);
    const dailyReports = Object.values(seed.metadata.reports.dailyReports).map(
      (dailyReport) => parseDailyReportValues(dailyReport.values),
    );
    const hasSick = absence.manualAbsences.some(
      (entry) => entry.type === 'sick',
    );
    const hasVacation = absence.manualAbsences.some(
      (entry) => entry.type === 'vacation',
    );
    const schoolDays = dailyReports.filter(
      (dailyReport) => dailyReport.dayType === 'school',
    );
    const hasLesson12 = schoolDays.some((dailyReport) =>
      dailyReport.lessons.some((lesson) => lesson.lesson === 12),
    );
    const hasFutureDailyDate = Object.values(
      seed.metadata.reports.dailyReports,
    ).some((dailyReport) => dailyReport.date > seed.stats.reportsEndDate);
    const hasFutureAbsenceDate = absence.manualAbsences.some(
      (entry) => entry.startDate > seed.stats.reportsEndDate,
    );

    expect(hasSick).toBe(true);
    expect(hasVacation).toBe(true);
    expect(seed.stats.schoolDayCount).toBeGreaterThan(0);
    expect(seed.stats.freeDayCount).toBeGreaterThan(0);
    expect(hasLesson12).toBe(true);
    expect(hasFutureDailyDate).toBe(false);
    expect(hasFutureAbsenceDate).toBe(false);
  });

  it('caps generated data at today when the training start is less than one year old', () => {
    const seed = createDevTestApprenticeSeed({
      now: '2026-05-11T18:00:00.000Z',
    });

    expect(seed.stats.reportsStartDate).toBe('2025-08-01');
    expect(seed.stats.reportsEndDate).toBe('2026-05-11');
    expect(
      Object.values(seed.metadata.reports.dailyReports).some(
        (dailyReport) => dailyReport.date > '2026-05-11',
      ),
    ).toBe(false);
  });
});
