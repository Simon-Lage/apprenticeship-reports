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
  const totalCount = dailyCount + weeklyCount;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="border-primary-tint bg-white py-5">
          <CardHeader>
            <CardDescription className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-shade">
              {t('home.hero.kicker')}
            </CardDescription>
            <CardTitle className="text-3xl text-text-color">
              {t('home.hero.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-color/80">
              {t('home.hero.description')}
            </p>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Card className="border-primary-tint bg-white py-5">
            <CardHeader>
              <CardDescription>{t('home.stats.dailyReports')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-primary">
                {dailyCount}
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary-tint bg-white py-5">
            <CardHeader>
              <CardDescription>{t('home.stats.weeklyReports')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-primary">
                {weeklyCount}
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary-tint bg-white py-5">
            <CardHeader>
              <CardDescription>{t('home.stats.totalEntries')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-primary">
                {totalCount}
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
              <Card className="group border-primary-tint bg-white py-5 transition-colors hover:border-primary hover:bg-primary">
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2 text-primary-shade transition-colors group-hover:text-primary-contrast">
                    <Icon className="size-4" />
                    <CardTitle className="text-lg text-text-color transition-colors group-hover:text-primary-contrast">
                      {t(areaCard.titleKey)}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-color/75 transition-colors group-hover:text-primary-contrast/90">
                    {t(areaCard.descriptionKey)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
