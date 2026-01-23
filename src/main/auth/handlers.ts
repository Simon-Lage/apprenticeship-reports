import { ipcMain } from 'electron';
import { googleClientId } from '../../shared/authConfig';
import { AuthSession, AuthStatus } from '../../shared/authTypes';
import { exportGoogleDriveEncrypted, exportLocalEncrypted, importEncryptedBackup } from './backup';
import { DbService } from './db';
import { startGoogleLogin } from './google';
import {
  buildKeyring,
  createDek,
  loadKeyring,
  saveKeyring,
  unwrapDekWithGoogle,
  unwrapDekWithPassword,
  wrapDekWithGoogle,
  wrapDekWithPassword,
} from './keyring';
import { resetApplication } from './reset';

type AuthSessionState = {
  dek: Buffer | null;
  user: AuthSession['user'];
  method: AuthSession['method'] | null;
};

const dbService = new DbService();
const session: AuthSessionState = {
  dek: null,
  user: null,
  method: null,
};

const setSession = async (dek: Buffer, user: AuthSession['user'], method: AuthSession['method']) => {
  await dbService.open(dek);
  session.dek = dek;
  session.user = user;
  session.method = method;
};

const clearSession = async () => {
  await dbService.close();
  session.dek = null;
  session.user = null;
  session.method = null;
};

const ensureSession = () => {
  if (!session.dek || !session.method) {
    throw new Error('not_authenticated');
  }
};

const getStatus = async (): Promise<AuthStatus> => {
  const keyring = await loadKeyring();
  return {
    hasPassword: !!keyring?.password,
    hasGoogle: !!keyring?.google,
    googleSub: keyring?.google?.sub,
  };
};

const getClientId = () => googleClientId;

export const registerAuthHandlers = () => {
  ipcMain.handle('auth:status', async () => getStatus());

  ipcMain.handle('auth:init', async (_event, payload: { password: string }) => {
    const status = await getStatus();
    if (status.hasPassword) {
      throw new Error('already_initialized');
    }
    const dek = createDek();
    const passwordWrap = wrapDekWithPassword(dek, payload.password);
    const keyring = buildKeyring(passwordWrap);
    await saveKeyring(keyring);
    await setSession(dek, null, 'password');
    return { user: null, method: 'password' } satisfies AuthSession;
  });

  ipcMain.handle('auth:login:password', async (_event, payload: { password: string }) => {
    const keyring = await loadKeyring();
    if (!keyring?.password) {
      throw new Error('not_initialized');
    }
    const dek = unwrapDekWithPassword(keyring.password, payload.password);
    await setSession(dek, null, 'password');
    return { user: null, method: 'password' } satisfies AuthSession;
  });

  ipcMain.handle('auth:login:google', async () => {
    const keyring = await loadKeyring();
    if (!keyring?.google) {
      throw new Error('google_not_linked');
    }
    const { user } = await startGoogleLogin(getClientId());
    if (user.id !== keyring.google.sub) {
      throw new Error('google_account_mismatch');
    }
    const dek = unwrapDekWithGoogle(keyring.google);
    await setSession(dek, user, 'google');
    return { user, method: 'google' } satisfies AuthSession;
  });

  ipcMain.handle('auth:link:google', async () => {
    ensureSession();
    const keyring = await loadKeyring();
    if (!keyring?.password) {
      throw new Error('not_initialized');
    }
    if (keyring.google) {
      throw new Error('google_already_linked');
    }
    const { user } = await startGoogleLogin(getClientId());
    const googleWrap = wrapDekWithGoogle(session.dek as Buffer, user.id);
    const updated = buildKeyring(keyring.password, googleWrap);
    await saveKeyring(updated);
    return { user } satisfies { user: AuthSession['user'] };
  });

  ipcMain.handle('auth:unlink:google', async () => {
    ensureSession();
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
    ensureSession();
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
    ensureSession();
    const keyring = await loadKeyring();
    if (!keyring?.password) {
      throw new Error('not_initialized');
    }
    const { user } = await startGoogleLogin(getClientId());
    const googleWrap = wrapDekWithGoogle(session.dek as Buffer, user.id);
    const updated = buildKeyring(keyring.password, googleWrap);
    await saveKeyring(updated);
    return { user } satisfies { user: AuthSession['user'] };
  });

  ipcMain.handle('auth:logout', async () => {
    await clearSession();
    return true;
  });

  ipcMain.handle('auth:reset', async (_event, payload: { password: string }) => {
    await resetApplication(payload.password, dbService);
    await clearSession();
    return true;
  });

  ipcMain.handle('backup:export:local', async () => exportLocalEncrypted());
  ipcMain.handle('backup:export:drive', async () => exportGoogleDriveEncrypted());
  ipcMain.handle('backup:import', async () => importEncryptedBackup());
};
