import { lazy } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import DefaultLayout from './layouts/DefaultLayout';
import WelcomeLayout from './layouts/WelcomeLayout';
import InitializationGuard from './components/InitializationGuard';
import RouteGuard from './components/RouteGuard';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const SetupPasswordPage = lazy(() => import('./pages/SetupPasswordPage'));
const SetupGooglePage = lazy(() => import('./pages/SetupGooglePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

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
      { path: '/', element: <Navigate to="/dashboard" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
];

export default routes;
