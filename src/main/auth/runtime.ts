import { AuthSession } from '../../shared/authTypes';
import { DbService } from './db';

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

export const setAuthenticatedSession = async (
  dek: Buffer,
  user: AuthSession['user'],
  method: AuthSession['method'],
) => {
  await dbService.open(dek);
  session.dek = dek;
  session.user = user;
  session.method = method;
};

export const clearAuthenticatedSession = async () => {
  await dbService.close();
  session.dek = null;
  session.user = null;
  session.method = null;
};

export const ensureAuthenticatedSession = () => {
  if (!session.dek || !session.method) {
    throw new Error('not_authenticated');
  }
};

export const getAuthenticatedDatabase = () => {
  ensureAuthenticatedSession();
  return dbService.getDatabase();
};

export const getAuthSessionState = () => session;

export const getDbService = () => dbService;

