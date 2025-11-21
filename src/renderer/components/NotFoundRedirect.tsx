import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NotFoundRedirect() {
  const { authenticated } = useAuth();
  return <Navigate to={authenticated ? '/dashboard' : '/auth/login'} replace />;
}
