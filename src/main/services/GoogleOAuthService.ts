import { createHash, randomBytes } from 'crypto';
import http from 'http';

import { UserAccountSchema } from '@/shared/auth/session';
import { GOOGLE_PROFILE_SCOPES } from '@/shared/drive/backups';

type GoogleOAuthServiceOptions = {
  clientId: string | null;
  clientSecret?: string | null;
  openExternal: (url: string) => Promise<void> | void;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
};

type GoogleAuthorizationInput = {
  scopes?: string[];
  loginHint?: string | null;
  prompt?: string;
};

type GoogleAuthorizationResult = {
  account: typeof UserAccountSchema._type;
  accessToken: string;
  refreshToken: string | null;
  grantedScopes: string[];
  expiresIn: number | null;
};

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

function createCodeVerifier(): string {
  return randomBytes(48).toString('base64url');
}

function createCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

function createStateToken(): string {
  return randomBytes(24).toString('hex');
}

function normalizeScopes(scopes: string[]): string[] {
  return Array.from(new Set(scopes)).sort((left, right) =>
    left.localeCompare(right),
  );
}

export class GoogleOAuthService {
  private readonly clientId: string | null;

  private readonly clientSecret: string | null;

  private readonly openExternal: (url: string) => Promise<void> | void;

  private readonly authorizationEndpoint: string;

  private readonly tokenEndpoint: string;

  private readonly userInfoEndpoint: string;

  constructor(options: GoogleOAuthServiceOptions) {
    this.clientId = options.clientId?.trim() ?? null;
    this.clientSecret = options.clientSecret?.trim() ?? null;
    this.openExternal = options.openExternal;
    this.authorizationEndpoint =
      options.authorizationEndpoint ??
      'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenEndpoint =
      options.tokenEndpoint ?? 'https://oauth2.googleapis.com/token';
    this.userInfoEndpoint =
      options.userInfoEndpoint ??
      'https://openidconnect.googleapis.com/v1/userinfo';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId);
  }

  getProfileScopes(): string[] {
    return [...GOOGLE_PROFILE_SCOPES];
  }

  async authorize(
    input: GoogleAuthorizationInput = {},
  ): Promise<GoogleAuthorizationResult> {
    if (!this.clientId) {
      throw new Error(
        'Google OAuth ist nicht konfiguriert. GOOGLE_OAUTH_CLIENT_ID fehlt.',
      );
    }

    const scopes = normalizeScopes([
      ...GOOGLE_PROFILE_SCOPES,
      ...(input.scopes ?? []),
    ]);
    const codeVerifier = createCodeVerifier();
    const codeChallenge = createCodeChallenge(codeVerifier);
    const state = createStateToken();
    const callback = await this.createLoopbackCallback(state);
    const authorizationUrl = new URL(this.authorizationEndpoint);

    authorizationUrl.searchParams.set('client_id', this.clientId);
    authorizationUrl.searchParams.set('redirect_uri', callback.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', scopes.join(' '));
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    authorizationUrl.searchParams.set('access_type', 'offline');
    authorizationUrl.searchParams.set('include_granted_scopes', 'true');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set(
      'prompt',
      input.prompt ?? 'consent select_account',
    );

    if (input.loginHint) {
      authorizationUrl.searchParams.set('login_hint', input.loginHint);
    }

    try {
      await this.openExternal(authorizationUrl.toString());
      const authorizationCode = await callback.waitForCode();
      const tokenResponse = await this.exchangeAuthorizationCode({
        authorizationCode,
        codeVerifier,
        redirectUri: callback.redirectUri,
      });
      const account = await this.fetchAccount(tokenResponse.access_token);

      return {
        account,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? null,
        grantedScopes: normalizeScopes(
          tokenResponse.scope ? tokenResponse.scope.split(' ') : scopes,
        ),
        expiresIn: tokenResponse.expires_in ?? null,
      };
    } finally {
      await callback.close();
    }
  }

  async refreshAccessToken(
    refreshToken: string,
    scopes?: string[],
  ): Promise<{
    accessToken: string;
    grantedScopes: string[];
    expiresIn: number | null;
  }> {
    if (!this.clientId) {
      throw new Error(
        'Google OAuth ist nicht konfiguriert. GOOGLE_OAUTH_CLIENT_ID fehlt.',
      );
    }

    const body = new URLSearchParams({
      client_id: this.clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    if (this.clientSecret) {
      body.set('client_secret', this.clientSecret);
    }

    if (scopes?.length) {
      body.set('scope', normalizeScopes(scopes).join(' '));
    }

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(
        `Google Token Refresh fehlgeschlagen: ${response.status}`,
      );
    }

    const tokenResponse = (await response.json()) as GoogleTokenResponse;

    if (!tokenResponse.access_token) {
      throw new Error('Google Token Refresh lieferte kein access_token.');
    }

    return {
      accessToken: tokenResponse.access_token,
      grantedScopes: normalizeScopes(
        tokenResponse.scope ? tokenResponse.scope.split(' ') : (scopes ?? []),
      ),
      expiresIn: tokenResponse.expires_in ?? null,
    };
  }

  private async exchangeAuthorizationCode(input: {
    authorizationCode: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<GoogleTokenResponse> {
    if (!this.clientId) {
      throw new Error('Google OAuth ist nicht konfiguriert.');
    }

    const body = new URLSearchParams({
      client_id: this.clientId,
      code: input.authorizationCode,
      code_verifier: input.codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: input.redirectUri,
    });

    if (this.clientSecret) {
      body.set('client_secret', this.clientSecret);
    }

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(
        `Google Token-Austausch fehlgeschlagen: ${response.status}`,
      );
    }

    const tokenResponse = (await response.json()) as GoogleTokenResponse;

    if (!tokenResponse.access_token) {
      throw new Error('Google Token-Austausch lieferte kein access_token.');
    }

    return tokenResponse;
  }

  private async fetchAccount(
    accessToken: string,
  ): Promise<typeof UserAccountSchema._type> {
    const response = await fetch(this.userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Google Userinfo fehlgeschlagen: ${response.status}`);
    }

    const payload = (await response.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    return UserAccountSchema.parse({
      id: payload.sub,
      email: payload.email,
      displayName: payload.name,
      avatarUrl: payload.picture,
    });
  }

  private async createLoopbackCallback(expectedState: string): Promise<{
    redirectUri: string;
    waitForCode: () => Promise<string>;
    close: () => Promise<void>;
  }> {
    const server = http.createServer();
    let resolveCode: ((code: string) => void) | null = null;
    let rejectCode: ((error: Error) => void) | null = null;
    let settled = false;
    const waitForCode = () =>
      new Promise<string>((resolve, reject) => {
        resolveCode = resolve;
        rejectCode = reject;
      });

    server.on('request', (request, response) => {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
      const state = requestUrl.searchParams.get('state');
      const code = requestUrl.searchParams.get('code');
      const error = requestUrl.searchParams.get('error');

      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
      });

      if (state !== expectedState) {
        response.end('<html><body>State mismatch.</body></html>');
        if (!settled && rejectCode) {
          settled = true;
          rejectCode(new Error('Google OAuth State stimmt nicht ueberein.'));
        }
        return;
      }

      if (error) {
        response.end('<html><body>Authentication failed.</body></html>');
        if (!settled && rejectCode) {
          settled = true;
          rejectCode(new Error(`Google OAuth Fehler: ${error}`));
        }
        return;
      }

      if (!code) {
        response.end('<html><body>Authorization code missing.</body></html>');
        if (!settled && rejectCode) {
          settled = true;
          rejectCode(
            new Error('Google OAuth Callback ohne Authorization Code.'),
          );
        }
        return;
      }

      response.end(
        '<html><body>Authentication completed. You can close this window.</body></html>',
      );

      if (!settled && resolveCode) {
        settled = true;
        resolveCode(code);
      }
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', (error) =>
        reject(error instanceof Error ? error : new Error(String(error))),
      );
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error(
        'Google OAuth Callback-Port konnte nicht geoeffnet werden.',
      );
    }

    const timeout = setTimeout(() => {
      if (!settled && rejectCode) {
        settled = true;
        rejectCode(new Error('Google OAuth Zeitlimit ueberschritten.'));
      }
    }, 180000);

    return {
      redirectUri: `http://127.0.0.1:${address.port}/oauth2/callback`,
      waitForCode: async () => {
        try {
          return await waitForCode();
        } finally {
          clearTimeout(timeout);
        }
      },
      close: async () => {
        clearTimeout(timeout);
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (!error) {
              resolve();
              return;
            }

            reject(error);
          });
        }).catch(() => undefined);
      },
    };
  }
}
