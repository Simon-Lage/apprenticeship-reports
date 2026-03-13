import { ipcMain } from 'electron';
import { getGoogleClientSecret, googleClientId } from '../../shared/authConfig';
import { AuthSession, AuthStatus } from '../../shared/authTypes';
import { exportGoogleDriveEncrypted, exportLocalEncrypted, importEncryptedBackup } from './backup';
import { startGoogleLogin } from './google';
import {
  buildKeyring,
  createDek,
  getGoogleDriveRefreshToken,
  loadKeyring,
  saveKeyring,
  unwrapDekWithGoogle,
  unwrapDekWithPassword,
  wrapDekWithGoogle,
  wrapDekWithPassword,
} from './keyring';
import { startCriticalOperation } from '../criticalOperations';
import { resetApplication } from './reset';
import {
  clearAuthenticatedSession,
  ensureAuthenticatedSession,
  getAuthSessionState,
  getDbService,
  setAuthenticatedSession,
} from './runtime';

const isDebugDekEnabled = () =>
  process.env.SHOW_DEBUG_DEK_KEY_IAEJFJDKDSMSDKLMDMFGKLKFMEKFEMFPEP342342324234 === 'true';

const maybeLogDek = () => {
  const session = getAuthSessionState();
  if (!isDebugDekEnabled()) {
    return;
  }
  if (!session.dek) {
    console.error(`[debug] NO SQLCipher DEK found`);
    return;
  }
  console.log(`[debug] SQLCipher DEK: ${session.dek.toString('hex')}`);
};

const getStatus = async (): Promise<AuthStatus> => {
  const keyring = await loadKeyring();
  let hasGoogleDriveAccess = false;
  try {
    hasGoogleDriveAccess = !!getGoogleDriveRefreshToken(keyring?.google);
  } catch {
    hasGoogleDriveAccess = false;
  }
  return {
    hasPassword: !!keyring?.password,
    hasGoogle: !!keyring?.google,
    googleSub: keyring?.google?.sub,
    hasGoogleDriveAccess,
  };
};

const getClientId = () => googleClientId;
const getClientSecret = () => getGoogleClientSecret();

export const registerAuthHandlers = () => {
  ipcMain.handle('auth:status', async () => getStatus());

  ipcMain.handle('auth:init', async (_event, payload: { password: string }) => {
    const endCritical = startCriticalOperation();
    try {
      const status = await getStatus();
      if (status.hasPassword) {
        throw new Error('already_initialized');
      }
      const dek = createDek();
      const passwordWrap = wrapDekWithPassword(dek, payload.password);
      const keyring = buildKeyring(passwordWrap);
      await saveKeyring(keyring);
      await setAuthenticatedSession(dek, null, 'password');
      maybeLogDek();
      return { user: null, method: 'password' } satisfies AuthSession;
    } finally {
      endCritical();
    }
  });

  ipcMain.handle('auth:login:password', async (_event, payload: { password: string }) => {
    const keyring = await loadKeyring();
    if (!keyring?.password) {
      throw new Error('not_initialized');
    }
    const dek = unwrapDekWithPassword(keyring.password, payload.password);
    await setAuthenticatedSession(dek, null, 'password');
    maybeLogDek();
    return { user: null, method: 'password' } satisfies AuthSession;
  });

  ipcMain.handle('auth:login:google', async () => {
    const keyring = await loadKeyring();
    if (!keyring?.google) {
      throw new Error('google_not_linked');
    }
    const { user } = await startGoogleLogin(getClientId(), getClientSecret());
    if (user.id !== keyring.google.sub) {
      throw new Error('google_account_mismatch');
    }
    const dek = unwrapDekWithGoogle(keyring.google);
    await setAuthenticatedSession(dek, user, 'google');
    maybeLogDek();
    return { user, method: 'google' } satisfies AuthSession;
  });

  ipcMain.handle('auth:link:google', async () => {
    ensureAuthenticatedSession();
    const session = getAuthSessionState();
    const keyring = await loadKeyring();
    if (!keyring?.password) {
      throw new Error('not_initialized');
    }
    if (keyring.google) {
      throw new Error('google_already_linked');
    }
    const { user } = await startGoogleLogin(getClientId(), getClientSecret());
    const googleWrap = wrapDekWithGoogle(session.dek as Buffer, user.id);
    const updated = buildKeyring(keyring.password, googleWrap);
    await saveKeyring(updated);
    return { user } satisfies { user: AuthSession['user'] };
  });

  ipcMain.handle('auth:unlink:google', async () => {
    ensureAuthenticatedSession();
    const keyring = await loadKeyring();
    if (!keyring?.password) {
      throw new Error('not_initialized');
    }
    if (!keyring.google) {
      throw new Error('google_not_linked');
    }
    const updated = buildKeyring(keyring.password);
    await saveKeyring(updated);
    return true;
  });

  ipcMain.handle('auth:change:password', async (_event, payload: { password: string }) => {
    ensureAuthenticatedSession();
    const session = getAuthSessionState();
    const keyring = await loadKeyring();
    if (!keyring?.password) {
      throw new Error('not_initialized');
    }
    const passwordWrap = wrapDekWithPassword(session.dek as Buffer, payload.password);
    const updated = buildKeyring(passwordWrap, keyring.google);
    await saveKeyring(updated);
    return true;
  });

  ipcMain.handle('auth:change:google', async () => {
    ensureAuthenticatedSession();
    const session = getAuthSessionState();
    const keyring = await loadKeyring();
    if (!keyring?.password) {
      throw new Error('not_initialized');
    }
    const { user } = await startGoogleLogin(getClientId(), getClientSecret());
    const googleWrap = wrapDekWithGoogle(session.dek as Buffer, user.id);
    const updated = buildKeyring(keyring.password, googleWrap);
    await saveKeyring(updated);
    return { user } satisfies { user: AuthSession['user'] };
  });

  ipcMain.handle('auth:logout', async () => {
    await clearAuthenticatedSession();
    return true;
  });

  ipcMain.handle('auth:reset', async (_event, payload: { password: string }) => {
    const dbService = getDbService();
    await resetApplication(payload.password, dbService);
    await clearAuthenticatedSession();
    return true;
  });

  ipcMain.handle('backup:export:local', async () => exportLocalEncrypted());
  ipcMain.handle('backup:export:drive', async () => exportGoogleDriveEncrypted());
  ipcMain.handle('backup:import', async () => importEncryptedBackup());

  ipcMain.handle('debug:export-decrypted-db', async () => {
    ensureAuthenticatedSession();
    const dbService = getDbService();
    if (!isDebugDekEnabled()) {
      throw new Error('debug_dek_disabled');
    }
    return dbService.exportDecrypted();
  });
};
