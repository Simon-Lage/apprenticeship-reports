import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RouteGuardProps {
  requireAuth?: boolean;
  redirectTo?: string;
  children?: ReactNode;
}

function RouteGuard({
  children,
  requireAuth = false,
  redirectTo = '/',
}: RouteGuardProps) {
  const { authenticated } = useAuth();

  if (requireAuth && !authenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!requireAuth && authenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ?? null;
}

RouteGuard.defaultProps = {
  requireAuth: false,
  redirectTo: '/',
  children: undefined,
};

export default RouteGuard;
