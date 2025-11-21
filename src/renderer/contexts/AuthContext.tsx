import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type AuthContextValue = {
  authenticated: boolean;
  setAuthenticated: (auth: boolean) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);

  const value = useMemo(
    () => ({
      authenticated,
      setAuthenticated,
    }),
    [authenticated],
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
