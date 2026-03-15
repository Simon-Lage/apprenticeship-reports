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

export function useSettingsSnapshot(enabled = true) {
  const runtime = useAppRuntime();
  const [state, setState] = useState<DataState<SettingsSnapshot>>(
    createInitialDataState,
  );

  const refresh = useCallback(async () => {
    if (!enabled || !runtime.api) {
      return;
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const nextValue = await runtime.api.getSettingsSnapshot();
      setState({
        value: nextValue,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({
        value: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown settings error.',
      });
    }
  }, [enabled, runtime.api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}

export function useReportsState(enabled = true) {
  const runtime = useAppRuntime();
  const [state, setState] = useState<DataState<ReportsState>>(
    createInitialDataState,
  );

  const refresh = useCallback(async () => {
    if (!enabled || !runtime.api) {
      return;
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const nextValue = await runtime.api.getReportsState();
      setState({
        value: nextValue,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({
        value: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown reports error.',
      });
    }
  }, [enabled, runtime.api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}
