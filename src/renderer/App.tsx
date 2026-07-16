import {
  Navigate,
  Route,
  Routes,
  RouterProvider,
  createHashRouter,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';

import { AppStateView } from '@/renderer/components/app/AppStateView';
import AppTopbar from '@/renderer/components/app/AppTopbar';
import GlobalProductionErrorBoundary from '@/renderer/components/app/GlobalProductionErrorBoundary';
import {
  AppRuntimeProvider,
  useAppRuntime,
} from '@/renderer/contexts/AppRuntimeContext';
import { ToastControllerProvider } from '@/renderer/contexts/ToastControllerContext';
import AuthLayout from '@/renderer/layouts/AuthLayout';
import DefaultLayout from '@/renderer/layouts/DefaultLayout';
import { appRoutes } from '@/renderer/lib/app-routes';
import { isGoogleAuthorizationCanceled } from '@/renderer/lib/google-auth';
import ChangeAuthMethodsPage from '@/renderer/pages/ChangeAuthMethodsPage';
import AbsenceSyncPrompt from '@/renderer/components/app/AbsenceSyncPrompt';
import AbsencesPage from '@/renderer/pages/AbsencesPage';
import DailyReportPage from '@/renderer/pages/DailyReportPage';
import ExportPage from '@/renderer/pages/ExportPage';
import HomePage from '@/renderer/pages/HomePage';
import ImportPage from '@/renderer/pages/ImportPage';
import LoginPage from '@/renderer/pages/LoginPage';
import OnboardingPage from '@/renderer/pages/OnboardingPage';
import ReportsOverviewPage from '@/renderer/pages/ReportsOverviewPage';
import SettingsPage from '@/renderer/pages/SettingsPage';
import TimeTablePage from '@/renderer/pages/TimeTablePage';
import WelcomePage from '@/renderer/pages/WelcomePage';
import WeeklyReportPage from '@/renderer/pages/WeeklyReportPage';
import WeeklyReportPDFPage from '@/renderer/pages/WeeklyReportPDFPage';
import SendWeeklyReportPage from '@/renderer/pages/SendWeeklyReportPage';
import { hasSeenOnboardingWelcome } from '@/renderer/lib/onboarding-welcome';
import { Button } from '@/components/ui/button';
import AppFooter from '@/renderer/components/app/AppFooter';
import TimeTableUpdatePrompt from '@/renderer/components/app/TimeTableUpdatePrompt';
import ReleaseNotesDialog from '@/renderer/components/app/ReleaseNotesDialog';
import '@/renderer/i18n';
import './globals.css';
import './App.css';

function AuthenticatedAppRoutes() {
  return (
    <Routes>
      <Route path={appRoutes.home} element={<HomePage />} />
      <Route path={appRoutes.dailyReport} element={<DailyReportPage />} />
      <Route path={appRoutes.absences} element={<AbsencesPage />} />
      <Route path={appRoutes.weeklyReport} element={<WeeklyReportPage />} />
      <Route
        path={appRoutes.sendWeeklyReport}
        element={<SendWeeklyReportPage />}
      />
      <Route
        path={appRoutes.weeklyReportPdf}
        element={<WeeklyReportPDFPage />}
      />
      <Route
        path={appRoutes.reportsOverview}
        element={<ReportsOverviewPage />}
      />
      <Route path={appRoutes.timeTable} element={<TimeTablePage />} />
      <Route path={appRoutes.import} element={<ImportPage />} />
      <Route path={appRoutes.export} element={<ExportPage />} />
      <Route path={appRoutes.settings} element={<SettingsPage />} />
      <Route
        path={appRoutes.changeAuthMethods}
        element={<ChangeAuthMethodsPage />}
      />
      <Route
        path={appRoutes.welcome}
        element={<Navigate to={appRoutes.home} replace />}
      />
      <Route
        path={appRoutes.login}
        element={<Navigate to={appRoutes.home} replace />}
      />
      <Route
        path={appRoutes.onboarding}
        element={<Navigate to={appRoutes.home} replace />}
      />
      <Route path="*" element={<Navigate to={appRoutes.home} replace />} />
    </Routes>
  );
}

function PasswordSetupRoutes() {
  const defaultRoute = hasSeenOnboardingWelcome()
    ? appRoutes.onboarding
    : appRoutes.welcome;

  return (
    <Routes>
      <Route path={appRoutes.welcome} element={<WelcomePage />} />
      <Route path={appRoutes.onboarding} element={<OnboardingPage />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}

function RuntimeRouter() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const [isDrivePromptPending, setIsDrivePromptPending] = useState(false);
  const [isGoogleRemovePending, setIsGoogleRemovePending] = useState(false);
  const [drivePromptError, setDrivePromptError] = useState<string | null>(null);
  const [driveAuthorizationUrl, setDriveAuthorizationUrl] = useState<
    string | null
  >(null);
  const [autoDrivePrompted, setAutoDrivePrompted] = useState(false);
  const hasLinkedGoogleAccount = Boolean(
    runtime.state.drive.connectedAccountEmail,
  );
  const needsPasswordSetup = !runtime.state.auth.passwordConfigured;
  const needsLogin =
    runtime.state.auth.passwordConfigured &&
    !runtime.state.auth.isAuthenticated;
  const needsOnboarding =
    runtime.state.auth.passwordConfigured &&
    runtime.state.auth.isAuthenticated &&
    !runtime.state.onboarding.isComplete;
  const needsDrivePermissions =
    runtime.state.auth.passwordConfigured &&
    runtime.state.auth.isAuthenticated &&
    hasLinkedGoogleAccount &&
    runtime.state.drive.status === 'missing';
  const canPromptDrivePermissions =
    runtime.state.auth.googleAuthConfigured && hasLinkedGoogleAccount;

  const connectDrivePermissions = useCallback(async () => {
    if (
      !runtime.api ||
      !runtime.state.auth.googleAuthConfigured ||
      !hasLinkedGoogleAccount
    ) {
      return;
    }

    if (isDrivePromptPending) {
      return;
    }

    setIsDrivePromptPending(true);
    setDrivePromptError(null);
    setDriveAuthorizationUrl(null);

    try {
      await runtime.api.connectGoogleDrive();
      await runtime.refresh();
    } catch (error) {
      if (isGoogleAuthorizationCanceled(error)) {
        return;
      }

      setDrivePromptError(
        error instanceof Error ? error.message : t('common.errors.unknown'),
      );
    } finally {
      setIsDrivePromptPending(false);
    }
  }, [hasLinkedGoogleAccount, isDrivePromptPending, runtime, t]);

  const cancelDrivePermissions = useCallback(async () => {
    if (!runtime.api) {
      return;
    }

    await runtime.api.cancelPendingGoogleAuthorization();
    setIsDrivePromptPending(false);
    setDriveAuthorizationUrl(null);
  }, [runtime.api]);

  const removeGoogleAccount = useCallback(async () => {
    if (!runtime.api || isGoogleRemovePending) {
      return;
    }

    setIsGoogleRemovePending(true);
    setDrivePromptError(null);

    try {
      await runtime.api.clearGoogleSession();
      setDriveAuthorizationUrl(null);
      await runtime.refresh();
    } catch (error) {
      setDrivePromptError(
        error instanceof Error ? error.message : t('common.errors.unknown'),
      );
    } finally {
      setIsGoogleRemovePending(false);
    }
  }, [isGoogleRemovePending, runtime, t]);

  useEffect(() => {
    if (!needsDrivePermissions) {
      setAutoDrivePrompted(false);
      setDrivePromptError(null);
      return;
    }

    if (autoDrivePrompted || !canPromptDrivePermissions) {
      return;
    }

    setAutoDrivePrompted(true);
    connectDrivePermissions().catch(() => undefined);
  }, [
    autoDrivePrompted,
    canPromptDrivePermissions,
    connectDrivePermissions,
    needsDrivePermissions,
  ]);

  useEffect(() => {
    if (!isDrivePromptPending || !runtime.api) {
      setDriveAuthorizationUrl(null);
      return undefined;
    }

    let isActive = true;

    const refreshAuthorizationUrl = () => {
      runtime.api
        ?.getPendingGoogleAuthorizationUrl()
        .then((url) => {
          if (isActive) {
            setDriveAuthorizationUrl(url);
          }

          return undefined;
        })
        .catch(() => undefined);
    };
    const intervalId = window.setInterval(refreshAuthorizationUrl, 250);

    refreshAuthorizationUrl();

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [isDrivePromptPending, runtime.api]);

  if (!runtime.isBridgeAvailable) {
    return (
      <AppStateView
        title={t('appState.bridgeMissingTitle')}
        description={t('appState.bridgeMissingDescription')}
      />
    );
  }

  if (runtime.isLoading) {
    return (
      <AppStateView
        title={t('appState.loadingTitle')}
        description={t('appState.loadingDescription')}
        isLoading
      />
    );
  }

  if (runtime.error) {
    return (
      <AppStateView
        title={t('appState.errorTitle')}
        description={runtime.error}
        actionLabel={t('appState.retry')}
        onAction={() => {
          runtime.refresh().catch(() => undefined);
        }}
      />
    );
  }

  if (needsPasswordSetup) {
    return (
      <DefaultLayout>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center p-6">
            <PasswordSetupRoutes />
          </div>
        </main>
      </DefaultLayout>
    );
  }

  if (needsLogin) {
    return (
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    );
  }

  if (needsDrivePermissions) {
    return (
      <AuthLayout>
        <AppStateView
          title={t('appState.drivePermissionsTitle')}
          description={t('appState.drivePermissionsDescription')}
        >
          <p className="text-sm text-text-color/80">
            {runtime.state.drive.explanation ??
              t('appState.drivePermissionsFallbackDescription')}
          </p>
          {!canPromptDrivePermissions ? (
            <p className="text-sm text-destructive">
              {t('appState.drivePermissionsUnavailable')}
            </p>
          ) : null}
          {drivePromptError ? (
            <p className="text-sm text-destructive">{drivePromptError}</p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {canPromptDrivePermissions ? (
              <Button
                type="button"
                disabled={isDrivePromptPending}
                disabledReason={t('common.disabledReasons.pending')}
                onClick={() => {
                  connectDrivePermissions().catch(() => undefined);
                }}
              >
                {isDrivePromptPending
                  ? t('common.loading')
                  : t('appState.drivePermissionsAction')}
              </Button>
            ) : null}
            {hasLinkedGoogleAccount ? (
              <Button
                type="button"
                variant="outline"
                disabled={isGoogleRemovePending}
                disabledReason={t('common.disabledReasons.googlePending')}
                onClick={() => {
                  removeGoogleAccount().catch(() => undefined);
                }}
              >
                {isGoogleRemovePending
                  ? t('common.loading')
                  : t('appState.drivePermissionsRemoveGoogle')}
              </Button>
            ) : null}
          </div>
          <div>
            {driveAuthorizationUrl ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <a
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href={driveAuthorizationUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('appState.drivePermissionsManualLink')}
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    cancelDrivePermissions().catch(() => undefined);
                  }}
                >
                  {t('common.googleAuth.cancel')}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-text-color/70">
                {t('appState.drivePermissionsManualLinkHint')}
              </p>
            )}
          </div>
        </AppStateView>
      </AuthLayout>
    );
  }

  if (needsOnboarding) {
    return (
      <AuthLayout>
        <OnboardingPage />
      </AuthLayout>
    );
  }

  if (runtime.state.app.isLocked) {
    return (
      <AuthLayout>
        <AppStateView
          title={t('appState.appLockedTitle')}
          description={t('appState.appLockedDescription')}
          actionLabel={t('appState.retry')}
          onAction={() => {
            runtime.refresh().catch(() => undefined);
          }}
        >
          <ul className="list-disc space-y-1 pl-5 text-text-color/80">
            {(runtime.state.app.lockReasons ?? []).map((reason) => (
              <li key={reason}>{t(`appState.lockReasons.${reason}`)}</li>
            ))}
          </ul>
        </AppStateView>
      </AuthLayout>
    );
  }

  return (
    <DefaultLayout>
      <AppTopbar />
      <TimeTableUpdatePrompt />
      <ReleaseNotesDialog />
      <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <AuthenticatedAppRoutes />
      </main>
      <AppFooter />
    </DefaultLayout>
  );
}

const appRouter = createHashRouter([
  {
    path: '*',
    element: <RuntimeRouter />,
  },
]);

export default function App() {
  useEffect(() => {
    const preventDragDefault = (event: DragEvent) => {
      event.preventDefault();
    };
    const capture = true;

    window.addEventListener('dragstart', preventDragDefault, capture);
    window.addEventListener('dragover', preventDragDefault, capture);
    window.addEventListener('drop', preventDragDefault, capture);

    return () => {
      window.removeEventListener('dragstart', preventDragDefault, capture);
      window.removeEventListener('dragover', preventDragDefault, capture);
      window.removeEventListener('drop', preventDragDefault, capture);
    };
  }, []);

  const appContent = (
    <ToastControllerProvider>
      <AppRuntimeProvider>
        <AbsenceSyncPrompt />
        <RouterProvider router={appRouter} />
      </AppRuntimeProvider>
    </ToastControllerProvider>
  );

  if (process.env.NODE_ENV !== 'production') {
    return appContent;
  }

  return (
    <GlobalProductionErrorBoundary>{appContent}</GlobalProductionErrorBoundary>
  );
}
