import { startTransition, useEffect, useState } from 'react';

import { AppBootstrapState } from '@/shared/app/bootstrap';

function createFallbackBootstrapState(): AppBootstrapState {
  const now = new Date().toISOString();

  return {
    timestamp: now,
    auth: {
      status: 'signed-out',
      isAuthenticated: false,
      shouldPersist: false,
      provider: null,
      expiresAt: null,
      passwordConfigured: false,
    },
    drive: {
      status: 'not-configured',
      isLocked: false,
      requiresPrompt: false,
      isConnected: false,
      connectedAccountEmail: null,
      grantedScopes: [],
      missingScopes: [],
      requiredScopes: [],
      lastPromptedAt: null,
      explanation: null,
    },
    database: {
      isLocked: true,
      status: 'locked',
      reason: 'auth-required',
    },
    backup: {
      hasUnsavedChanges: false,
      isBackupRequired: false,
      lastSuccessfulBackupAt: null,
      pendingReasons: [],
      dailyReportsSinceLastBackup: 0,
      pendingImport: false,
      pendingImportCreatedAt: null,
      lastRecoverySnapshotPath: null,
      lastRestoredAt: null,
    },
    onboarding: {
      isConfigured: false,
      isComplete: false,
      nextStepId: null,
      remainingStepIds: [],
      skippedStepIds: [],
    },
    settings: {
      lastExportedAt: null,
      pendingImport: false,
      pendingImportDifferenceCount: 0,
    },
    reports: {
      weeklyHashCount: 0,
      weeklyReportCount: 0,
      dailyReportCount: 0,
    },
    app: {
      status: 'blocked',
      isLocked: true,
      lockReasons: ['authentication'],
    },
  };
}

export function useAppBootstrap() {
  const [state, setState] = useState<AppBootstrapState>(createFallbackBootstrapState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!window.electron?.app) {
      setIsLoading(false);
      setError('Electron bridge is not available.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextState = await window.electron.app.getBootstrapState();
      startTransition(() => setState(nextState));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unknown bootstrap error.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    state,
    isLoading,
    error,
    refresh,
  };
}
