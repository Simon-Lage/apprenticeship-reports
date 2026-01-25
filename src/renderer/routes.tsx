import { lazy, type ComponentType } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout.js';
import DefaultLayout from './layouts/DefaultLayout.js';
import WelcomeLayout from './layouts/WelcomeLayout.js';
import InitializationGuard from './components/InitializationGuard.js';
import RouteGuard from './components/RouteGuard.js';

const lazyPage = (loader: () => Promise<{ default: unknown }>) =>
  lazy(() => loader().then((module) => ({ default: module.default as ComponentType })));

const LoginPage = lazyPage(() => import('./pages/LoginPage/index.js'));
const WelcomePage = lazyPage(() => import('./pages/WelcomePage/index.js'));
const SetupPasswordPage = lazyPage(() => import('./pages/SetupPasswordPage/index.js'));
const SetupGooglePage = lazyPage(() => import('./pages/SetupGooglePage/index.js'));
const DashboardPage = lazyPage(() => import('./pages/DashboardPage/index.js'));
const OnboardingPage = lazyPage(() => import('./pages/OnboardingPage/index.js'));
const ForgotPasswordPage = lazyPage(() => import('./pages/ForgotPasswordPage/index.js'));
const HomePage = lazyPage(() => import('./pages/HomePage/index.js'));
const DailyReportPage = lazyPage(() => import('./pages/DailyReportPage/index.js'));
const WeeklyReportPage = lazyPage(() => import('./pages/WeeklyReportPage/index.js'));
const ReportsOverviewPage = lazyPage(() => import('./pages/ReportsOverviewPage/index.js'));
const SettingsPage = lazyPage(() => import('./pages/SettingsPage/index.js'));
const TimeTablePage = lazyPage(() => import('./pages/TimeTablePage/index.js'));
const ImportDataPage = lazyPage(() => import('./pages/ImportDataPage/index.js'));
const ExportDataPage = lazyPage(() => import('./pages/ExportDataPage/index.js'));

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
