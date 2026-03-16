import { IconType } from 'react-icons';
import {
  FiCalendar,
  FiFileText,
  FiGrid,
  FiList,
  FiSlash,
  FiSettings,
  FiArrowRight,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, Cell } from 'recharts';

import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useReportsState } from '@/renderer/hooks/useKernelData';
import { appRoutes } from '@/renderer/lib/app-routes';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

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
      ease: [0.22, 1, 0.36, 1] as const, // easeOutQuint
    },
  },
};

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const runtime = useAppRuntime();
  const reportsState = useReportsState();

  const dailyCount = runtime.state.reports.dailyReportCount;
  const weeklyCount = runtime.state.reports.weeklyReportCount;
  const reportedDays = dailyCount;

  const activityData = useMemo(() => {
    const data = [];
    const now = new Date();
    const reports = reportsState.value?.dailyReports || {};
    
    // Last 14 days
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const count = Object.values(reports).filter(
        (r: any) => r.date === dateStr
      ).length;
      
      data.push({
        date: dateStr,
        label: d.toLocaleDateString('de-DE', { 
          weekday: 'short', 
          day: '2-digit' 
        }),
        count,
      });
    }
    return data;
  }, [reportsState.value]);

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <motion.div variants={itemVariants}>
          <Card className="flex flex-col h-full border-primary-tint bg-white/50 backdrop-blur-sm p-6 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            
            <div className="flex-1 space-y-6 relative z-10">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <CardDescription className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-shade">
                    {t('home.hero.kicker')}
                  </CardDescription>
                  <CardTitle className="mt-1 text-4xl font-bold text-text-color tracking-tight">
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
                  className="bg-primary hover:bg-primary-shade text-primary-contrast"
                >
                  <FiFileText className="mr-2 h-4 w-4" />
                  Tag erfassen
                  <FiArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate(appRoutes.reportsOverview)}
                  className="border-primary-tint text-text-color hover:bg-primary/5"
                >
                  Alle Berichte
                </Button>
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-text-color/60 uppercase tracking-wider">
                    Aktivität (Letzte 14 Tage)
                  </h4>
                </div>
                <div className="h-[120px] w-full">
                  <ChartContainer
                    config={{
                      count: {
                        label: 'Einträge',
                        color: 'var(--primary)',
                      },
                    }}
                    className="h-full w-full"
                  >
                    <BarChart data={activityData}>
                      <Bar 
                        dataKey="count" 
                        radius={[4, 4, 0, 0]}
                        fill="var(--primary)"
                      >
                        {activityData.map((entry) => (
                          <Cell 
                            key={`cell-${entry.date}`} 
                            fill={entry.count > 0 ? 'var(--primary)' : 'var(--primary-tint)'} 
                            fillOpacity={entry.count > 0 ? 1 : 0.2}
                          />
                        ))}
                      </Bar>
                      <ChartTooltip
                        cursor={{ fill: 'var(--primary-tint)', fillOpacity: 0.1 }}
                        content={<ChartTooltipContent hideLabel />}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {[
            { label: t('home.stats.dailyReports'), value: dailyCount, icon: FiFileText },
            { label: t('home.stats.weeklyReports'), value: weeklyCount, icon: FiCalendar },
            { label: t('home.stats.totalEntries'), value: reportedDays, icon: FiList },
          ].map((stat) => (
            <motion.div key={stat.label} variants={itemVariants}>
              <Card className="border-primary-tint bg-white p-5 shadow-sm transition-all hover:shadow-md group">
                <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0">
                  <CardDescription className="text-sm font-medium text-text-color/60">
                    {stat.label}
                  </CardDescription>
                  <stat.icon className="size-4 text-primary/40 group-hover:text-primary transition-colors" />
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
              <Link
                to={areaCard.to}
                draggable={false}
                className="block h-full"
              >
                <Card className="group relative h-full overflow-hidden border-primary-tint bg-white p-6 transition-all hover:border-primary hover:shadow-lg active:scale-[0.98]">
                  <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] transition-transform group-hover:scale-110 group-hover:opacity-[0.05]">
                    <Icon className="size-32" />
                  </div>
                  <div className="relative flex flex-col h-full space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-contrast">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle className="text-lg font-bold text-text-color tracking-tight">
                        {t(areaCard.titleKey)}
                      </CardTitle>
                    </div>
                    <p className="text-sm leading-relaxed text-text-color/70 flex-1">
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
