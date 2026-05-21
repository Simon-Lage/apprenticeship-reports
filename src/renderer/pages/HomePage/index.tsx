import { ReactNode, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import {
  FiCalendar,
  FiClock,
  FiEdit3,
  FiFileText,
  FiGrid,
  FiLayers,
  FiList,
  FiSettings,
  FiSlash,
} from 'react-icons/fi';
import { IconType } from 'react-icons';
import { Link, useNavigate } from 'react-router-dom';

import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import {
  useReportsState,
  useSettingsSnapshot,
} from '@/renderer/hooks/useKernelData';
import { parseOnboardingTrainingPeriod } from '@/renderer/lib/app-settings';
import { appRoutes } from '@/renderer/lib/app-routes';
import { buildHomeStatsSnapshot } from '@/renderer/lib/home-stats';
import { cn } from '@/renderer/lib/utils';
import { Button } from '@/components/ui/button';
import { resolveReportStartDateFromSettings } from '@/shared/settings/report-start-date';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { isWeeklyReportSubmitted } from '@/shared/reports/edit-locks';

type AreaCard = {
  to: string;
  icon: IconType;
  titleKey: string;
  descriptionKey: string;
};

type HomeStat = {
  label: string;
  value: string | number;
  icon: IconType;
  description?: ReactNode;
  valueClassName?: string;
};

const areaCards: AreaCard[] = [
  {
    to: appRoutes.dailyReport,
    icon: FiFileText,
    titleKey: 'home.areas.daily.title',
    descriptionKey: 'home.areas.daily.description',
  },
  {
    to: appRoutes.absences,
    icon: FiSlash,
    titleKey: 'home.areas.absences.title',
    descriptionKey: 'home.areas.absences.description',
  },
  {
    to: appRoutes.weeklyReport,
    icon: FiCalendar,
    titleKey: 'home.areas.weekly.title',
    descriptionKey: 'home.areas.weekly.description',
  },
  {
    to: appRoutes.reportsOverview,
    icon: FiList,
    titleKey: 'home.areas.overview.title',
    descriptionKey: 'home.areas.overview.description',
  },
  {
    to: appRoutes.timeTable,
    icon: FiGrid,
    titleKey: 'home.areas.timetable.title',
    descriptionKey: 'home.areas.timetable.description',
  },
  {
    to: appRoutes.settings,
    icon: FiSettings,
    titleKey: 'home.areas.settings.title',
    descriptionKey: 'home.areas.settings.description',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

function formatPercent(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function resolveBacklogValueClassName(value: number): string {
  if (value <= 1) return 'text-emerald-800';
  if (value <= 4) return 'text-amber-800';
  return 'text-red-800';
}

function resolveBatchSizeValueClassName(value: number): string {
  if (value <= 3) return 'text-emerald-800';
  if (value < 8) return 'text-amber-800';
  return 'text-red-800';
}

function resolveSameDayRateValueClassName(value: number): string {
  if (value <= 0.1) return 'text-red-800';
  if (value < 0.9) return 'text-amber-800';
  return 'text-emerald-800';
}

function resolveWeeklySendValueClassName(value: number): string {
  if (value <= 1) return 'text-emerald-800';
  if (value === 2) return 'text-amber-800';
  return 'text-red-800';
}

function getTodayIsoDate(): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';

  return `${year}-${month}-${day}`;
}

function HomeStatCard({ stat, compact }: { stat: HomeStat; compact: boolean }) {
  const Icon = stat.icon;

  return (
    <Card className="gap-0 border-primary-tint/80 bg-white/90 p-0 shadow-sm">
      <CardHeader
        className={cn(
          'flex flex-row items-start justify-between gap-3 p-4',
          stat.description ? 'pb-2' : 'pb-4',
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <CardDescription className="text-xs font-semibold uppercase text-text-color/55">
            {stat.label}
          </CardDescription>
          <CardTitle
            className={cn(
              'break-words font-bold',
              stat.valueClassName ?? 'text-primary',
              compact ? 'text-2xl' : 'text-3xl',
            )}
          >
            {stat.value}
          </CardTitle>
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary',
            compact ? 'size-9' : 'size-10',
          )}
        >
          <Icon className={compact ? 'size-4' : 'size-5'} aria-hidden />
        </div>
      </CardHeader>
      {stat.description ? (
        <CardContent className="p-4 pt-0">
          <p className="text-sm leading-relaxed text-text-color/70">
            {stat.description}
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const runtime = useAppRuntime();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();

  const dailyCount = runtime.state.reports.dailyReportCount;
  const trainingPeriod = useMemo(
    () => parseOnboardingTrainingPeriod(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const reportStartDate = useMemo(
    () =>
      resolveReportStartDateFromSettings(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const homeStats = useMemo(
    () =>
      buildHomeStatsSnapshot({
        dailyReports: Object.values(reportsState.value?.dailyReports ?? {}),
        reportStartDate,
        reportEndDate: trainingPeriod.trainingEnd ?? null,
        today: getTodayIsoDate(),
      }),
    [
      reportsState.value?.dailyReports,
      reportStartDate,
      trainingPeriod.trainingEnd,
    ],
  );
  const weeklyReportStats = useMemo(() => {
    const weeklyReports = Object.values(
      reportsState.value?.weeklyReports ?? {},
    );
    const submittedCount = weeklyReports.filter((weeklyReport) =>
      isWeeklyReportSubmitted(weeklyReport),
    ).length;

    return {
      totalCount: weeklyReports.length,
      submittedCount,
      toSendCount: Math.max(weeklyReports.length - submittedCount, 0),
    };
  }, [reportsState.value?.weeklyReports]);
  const backlogValueClassName = resolveBacklogValueClassName(
    homeStats.backlogDays,
  );
  const averageReportsPerEntryDayDisplay = formatDecimal(
    homeStats.averageReportsPerEntryDay,
  );
  const batchSizeValueClassName = resolveBatchSizeValueClassName(
    homeStats.averageReportsPerEntryDay,
  );
  const sameDayRateValueClassName = resolveSameDayRateValueClassName(
    homeStats.sameDayRate,
  );
  const weeklySendValueClassName = resolveWeeklySendValueClassName(
    weeklyReportStats.toSendCount,
  );
  const spotlightStats: HomeStat[] = [
    {
      label: t('home.stats.backlogDays'),
      value: String(homeStats.backlogDays),
      description: t('home.stats.backlogDaysDescription', {
        count: homeStats.backlogDays,
      }),
      icon: FiClock,
      valueClassName: backlogValueClassName,
    },
    {
      label: t('home.stats.averageBatchSize'),
      value: averageReportsPerEntryDayDisplay,
      description: (
        <Trans
          i18nKey="home.stats.averageBatchSizeDescription"
          values={{
            average: averageReportsPerEntryDayDisplay,
            sameDayRate: formatPercent(homeStats.sameDayRate),
          }}
          components={{
            sameDayRate: (
              <span
                className={cn('font-semibold', sameDayRateValueClassName)}
              />
            ),
          }}
        />
      ),
      icon: FiLayers,
      valueClassName: batchSizeValueClassName,
    },
    {
      label: t('home.stats.entryModes'),
      value: t('home.stats.entryModesValue', {
        manual: homeStats.manualCount,
        automatic: homeStats.automaticCount,
      }),
      description: t('home.stats.entryModesDescription', {
        total: dailyCount,
        manual: homeStats.manualCount,
        automatic: homeStats.automaticCount,
      }),
      icon: FiEdit3,
    },
    {
      label: t('home.stats.weeklyReportsToSend'),
      value: weeklyReportStats.toSendCount,
      description: t('home.stats.weeklyReportsToSendDescription', {
        total: weeklyReportStats.totalCount,
        submitted: weeklyReportStats.submittedCount,
      }),
      icon: FiCalendar,
      valueClassName: weeklySendValueClassName,
    },
  ];
  return (
    <motion.div
      className="flex flex-col gap-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <section className="grid gap-4">
        <motion.div variants={itemVariants}>
          <Card className="relative flex h-full flex-col overflow-hidden border-primary-tint bg-white/50 p-6 shadow-sm backdrop-blur-sm">
            <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

            <div className="relative z-10 flex flex-1 flex-col gap-6">
              <div className="flex flex-wrap justify-between items center">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <CardTitle className="mt-1 text-4xl font-bold text-text-color">
                    <span className="text-primary">
                      {t('home.hero.titleParts.app')}
                    </span>
                    {t('home.hero.titleParts.apprenticeshipRest')}{' '}
                    <span className="text-primary">
                      {t('home.hero.titleParts.rep')}
                    </span>
                    {t('home.hero.titleParts.reportingRest')}
                  </CardTitle>
                </motion.div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => navigate(appRoutes.dailyReport)}
                    className="bg-primary text-primary-contrast hover:bg-primary-shade"
                  >
                    <FiFileText className="mr-2 h-4 w-4" />
                    {t('home.actions.captureDay')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(appRoutes.reportsOverview)}
                    className="border-primary-tint text-text-color hover:bg-primary/5"
                  >
                    {t('home.actions.allReports')}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 pt-2 md:grid-cols-2 xl:grid-cols-4">
                {spotlightStats.map((stat) => (
                  <HomeStatCard key={stat.label} stat={stat} compact={false} />
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {areaCards.map((areaCard) => {
          const Icon = areaCard.icon;

          return (
            <motion.div key={areaCard.to} variants={itemVariants}>
              <Link to={areaCard.to} draggable={false} className="block h-full">
                <Card className="group relative h-full overflow-hidden border-primary-tint bg-white p-6 transition-all hover:border-primary hover:shadow-lg active:scale-[0.98]">
                  <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] transition-transform group-hover:scale-110 group-hover:opacity-[0.05]">
                    <Icon className="size-32" />
                  </div>
                  <div className="relative flex h-full flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-contrast">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle className="text-lg font-bold text-text-color">
                        {t(areaCard.titleKey)}
                      </CardTitle>
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-text-color/70">
                      {t(areaCard.descriptionKey)}
                    </p>
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </section>
    </motion.div>
  );
}
