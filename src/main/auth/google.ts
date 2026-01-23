import crypto from 'crypto';
import http from 'http';
import { shell } from 'electron';
import { AuthUser } from '../../shared/authTypes';

type AuthResult = {
  idToken: string;
  accessToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
};

const base64Url = (input: Buffer) =>
  input
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const createRandomString = (size = 32) => base64Url(crypto.randomBytes(size));

const createCodeChallenge = async (verifier: string) => {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64Url(hash);
};

const waitForAuthCode = (server: http.Server, expectedState: string) =>
  new Promise<{ code: string; redirectUri: string }>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        server.close();
        reject(new Error('timeout'));
      }
    }, 180000);

    server.on('request', (req, res) => {
      if (settled) return;
      const redirectUri = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
      const url = new URL(req.url || '', redirectUri);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code || !state || state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid request');
        return;
      }
      settled = true;
      clearTimeout(timeout);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<!doctype html><html><body><p>Authentication successful. This window will close.</p><script>window.close();setTimeout(() => { document.body.innerText = "Authentication successful. You can close this window."; }, 500);</script></body></html>',
      );
      server.close(() => {
        resolve({ code, redirectUri });
      });
    });
  });

const exchangeCodeForTokens = async (
  code: string,
  verifier: string,
  redirectUri: string,
  clientId: string,
  clientSecret?: string,
): Promise<AuthResult> => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  });
  if (clientSecret) {
    body.set('client_secret', clientSecret);
  }
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`token_exchange_failed: ${text}`);
  }
  const data = (await response.json()) as {
    id_token?: string;
    access_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
  if (!data.id_token) {
    throw new Error('id_token_missing');
  }
  return {
    idToken: data.id_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    tokenType: data.token_type,
  };
};

const tokenInfoUrl = 'https://oauth2.googleapis.com/tokeninfo';

const validateIdToken = async (idToken: string, clientId: string): Promise<AuthUser> => {
  const response = await fetch(`${tokenInfoUrl}?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw new Error('invalid_id_token');
  }
  const payload = (await response.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    aud?: string;
    iss?: string;
    exp?: string;
  };
  if (!payload.sub) {
    throw new Error('invalid_id_token');
  }
  if (payload.aud !== clientId) {
    throw new Error('invalid_id_token');
  }
  if (
    payload.iss !== 'accounts.google.com' &&
    payload.iss !== 'https://accounts.google.com'
  ) {
    throw new Error('invalid_id_token');
  }
  if (payload.exp && Number(payload.exp) * 1000 <= Date.now()) {
    throw new Error('invalid_id_token');
  }
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
};

export const startGoogleLogin = async (
  clientId: string,
  clientSecret?: string,
): Promise<{ user: AuthUser; idToken: string }> => {
  if (!clientId) {
    throw new Error('client_id_missing');
  }
  const verifier = createRandomString(64);
  const challenge = await createCodeChallenge(verifier);
  const state = createRandomString(32);
  const server = http.createServer();

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.on('error', (err) => reject(err));
  });

  const redirectUri = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);

  await shell.openExternal(url.toString());
  const { code } = await waitForAuthCode(server, state);
  const tokens = await exchangeCodeForTokens(
    code,
    verifier,
    redirectUri,
    clientId,
    clientSecret,
  );
  const user = await validateIdToken(tokens.idToken, clientId);
  return { user, idToken: tokens.idToken };
};
