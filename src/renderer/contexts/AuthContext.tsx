import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { authService, Credentials } from '../lib/authService';

type AuthContextValue = {
  authenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);

  const login = useCallback(
    async (credentials: Credentials) => {
      await authService.login(credentials);
      setAuthenticated(true);
    },
    [],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({
      authenticated,
      login,
      logout,
    }),
    [authenticated, login, logout],
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
