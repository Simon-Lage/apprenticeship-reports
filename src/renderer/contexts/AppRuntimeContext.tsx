import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from 'react';

import { useAppBootstrap } from '@/renderer/hooks/useAppBootstrap';
import { AppApi } from '@/shared/ipc/app-api';

type AppRuntimeContextValue = {
  api: AppApi | null;
  isBridgeAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  state: ReturnType<typeof useAppBootstrap>['state'];
};

const AppRuntimeContext = createContext<AppRuntimeContextValue | null>(null);

export function AppRuntimeProvider({ children }: PropsWithChildren) {
  const bootstrap = useAppBootstrap();
  const api = window.electron?.app ?? null;
  const value = useMemo<AppRuntimeContextValue>(
    () => ({
      api,
      isBridgeAvailable: Boolean(api),
      isLoading: bootstrap.isLoading,
      error: bootstrap.error,
      refresh: bootstrap.refresh,
      state: bootstrap.state,
    }),
    [api, bootstrap.error, bootstrap.isLoading, bootstrap.refresh, bootstrap.state],
  );

  return (
    <AppRuntimeContext.Provider value={value}>
      {children}
    </AppRuntimeContext.Provider>
  );
}

export function useAppRuntime(): AppRuntimeContextValue {
  const context = useContext(AppRuntimeContext);

  if (!context) {
    throw new Error('AppRuntimeContext is not available.');
  }

  return context;
}
