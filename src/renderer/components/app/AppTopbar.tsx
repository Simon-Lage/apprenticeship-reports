import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { appRoutes } from '@/renderer/lib/app-routes';
import { cn } from '@/renderer/lib/utils';

type AppTopbarProps = {
  authenticatedEmail: string | null;
};

type NavItem = {
  path: string;
  labelKey: string;
};

const navItems: NavItem[] = [
  { path: appRoutes.home, labelKey: 'navigation.home' },
  { path: appRoutes.dailyReport, labelKey: 'navigation.dailyReport' },
  { path: appRoutes.weeklyReport, labelKey: 'navigation.weeklyReport' },
  { path: appRoutes.reportsOverview, labelKey: 'navigation.reportsOverview' },
  { path: appRoutes.timeTable, labelKey: 'navigation.timeTable' },
  { path: appRoutes.import, labelKey: 'navigation.import' },
  { path: appRoutes.export, labelKey: 'navigation.export' },
  { path: appRoutes.settings, labelKey: 'navigation.settings' },
  { path: appRoutes.changeAuthMethods, labelKey: 'navigation.changeAuthMethods' },
];

export function AppTopbar({ authenticatedEmail }: AppTopbarProps) {
  const { t } = useTranslation();

  return (
    <nav className="sticky top-4 z-40 mb-6 rounded-xl border border-primary-tint bg-white/90 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-text-color">{t('navigation.title')}</p>
        <Badge className="bg-primary-shade text-primary-contrast">
          {authenticatedEmail ?? t('navigation.localSession')}
        </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'rounded-md border border-primary-tint px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-contrast'
                  : 'bg-primary-tint/40 text-text-color hover:bg-primary-tint',
              )
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
