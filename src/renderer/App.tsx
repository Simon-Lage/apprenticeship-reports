import { Navigate, Route, Routes, HashRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AppStateView } from '@/renderer/components/app/AppStateView';
import { AppTopbar } from '@/renderer/components/app/AppTopbar';
import { AppRuntimeProvider, useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { ToastControllerProvider } from '@/renderer/contexts/ToastControllerContext';
import { AuthLayout } from '@/renderer/layouts/AuthLayout';
import { DefaultLayout } from '@/renderer/layouts/DefaultLayout';
import { appRoutes } from '@/renderer/lib/app-routes';
import ChangeAuthMethodsPage from '@/renderer/pages/ChangeAuthMethodsPage';
import DailyReportPage from '@/renderer/pages/DailyReportPage';
import ExportPage from '@/renderer/pages/ExportPage';
import HomePage from '@/renderer/pages/HomePage';
import ImportPage from '@/renderer/pages/ImportPage';
import LoginPage from '@/renderer/pages/LoginPage';
import OnboardingPage from '@/renderer/pages/OnboardingPage';
import ReportsOverviewPage from '@/renderer/pages/ReportsOverviewPage';
import SettingsPage from '@/renderer/pages/SettingsPage';
import TimeTablePage from '@/renderer/pages/TimeTablePage';
import WeeklyReportPage from '@/renderer/pages/WeeklyReportPage';
import WeeklyReportPDFPage from '@/renderer/pages/WeeklyReportPDFPage';
import '@/renderer/i18n';
import './globals.css';
import './App.css';

function AuthenticatedAppRoutes() {
  return (
    <Routes>
      <Route path={appRoutes.home} element={<HomePage />} />
      <Route path={appRoutes.dailyReport} element={<DailyReportPage />} />
      <Route path={appRoutes.weeklyReport} element={<WeeklyReportPage />} />
      <Route path={appRoutes.weeklyReportPdf} element={<WeeklyReportPDFPage />} />
      <Route path={appRoutes.reportsOverview} element={<ReportsOverviewPage />} />
      <Route path={appRoutes.timeTable} element={<TimeTablePage />} />
      <Route path={appRoutes.import} element={<ImportPage />} />
      <Route path={appRoutes.export} element={<ExportPage />} />
      <Route path={appRoutes.settings} element={<SettingsPage />} />
      <Route path={appRoutes.changeAuthMethods} element={<ChangeAuthMethodsPage />} />
      <Route path={appRoutes.login} element={<Navigate to={appRoutes.home} replace />} />
      <Route path={appRoutes.onboarding} element={<Navigate to={appRoutes.home} replace />} />
      <Route path="*" element={<Navigate to={appRoutes.home} replace />} />
    </Routes>
  );
}

function RuntimeRouter() {
  const { t } = useTranslation();
  const runtime = useAppRuntime();

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
          void runtime.refresh();
        }}
      />
    );
  }

  const needsPasswordSetup = !runtime.state.auth.passwordConfigured;
  const needsLogin = runtime.state.auth.passwordConfigured && !runtime.state.auth.isAuthenticated;
  const needsOnboarding =
    runtime.state.auth.passwordConfigured &&
    runtime.state.auth.isAuthenticated &&
    !runtime.state.onboarding.isComplete;

  if (needsPasswordSetup) {
    return (
      <AuthLayout>
        <OnboardingPage />
      </AuthLayout>
    );
  }

  if (needsLogin) {
    return (
      <AuthLayout>
        <LoginPage />
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

  return (
    <DefaultLayout>
      <AppTopbar authenticatedEmail={runtime.state.drive.connectedAccountEmail} />
      <AuthenticatedAppRoutes />
    </DefaultLayout>
  );
}

export default function App() {
  return (
    <ToastControllerProvider>
      <AppRuntimeProvider>
        <HashRouter>
          <RuntimeRouter />
        </HashRouter>
      </AppRuntimeProvider>
    </ToastControllerProvider>
  );
}
