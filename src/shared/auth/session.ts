import { z } from 'zod';

const REAUTH_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

export const UserAccountSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().optional(),
});

export const AuthProviderSchema = z.enum(['password', 'google']);

export const AppSessionSchema = z.object({
  provider: AuthProviderSchema,
  account: UserAccountSchema,
  rememberMe: z.boolean(),
  authenticatedAt: z.string().datetime(),
  lastValidatedAt: z.string().datetime(),
});

export const CreatePasswordSessionInputSchema = z.object({
  account: UserAccountSchema,
  rememberMe: z.boolean(),
});

export const CreateGoogleSessionInputSchema = z.object({
  account: UserAccountSchema,
  rememberMe: z.boolean(),
});

export type AppSession = z.infer<typeof AppSessionSchema>;
export type GoogleSession = AppSession;
export type CreatePasswordSessionInput = z.input<
  typeof CreatePasswordSessionInputSchema
>;
export type CreateGoogleSessionInput = z.input<
  typeof CreateGoogleSessionInputSchema
>;

export type AppSessionState = {
  status: 'signed-out' | 'active' | 'reauth-required';
  isAuthenticated: boolean;
  shouldPersist: boolean;
  provider: z.infer<typeof AuthProviderSchema> | null;
  expiresAt: string | null;
};

function createAppSession(
  provider: z.infer<typeof AuthProviderSchema>,
  account: z.infer<typeof UserAccountSchema>,
  rememberMe: boolean,
  now: string,
): AppSession {
  return AppSessionSchema.parse({
    provider,
    account,
    rememberMe,
    authenticatedAt: now,
    lastValidatedAt: now,
  });
}

export function createPasswordSession(
  input: CreatePasswordSessionInput,
  now: string,
): AppSession {
  const parsedInput = CreatePasswordSessionInputSchema.parse(input);
  return createAppSession(
    'password',
    parsedInput.account,
    parsedInput.rememberMe,
    now,
  );
}

export function createGoogleSession(
  input: CreateGoogleSessionInput,
  now: string,
): AppSession {
  const parsedInput = CreateGoogleSessionInputSchema.parse(input);
  return createAppSession(
    'google',
    parsedInput.account,
    parsedInput.rememberMe,
    now,
  );
}

export function touchSession(session: AppSession, now: string): AppSession {
  return AppSessionSchema.parse({
    ...session,
    lastValidatedAt: now,
  });
}

export function deriveSessionState(
  session: AppSession | null,
  now: string,
): AppSessionState {
  if (!session) {
    return {
      status: 'signed-out',
      isAuthenticated: false,
      shouldPersist: false,
      provider: null,
      expiresAt: null,
    };
  }

  const parsedSession = AppSessionSchema.parse(session);
  const expiresAt = new Date(
    new Date(parsedSession.authenticatedAt).getTime() + REAUTH_INTERVAL_MS,
  ).toISOString();
  const requiresReauthentication =
    new Date(now).getTime() >= new Date(expiresAt).getTime();

  return {
    status: requiresReauthentication ? 'reauth-required' : 'active',
    isAuthenticated: !requiresReauthentication,
    shouldPersist: parsedSession.rememberMe,
    provider: parsedSession.provider,
    expiresAt,
  };
}

export function getPersistedSession(session: AppSession): AppSession | null {
  return session.rememberMe ? AppSessionSchema.parse(session) : null;
}

export const GoogleAccountSchema = UserAccountSchema;
export const GoogleSessionSchema = AppSessionSchema;
export const deriveGoogleSessionState = deriveSessionState;
export const getPersistedGoogleSession = getPersistedSession;
