import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useAuthActions() {
  const { setAuthenticated } = useAuth();

  const login = useCallback(() => {
    setAuthenticated(true);
  }, [setAuthenticated]);

  const logout = useCallback(() => {
    setAuthenticated(false);
  }, [setAuthenticated]);

  return { login, logout };
}
