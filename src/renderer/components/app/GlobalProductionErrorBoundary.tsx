import { Component, ErrorInfo, PropsWithChildren, ReactNode } from 'react';

import { appRoutes } from '@/renderer/lib/app-routes';
import { RendererErrorInput } from '@/shared/ipc/app-api';

type GlobalProductionErrorBoundaryState = {
  errorKey: number | null;
};

const recoveryAttemptedKey = 'apprep-global-error-recovery-attempted';

function resolveRoute(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return (hash.split('?')[0] || appRoutes.home).trim();
}

function normalizeUnknownError(error: unknown): {
  message: string;
  stack: string | null;
} {
  if (error instanceof Error) {
    return {
      message: error.message || error.name,
      stack: error.stack ?? null,
    };
  }

  if (typeof error === 'string') {
    return { message: error, stack: null };
  }

  try {
    return { message: JSON.stringify(error), stack: null };
  } catch {
    return { message: String(error), stack: null };
  }
}

function shouldRestartForRoute(route: string): boolean {
  return (
    route === appRoutes.home ||
    sessionStorage.getItem(recoveryAttemptedKey) === 'true'
  );
}

function reportRendererError(input: RendererErrorInput): void {
  window.electron?.app?.handleRendererError(input).catch(() => undefined);
}

function buildRendererErrorInput(input: {
  source: RendererErrorInput['source'];
  error: unknown;
  componentStack?: string | null;
  restartApp: boolean;
}): RendererErrorInput {
  const normalized = normalizeUnknownError(input.error);

  return {
    source: input.source,
    message: normalized.message || 'Unknown renderer error',
    stack: normalized.stack,
    componentStack: input.componentStack ?? null,
    route: resolveRoute(),
    url: window.location.href,
    restartApp: input.restartApp,
  };
}

export default class GlobalProductionErrorBoundary extends Component<
  PropsWithChildren,
  GlobalProductionErrorBoundaryState
> {
  private static readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(props: PropsWithChildren) {
    super(props);

    this.state = {
      errorKey: null,
    };
  }

  static getDerivedStateFromError(): GlobalProductionErrorBoundaryState {
    if (!GlobalProductionErrorBoundary.isProduction) {
      return { errorKey: null };
    }

    return { errorKey: Date.now() };
  }

  componentDidMount(): void {
    if (!GlobalProductionErrorBoundary.isProduction) return;

    window.addEventListener('error', this.handleWindowError);
    window.addEventListener(
      'unhandledrejection',
      this.handleUnhandledRejection,
    );
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (!GlobalProductionErrorBoundary.isProduction) return;

    this.handleError({
      source: 'react',
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  componentWillUnmount(): void {
    if (!GlobalProductionErrorBoundary.isProduction) return;

    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener(
      'unhandledrejection',
      this.handleUnhandledRejection,
    );
  }

  handleWindowError = (event: ErrorEvent): void => {
    if (!GlobalProductionErrorBoundary.isProduction) return;

    const error = event.error ?? event.message;
    window.setTimeout(() => {
      const { errorKey } = this.state;
      if (errorKey !== null) return;

      this.handleError({
        source: 'window-error',
        error,
      });
    }, 0);
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    if (!GlobalProductionErrorBoundary.isProduction) return;

    this.handleError({
      source: 'unhandled-rejection',
      error: event.reason,
    });
  };

  handleError(input: {
    source: RendererErrorInput['source'];
    error: unknown;
    componentStack?: string | null;
  }): void {
    const route = resolveRoute();
    const restartApp = shouldRestartForRoute(route);

    reportRendererError(
      buildRendererErrorInput({
        ...input,
        restartApp,
      }),
    );

    if (restartApp) return;

    sessionStorage.setItem(recoveryAttemptedKey, 'true');
    window.location.hash = appRoutes.home;
    window.setTimeout(() => {
      this.setState({ errorKey: null });
    }, 0);
  }

  render(): ReactNode {
    const { children } = this.props;
    const { errorKey } = this.state;

    if (GlobalProductionErrorBoundary.isProduction && errorKey !== null) {
      return null;
    }

    return children;
  }
}
