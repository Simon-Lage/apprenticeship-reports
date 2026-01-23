import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AuthMethod,
  AuthSession,
  AuthStatus,
  AuthUser,
} from '../../shared/authTypes';
import { authService } from '../lib/authService';

type AuthContextValue = {
  authenticated: boolean;
  user: AuthUser | null;
  method: AuthMethod | null;
  status: AuthStatus | null;
  refreshStatus: () => Promise<void>;
  init: (password: string) => Promise<void>;
  loginWithPassword: (password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  linkGoogle: () => Promise<void>;
  unlinkGoogle: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  changeGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  reset: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [method, setMethod] = useState<AuthMethod | null>(null);
  const [status, setStatus] = useState<AuthStatus | null>(null);

  const setSession = (session: AuthSession) => {
    setUser(session.user);
    setMethod(session.method);
  };

  const refreshStatus = useCallback(async () => {
    const nextStatus = await authService.getStatus();
    setStatus(nextStatus);
  }, []);

  const init = useCallback(
    async (password: string) => {
      const session = await authService.init(password);
      setSession(session);
      await refreshStatus();
    },
    [refreshStatus],
  );

  const loginWithPassword = useCallback(
    async (password: string) => {
      const session = await authService.loginWithPassword(password);
      setSession(session);
      await refreshStatus();
    },
    [refreshStatus],
  );

  const loginWithGoogle = useCallback(async () => {
    const session = await authService.loginWithGoogle();
    setSession(session);
    await refreshStatus();
  }, [refreshStatus]);

  const linkGoogle = useCallback(async () => {
    await authService.linkGoogle();
    await refreshStatus();
  }, [refreshStatus]);

  const unlinkGoogle = useCallback(async () => {
    await authService.unlinkGoogle();
    await refreshStatus();
  }, [refreshStatus]);

  const changePassword = useCallback(
    async (password: string) => {
      await authService.changePassword(password);
      await refreshStatus();
    },
    [refreshStatus],
  );

  const changeGoogle = useCallback(async () => {
    await authService.changeGoogle();
    await refreshStatus();
  }, [refreshStatus]);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setMethod(null);
  }, []);

  const reset = useCallback(
    async (password: string) => {
      await authService.reset(password);
      setUser(null);
      setMethod(null);
      await refreshStatus();
    },
    [refreshStatus],
  );

  useEffect(() => {
    const restoreSession = async () => {
      await refreshStatus();
    };

    restoreSession().catch(() => undefined);
  }, [refreshStatus]);

  const value = useMemo(
    () => ({
      authenticated: !!method,
      user,
      method,
      status,
      refreshStatus,
      init,
      loginWithPassword,
      loginWithGoogle,
      linkGoogle,
      unlinkGoogle,
      changePassword,
      changeGoogle,
      logout,
      reset,
    }),
    [
      user,
      method,
      status,
      refreshStatus,
      init,
      loginWithPassword,
      loginWithGoogle,
      linkGoogle,
      unlinkGoogle,
      changePassword,
      changeGoogle,
      logout,
      reset,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
