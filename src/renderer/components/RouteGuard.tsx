import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type RouteGuardProps = {
  requireAuth: boolean;
  redirectTo: string;
};

export default function RouteGuard({
  requireAuth,
  redirectTo,
}: RouteGuardProps) {
  const { authenticated } = useAuth();

  if (!requireAuth && authenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
