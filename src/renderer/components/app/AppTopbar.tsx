import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  FiCalendar,
  FiFileText,
  FiGrid,
  FiHome,
  FiList,
  FiLogOut,
  FiSlash,
  FiSettings,
  FiShield,
  FiUpload,
  FiDownload,
} from 'react-icons/fi';
import { IconType } from 'react-icons';

import { appRoutes } from '@/renderer/lib/app-routes';
import { cn } from '@/renderer/lib/utils';
import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { useToastController } from '@/renderer/contexts/ToastControllerContext';
import WindowModeToggleButton from '@/renderer/components/app/WindowModeToggleButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
    path: appRoutes.weeklyReport,
    labelKey: 'navigation.weeklyReport',
    icon: FiCalendar,
  },
  {
    path: appRoutes.reportsOverview,
    labelKey: 'navigation.reportsOverview',
    icon: FiList,
  },
  {
    path: appRoutes.absences,
    labelKey: 'navigation.absences',
    icon: FiSlash,
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
  const runtime = useAppRuntime();
  const toast = useToastController();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLogoutPending, setIsLogoutPending] = useState(false);

  async function handleSignOut() {
    if (!runtime.api) {
      return;
    }

    setIsLogoutPending(true);
    try {
      await runtime.api.signOut();
      await runtime.refresh();
      setIsLogoutOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.errors.unknown');
      toast.error(t('navigation.logoutError'), message);
    } finally {
      setIsLogoutPending(false);
    }
  }

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
        <div className="flex items-center gap-1">
          <WindowModeToggleButton className="shrink-0 text-text-color/80 hover:bg-primary-tint/35 hover:text-text-color" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0 text-text-color/80 hover:bg-primary-tint/35 hover:text-text-color"
                onClick={() => {
                  setIsLogoutOpen(true);
                }}
              >
                <FiLogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              {t('navigation.logout')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('navigation.logoutConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('navigation.logoutConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLogoutPending}>
              {t('common.no')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isLogoutPending}
              className="bg-primary text-primary-contrast hover:bg-primary-shade"
              onClick={(event) => {
                event.preventDefault();
                handleSignOut();
              }}
            >
              {isLogoutPending ? t('common.loading') : t('common.yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.nav>
  );
}
