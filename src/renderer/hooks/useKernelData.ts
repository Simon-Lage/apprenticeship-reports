import { useCallback, useEffect, useState } from 'react';

import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { ReportsState } from '@/shared/reports/models';
import { SettingsSnapshot } from '@/shared/settings/schema';

type DataState<T> = {
  value: T | null;
  isLoading: boolean;
  error: string | null;
};

function createInitialDataState<T>(): DataState<T> {
  return {
    value: null,
    isLoading: false,
    error: null,
  };
}

function shouldRefreshRuntimeAfterDataError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Onboarding ist unvollstaendig')
  );
}

export function useSettingsSnapshot(enabled = true) {
  const runtime = useAppRuntime();
  const { api, refresh: refreshRuntime } = runtime;
  const [state, setState] = useState<DataState<SettingsSnapshot>>(
    createInitialDataState,
  );

  const refresh = useCallback(async () => {
    if (!enabled || !api) {
      return;
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const nextValue = await api.getSettingsSnapshot();
      setState({
        value: nextValue,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (shouldRefreshRuntimeAfterDataError(error)) {
        await refreshRuntime();
      }

      setState({
        value: null,
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Unknown settings error.',
      });
    }
  }, [api, enabled, refreshRuntime]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}

export function useReportsState(enabled = true) {
  const runtime = useAppRuntime();
  const { api, refresh: refreshRuntime } = runtime;
  const [state, setState] = useState<DataState<ReportsState>>(
    createInitialDataState,
  );

  const refresh = useCallback(async () => {
    if (!enabled || !api) {
      return;
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const nextValue = await api.getReportsState();
      setState({
        value: nextValue,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (shouldRefreshRuntimeAfterDataError(error)) {
        await refreshRuntime();
      }

      setState({
        value: null,
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Unknown reports error.',
      });
    }
  }, [api, enabled, refreshRuntime]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}
