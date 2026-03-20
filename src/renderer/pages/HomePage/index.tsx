import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FiCalendar,
  FiCheckCircle,
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
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type AreaCard = {
  to: string;
  icon: IconType;
  titleKey: string;
  descriptionKey: string;
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

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const runtime = useAppRuntime();
  const reportsState = useReportsState();
  const settingsSnapshot = useSettingsSnapshot();

  const dailyCount = runtime.state.reports.dailyReportCount;
  const weeklyCount = runtime.state.reports.weeklyReportCount;
  const reportedDays = dailyCount;
  const trainingPeriod = useMemo(
    () => parseOnboardingTrainingPeriod(settingsSnapshot.value?.values ?? {}),
    [settingsSnapshot.value?.values],
  );
  const homeStats = useMemo(
    () =>
      buildHomeStatsSnapshot({
        dailyReports: Object.values(reportsState.value?.dailyReports ?? {}),
        reportStartDate:
          trainingPeriod.reportsSince ?? trainingPeriod.trainingStart ?? null,
        reportEndDate: trainingPeriod.trainingEnd ?? null,
        today: getTodayIsoDate(),
      }),
    [
      reportsState.value?.dailyReports,
      trainingPeriod.reportsSince,
      trainingPeriod.trainingEnd,
      trainingPeriod.trainingStart,
    ],
  );
  const spotlightStats = [
    {
      label: t('home.stats.backlogDays'),
      value: String(homeStats.backlogDays),
      description: t('home.stats.backlogDaysDescription'),
      icon: FiClock,
    },
    {
      label: t('home.stats.sameDayRate'),
      value: formatPercent(homeStats.sameDayRate),
      description: t('home.stats.sameDayRateDescription'),
      icon: FiCheckCircle,
    },
    {
      label: t('home.stats.averageBatchSize'),
      value: formatDecimal(homeStats.averageReportsPerEntryDay),
      description: t('home.stats.averageBatchSizeDescription', {
        count: homeStats.entryDayCount,
      }),
      icon: FiLayers,
    },
    {
      label: t('home.stats.entryModes'),
      value: t('home.stats.entryModesValue', {
        manual: homeStats.manualCount,
        automatic: homeStats.automaticCount,
      }),
      description: t('home.stats.entryModesDescription'),
      icon: FiEdit3,
    },
  ];

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <section className="grid gap-4">
        <motion.div variants={itemVariants}>
          <Card className="relative flex h-full flex-col overflow-hidden border-primary-tint bg-white/50 p-6 shadow-sm backdrop-blur-sm">
            <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

            <div className="relative z-10 flex-1 space-y-6">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <CardDescription className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-shade">
                    {t('home.hero.kicker')}
                  </CardDescription>
                  <CardTitle className="mt-1 text-4xl font-bold tracking-tight text-text-color">
                    {t('home.hero.title')}
                  </CardTitle>
                </motion.div>
                <motion.p
                  className="mt-3 max-w-md text-base leading-relaxed text-text-color/70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {t('home.hero.description')}
                </motion.p>
              </div>

              <div className="flex flex-wrap gap-3">
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

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                {spotlightStats.map((stat) => (
                  <Card
                    key={stat.label}
                    className="border-primary-tint/80 bg-white/90 shadow-sm"
                  >
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
                      <div className="space-y-1">
                        <CardDescription className="text-xs font-semibold uppercase tracking-[0.12em] text-text-color/55">
                          {stat.label}
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold tracking-tight text-primary">
                          {stat.value}
                        </CardTitle>
                      </div>
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <stat.icon className="size-5" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm leading-relaxed text-text-color/70">
                        {stat.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid gap-4 grid-cols-3">
          {[
            {
              label: t('home.stats.dailyReports'),
              value: dailyCount,
              icon: FiFileText,
            },
            {
              label: t('home.stats.weeklyReports'),
              value: weeklyCount,
              icon: FiCalendar,
            },
            {
              label: t('home.stats.totalEntries'),
              value: reportedDays,
              icon: FiList,
            },
          ].map((stat) => (
            <motion.div key={stat.label} variants={itemVariants}>
              <Card className="group border-primary-tint bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
                  <CardDescription className="text-sm font-medium text-text-color/60">
                    {stat.label}
                  </CardDescription>
                  <stat.icon className="size-4 text-primary/40 transition-colors group-hover:text-primary" />
                </CardHeader>
                <CardContent className="mt-2 p-0">
                  <p className="text-4xl font-bold tracking-tight text-primary">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
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
                  <div className="relative flex h-full flex-col space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-contrast">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle className="text-lg font-bold tracking-tight text-text-color">
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
