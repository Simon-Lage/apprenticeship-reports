import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/renderer/components/app/PageHeader';
import { SectionCard } from '@/renderer/components/app/SectionCard';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { appRoutes } from '@/renderer/lib/app-routes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('home.title')}
        description={t('home.description')}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title={t('home.stats.dailyReports')} className="border-primary-tint bg-white">
          <p className="text-3xl font-semibold text-primary">
            {runtime.state.reports.dailyReportCount}
          </p>
        </SectionCard>
        <SectionCard title={t('home.stats.weeklyReports')} className="border-primary-tint bg-white">
          <p className="text-3xl font-semibold text-primary">
            {runtime.state.reports.weeklyReportCount}
          </p>
        </SectionCard>
        <SectionCard title={t('home.stats.backupStatus')} className="border-primary-tint bg-white">
          <Badge className="bg-primary-tint text-text-color">
            {runtime.state.backup.isBackupRequired
              ? t('home.backup.required')
              : t('home.backup.upToDate')}
          </Badge>
        </SectionCard>
      </div>
      <SectionCard
        title={t('home.quickActions.title')}
        description={t('home.quickActions.description')}
        className="border-primary-tint bg-white"
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-primary text-primary-contrast hover:bg-primary-shade">
            <Link to={appRoutes.dailyReport}>{t('home.quickActions.newDaily')}</Link>
          </Button>
          <Button asChild variant="outline" className="border-primary-tint">
            <Link to={appRoutes.weeklyReport}>{t('home.quickActions.weekly')}</Link>
          </Button>
          <Button asChild variant="outline" className="border-primary-tint">
            <Link to={appRoutes.import}>{t('home.quickActions.import')}</Link>
          </Button>
          <Button asChild variant="outline" className="border-primary-tint">
            <Link to={appRoutes.export}>{t('home.quickActions.export')}</Link>
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
