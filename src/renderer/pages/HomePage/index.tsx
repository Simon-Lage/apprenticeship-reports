import { IconType } from 'react-icons';
import {
  FiCalendar,
  FiDownload,
  FiFileText,
  FiGrid,
  FiList,
  FiSlash,
  FiSettings,
  FiUpload,
  FiArrowRight,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { appRoutes } from '@/renderer/lib/app-routes';
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
    to: appRoutes.import,
    icon: FiDownload,
    titleKey: 'home.areas.import.title',
    descriptionKey: 'home.areas.import.description',
  },
  {
    to: appRoutes.export,
    icon: FiUpload,
    titleKey: 'home.areas.export.title',
    descriptionKey: 'home.areas.export.description',
  },
  {
    to: appRoutes.settings,
    icon: FiSettings,
    titleKey: 'home.areas.settings.title',
    descriptionKey: 'home.areas.settings.description',
  },
];

export default function HomePage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();

  const dailyCount = runtime.state.reports.dailyReportCount;
  const weeklyCount = runtime.state.reports.weeklyReportCount;
  const reportedDays = dailyCount;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="flex flex-col border-primary-tint bg-white p-6 shadow-sm">
          <div className="flex-1 space-y-4">
            <div>
              <CardDescription className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-shade">
                {t('home.hero.kicker')}
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-bold text-text-color">
                {t('home.hero.title')}
              </CardTitle>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-text-color/75">
              {t('home.hero.description')}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to={appRoutes.dailyReport}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-shade"
              >
                <FiFileText className="size-4" />
                <span>Tag erfassen</span>
                <FiArrowRight className="size-4" />
              </Link>
              <Link
                to={appRoutes.reportsOverview}
                className="flex items-center gap-2 rounded-lg border border-primary-tint px-4 py-2 text-sm font-medium text-text-color transition-colors hover:bg-primary-tint/10"
              >
                <span>Alle Berichte</span>
              </Link>
            </div>
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Card className="border-primary-tint bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="p-0">
              <CardDescription className="text-sm font-medium">
                {t('home.stats.dailyReports')}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-2 p-0">
              <p className="text-4xl font-bold tracking-tight text-primary">
                {dailyCount}
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary-tint bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="p-0">
              <CardDescription className="text-sm font-medium">
                {t('home.stats.weeklyReports')}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-2 p-0">
              <p className="text-4xl font-bold tracking-tight text-primary">
                {weeklyCount}
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary-tint bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="p-0">
              <CardDescription className="text-sm font-medium">
                {t('home.stats.totalEntries')}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-2 p-0">
              <p className="text-4xl font-bold tracking-tight text-primary">
                {reportedDays}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {areaCards.map((areaCard) => {
          const Icon = areaCard.icon;

          return (
            <Link
              key={areaCard.to}
              to={areaCard.to}
              draggable={false}
              onDragStart={(event) => {
                event.preventDefault();
              }}
              className="block"
            >
              <Card className="group relative overflow-hidden border-primary-tint bg-white p-6 transition-all hover:border-primary hover:shadow-md active:scale-[0.98]">
                <div className="absolute top-0 right-0 p-4 opacity-5 transition-transform group-hover:scale-110">
                  <Icon className="size-20" />
                </div>
                <div className="relative flex flex-col space-y-2">
                  <div className="flex items-center gap-3 text-primary-shade transition-colors group-hover:text-primary">
                    <Icon className="size-5" />
                    <CardTitle className="text-lg font-semibold text-text-color tracking-tight">
                      {t(areaCard.titleKey)}
                    </CardTitle>
                  </div>
                  <p className="text-sm leading-relaxed text-text-color/70">
                    {t(areaCard.descriptionKey)}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
