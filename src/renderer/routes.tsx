import { lazy, Suspense } from 'react';
import { Navigate, Outlet, RouteObject, useRoutes } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import DefaultLayout from './layouts/DefaultLayout';
import RouteGuard from './components/RouteGuard';
import { AuthProvider } from './contexts/AuthContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

const routes: RouteObject[] = [
  {
    element: (
      <RouteGuard requireAuth={false} redirectTo="/dashboard">
        <AuthLayout />
      </RouteGuard>
    ),
    children: [
      { path: 'auth/login', element: <LoginPage /> },
      { path: 'auth/welcome', element: <WelcomePage /> },
      { path: 'auth', element: <Navigate to="/auth/login" replace /> },
    ],
  },
  {
    element: (
      <RouteGuard requireAuth redirectTo="/auth/login">
        <DefaultLayout />
      </RouteGuard>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: '/', element: <Navigate to="/dashboard" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
];

export default routes;
