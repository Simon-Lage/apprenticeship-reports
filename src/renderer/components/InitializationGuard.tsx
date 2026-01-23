import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type InitializationGuardProps = {
  requireInitialized: boolean;
  children: ReactNode;
};

export default function InitializationGuard({
  requireInitialized,
  children,
}: InitializationGuardProps) {
  const { status, authenticated } = useAuth();

  if (!status) {
    return null;
  }

  if (!requireInitialized) {
    if (status.hasPassword && !authenticated) {
      return <Navigate to="/auth/login" replace />;
    }
    return <>{children}</>;
  }

  if (!status.hasPassword) {
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
}
