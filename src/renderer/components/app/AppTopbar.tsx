import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiFileText,
  FiGrid,
  FiHome,
  FiList,
  FiSlash,
  FiSettings,
  FiShield,
  FiUpload,
  FiDownload,
} from 'react-icons/fi';
import { IconType } from 'react-icons';

import { appRoutes } from '@/renderer/lib/app-routes';
import { cn } from '@/renderer/lib/utils';
import logoVerySmall from '../../../../assets/apprenticeship-reports-logo-very-small.png';

type NavItem = {
  path: string;
  labelKey: string;
  icon: IconType;
};

const navItems: NavItem[] = [
  { path: appRoutes.home, labelKey: 'navigation.home', icon: FiHome },
  {
    path: appRoutes.dailyReport,
    labelKey: 'navigation.dailyReport',
    icon: FiFileText,
  },
  {
    path: appRoutes.absences,
    labelKey: 'navigation.absences',
    icon: FiSlash,
  },
  {
    path: appRoutes.weeklyReport,
    labelKey: 'navigation.weeklyReport',
    icon: FiCalendar,
  },
  {
    path: appRoutes.reportsOverview,
    labelKey: 'navigation.reportsOverview',
    icon: FiList,
  },
  { path: appRoutes.timeTable, labelKey: 'navigation.timeTable', icon: FiGrid },
  { path: appRoutes.import, labelKey: 'navigation.import', icon: FiDownload },
  { path: appRoutes.export, labelKey: 'navigation.export', icon: FiUpload },
  {
    path: appRoutes.settings,
    labelKey: 'navigation.settings',
    icon: FiSettings,
  },
  {
    path: appRoutes.changeAuthMethods,
    labelKey: 'navigation.changeAuthMethods',
    icon: FiShield,
  },
];

export default function AppTopbar() {
  const { t } = useTranslation();
  const location = useLocation();

  function isActivePath(path: string): boolean {
    if (path === appRoutes.home) {
      return location.pathname === appRoutes.home;
    }

    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  }

  return (
    <motion.nav
      initial={{ y: -14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      className="sticky top-0 z-40 w-full border-b border-primary-tint/60 bg-white/92 shadow-sm backdrop-blur-md"
    >
      <div className="flex w-full items-center gap-3 px-4 py-2.5 lg:px-6">
        <div className="flex shrink-0 items-center gap-2 select-none">
          <img
            src={logoVerySmall}
            alt=""
            className="size-4 shrink-0"
            draggable={false}
          />
          <span className="text-sm font-semibold tracking-tight text-text-color">
            {t('navigation.brand')}
          </span>
        </div>
        <div className="app-no-scrollbar min-w-0 flex-1 overflow-x-auto">
          <ul className="flex min-w-max items-center justify-center gap-1">
            {navItems.map((item) => {
              const isActive = isActivePath(item.path);
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    draggable={false}
                    onDragStart={(event) => {
                      event.preventDefault();
                    }}
                    className={cn(
                      'relative inline-flex items-center rounded-md px-2.5 py-2 text-sm font-medium transition-colors lg:px-3',
                      isActive
                        ? 'text-primary-contrast'
                        : 'text-text-color/80 hover:bg-primary-tint/35 hover:text-text-color',
                    )}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="topbar-active-link"
                        className="absolute inset-0 rounded-md bg-primary"
                        transition={{
                          type: 'spring',
                          stiffness: 360,
                          damping: 32,
                        }}
                      />
                    ) : null}
                    <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                      <Icon className="size-4 shrink-0" />
                      {t(item.labelKey)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </motion.nav>
  );
}
