import { lazy, type ComponentType } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import DefaultLayout from './layouts/DefaultLayout';
import WelcomeLayout from './layouts/WelcomeLayout';
import InitializationGuard from './components/InitializationGuard';
import RouteGuard from './components/RouteGuard';

const lazyPage = (loader: () => Promise<{ default: unknown }>) =>
  lazy(() =>
    loader().then((module) => ({ default: module.default as ComponentType })),
  );

const LoginPage = lazyPage(() => import('./pages/LoginPage'));
const WelcomePage = lazyPage(() => import('./pages/WelcomePage'));
const SetupPasswordPage = lazyPage(() => import('./pages/SetupPasswordPage'));
const SetupGooglePage = lazyPage(() => import('./pages/SetupGooglePage'));
const DashboardPage = lazyPage(() => import('./pages/DashboardPage'));
const OnboardingPage = lazyPage(() => import('./pages/OnboardingPage'));
const ForgotPasswordPage = lazyPage(() => import('./pages/ForgotPasswordPage'));
const HomePage = lazyPage(() => import('./pages/HomePage'));
const DailyReportPage = lazyPage(() => import('./pages/DailyReportPage'));
const WeeklyReportPage = lazyPage(() => import('./pages/WeeklyReportPage'));
const ReportsOverviewPage = lazyPage(
  () => import('./pages/ReportsOverviewPage'),
);
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'));
const TimeTablePage = lazyPage(() => import('./pages/TimeTablePage'));
const ImportDataPage = lazyPage(() => import('./pages/ImportDataPage'));
const ExportDataPage = lazyPage(() => import('./pages/ExportDataPage'));

const routes: RouteObject[] = [
  {
    element: (
      <InitializationGuard requireInitialized={false}>
        <WelcomeLayout />
      </InitializationGuard>
    ),
    children: [
      { path: 'welcome', element: <WelcomePage /> },
      { path: 'welcome/setup-password', element: <SetupPasswordPage /> },
      { path: 'welcome/setup-google', element: <SetupGooglePage /> },
      { path: 'welcome/onboarding', element: <OnboardingPage /> },
    ],
  },
  {
    element: (
      <InitializationGuard requireInitialized>
        <RouteGuard requireAuth={false} redirectTo="/dashboard">
          <AuthLayout />
        </RouteGuard>
      </InitializationGuard>
    ),
    children: [
      { path: 'auth/login', element: <LoginPage /> },
      { path: 'auth/forgot-password', element: <ForgotPasswordPage /> },
      { path: 'auth', element: <Navigate to="/auth/login" replace /> },
    ],
  },
  {
    element: (
      <InitializationGuard requireInitialized>
        <RouteGuard requireAuth redirectTo="/auth/login">
          <DefaultLayout />
        </RouteGuard>
      </InitializationGuard>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'home', element: <HomePage /> },
      { path: 'reports', element: <ReportsOverviewPage /> },
      { path: 'reports/daily', element: <DailyReportPage /> },
      { path: 'reports/weekly', element: <WeeklyReportPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'timetable', element: <TimeTablePage /> },
      { path: 'import', element: <ImportDataPage /> },
      { path: 'export', element: <ExportDataPage /> },
      { path: '/', element: <Navigate to="/dashboard" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
];

export default routes;
