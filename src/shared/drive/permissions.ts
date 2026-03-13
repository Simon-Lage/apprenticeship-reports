import { z } from 'zod';

import { UserAccountSchema } from '@/shared/auth/session';

export const DrivePermissionStateSchema = z.object({
  requiredScopes: z.array(z.string().min(1)).default([]),
  grantedScopes: z.array(z.string().min(1)).default([]),
  account: UserAccountSchema.nullable().default(null),
  accessToken: z.string().min(1).nullable().default(null),
  refreshToken: z.string().min(1).nullable().default(null),
  connectedAt: z.string().datetime().nullable().default(null),
  lastValidatedAt: z.string().datetime().nullable().default(null),
  lastPromptedAt: z.string().datetime().nullable().default(null),
  explanation: z.string().min(1).nullable().default(null),
});

export type DrivePermissionState = z.infer<typeof DrivePermissionStateSchema>;

export type DriveAccessState = {
  status: 'not-authenticated' | 'not-configured' | 'granted' | 'missing';
  isLocked: boolean;
  requiresPrompt: boolean;
  isConnected: boolean;
  connectedAccountEmail: string | null;
  grantedScopes: string[];
  missingScopes: string[];
  requiredScopes: string[];
  lastPromptedAt: string | null;
  explanation: string | null;
};

export function deriveDriveAccessState(
  permissionState: DrivePermissionState,
  isAuthenticated: boolean,
): DriveAccessState {
  const parsedState = DrivePermissionStateSchema.parse(permissionState);
  const isConnected = Boolean(parsedState.account && parsedState.accessToken);
  const connectedAccountEmail = parsedState.account?.email ?? null;

  if (!isAuthenticated) {
    return {
      status: 'not-authenticated',
      isLocked: false,
      requiresPrompt: false,
      isConnected,
      connectedAccountEmail,
      grantedScopes: parsedState.grantedScopes,
      missingScopes: parsedState.requiredScopes,
      requiredScopes: parsedState.requiredScopes,
      lastPromptedAt: parsedState.lastPromptedAt,
      explanation: parsedState.explanation,
    };
  }

  if (!parsedState.requiredScopes.length) {
    return {
      status: 'not-configured',
      isLocked: false,
      requiresPrompt: false,
      isConnected,
      connectedAccountEmail,
      grantedScopes: parsedState.grantedScopes,
      missingScopes: [],
      requiredScopes: [],
      lastPromptedAt: parsedState.lastPromptedAt,
      explanation: parsedState.explanation,
    };
  }

  const grantedScopes = new Set(parsedState.grantedScopes);
  const missingScopes = parsedState.requiredScopes.filter(
    (scope) => !grantedScopes.has(scope),
  );
  const hasValidConnection = Boolean(parsedState.account && parsedState.accessToken);

  if (!missingScopes.length && hasValidConnection) {
    return {
      status: 'granted',
      isLocked: false,
      requiresPrompt: false,
      isConnected,
      connectedAccountEmail,
      grantedScopes: parsedState.grantedScopes,
      missingScopes: [],
      requiredScopes: parsedState.requiredScopes,
      lastPromptedAt: parsedState.lastPromptedAt,
      explanation: parsedState.explanation,
    };
  }

  return {
    status: 'missing',
    isLocked: true,
    requiresPrompt: true,
    isConnected,
    connectedAccountEmail,
    grantedScopes: parsedState.grantedScopes,
    missingScopes,
    requiredScopes: parsedState.requiredScopes,
    lastPromptedAt: parsedState.lastPromptedAt,
    explanation: parsedState.explanation,
  };
}
