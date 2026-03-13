import {
  createGoogleSession,
  createPasswordSession,
  deriveSessionState,
} from '@/shared/auth/session';

describe('session policy', () => {
  it('keeps a fresh remembered google session active', () => {
    const session = createGoogleSession(
      {
        account: {
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'User Example',
        },
        rememberMe: true,
      },
      '2026-03-13T10:00:00.000Z',
    );

    const state = deriveSessionState(session, '2026-04-01T10:00:00.000Z');

    expect(state.status).toBe('active');
    expect(state.isAuthenticated).toBe(true);
    expect(state.shouldPersist).toBe(true);
    expect(state.provider).toBe('google');
  });

  it('keeps a fresh remembered password session active', () => {
    const session = createPasswordSession(
      {
        account: {
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'User Example',
        },
        rememberMe: true,
      },
      '2026-03-13T10:00:00.000Z',
    );

    const state = deriveSessionState(session, '2026-04-01T10:00:00.000Z');

    expect(state.status).toBe('active');
    expect(state.provider).toBe('password');
  });

  it('requires reauthentication after 30 days', () => {
    const session = createGoogleSession(
      {
        account: {
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'User Example',
        },
        rememberMe: false,
      },
      '2026-03-13T10:00:00.000Z',
    );

    const state = deriveSessionState(session, '2026-04-12T10:00:00.001Z');

    expect(state.status).toBe('reauth-required');
    expect(state.isAuthenticated).toBe(false);
  });
});
