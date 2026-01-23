import crypto from 'crypto';
import { app, safeStorage } from 'electron';
import fs from 'fs/promises';
import path from 'path';

type PasswordWrap = {
  salt: string;
  nonce: string;
  ciphertext: string;
  authTag: string;
  kdf: {
    name: 'scrypt';
    N: number;
    r: number;
    p: number;
    dkLen: number;
  };
};

type GoogleWrap = {
  sub: string;
  key: string;
  nonce: string;
  ciphertext: string;
  authTag: string;
};

type KeyringData = {
  version: 1;
  password?: PasswordWrap;
  google?: GoogleWrap;
};

const keyringVersion = 1;

const scryptParams = {
  name: 'scrypt' as const,
  N: 16384,
  r: 8,
  p: 1,
  dkLen: 32,
};

const getKeyringPath = () =>
  path.join(app.getPath('userData'), 'auth', 'keyring.json');

const ensureDir = async (filePath: string) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

const deriveKey = (password: string, salt: Buffer) =>
  crypto.scryptSync(password, salt, scryptParams.dkLen, {
    N: scryptParams.N,
    r: scryptParams.r,
    p: scryptParams.p,
  }) as Buffer;

const encryptWithKey = (key: Buffer, payload: Buffer) => {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    nonce: nonce.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    authTag: authTag.toString('base64'),
  };
};

const decryptWithKey = (key: Buffer, wrap: { nonce: string; ciphertext: string; authTag: string }) => {
  const nonce = Buffer.from(wrap.nonce, 'base64');
  const ciphertext = Buffer.from(wrap.ciphertext, 'base64');
  const authTag = Buffer.from(wrap.authTag, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

export const createDek = () => crypto.randomBytes(32);

export const loadKeyring = async (): Promise<KeyringData | null> => {
  const keyringPath = getKeyringPath();
  try {
    const raw = await fs.readFile(keyringPath, 'utf-8');
    const parsed = JSON.parse(raw) as KeyringData;
    if (parsed.version !== keyringVersion) {
      throw new Error('unsupported_keyring_version');
    }
    return parsed;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

export const saveKeyring = async (keyring: KeyringData) => {
  const keyringPath = getKeyringPath();
  await ensureDir(keyringPath);
  await fs.writeFile(keyringPath, JSON.stringify(keyring, null, 2), 'utf-8');
};

export const clearKeyring = async () => {
  const keyringPath = getKeyringPath();
  try {
    await fs.unlink(keyringPath);
  } catch (error: unknown) {
    if ((error as { code?: string }).code !== 'ENOENT') {
      throw error;
    }
  }
};

export const wrapDekWithPassword = (dek: Buffer, password: string): PasswordWrap => {
  const salt = crypto.randomBytes(16);
  const key = deriveKey(password, salt);
  const wrap = encryptWithKey(key, dek);
  return {
    salt: salt.toString('base64'),
    nonce: wrap.nonce,
    ciphertext: wrap.ciphertext,
    authTag: wrap.authTag,
    kdf: { ...scryptParams },
  };
};

export const unwrapDekWithPassword = (wrap: PasswordWrap, password: string) => {
  const salt = Buffer.from(wrap.salt, 'base64');
  const key = deriveKey(password, salt);
  return decryptWithKey(key, wrap);
};

export const wrapDekWithGoogle = (dek: Buffer, sub: string): GoogleWrap => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safe_storage_unavailable');
  }
  const googleKey = crypto.randomBytes(32);
  const encryptedKey = safeStorage.encryptString(googleKey.toString('base64'));
  const wrap = encryptWithKey(googleKey, dek);
  return {
    sub,
    key: encryptedKey.toString('base64'),
    nonce: wrap.nonce,
    ciphertext: wrap.ciphertext,
    authTag: wrap.authTag,
  };
};

export const unwrapDekWithGoogle = (wrap: GoogleWrap) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safe_storage_unavailable');
  }
  const encryptedKey = Buffer.from(wrap.key, 'base64');
  const googleKeyRaw = safeStorage.decryptString(encryptedKey);
  const googleKey = Buffer.from(googleKeyRaw, 'base64');
  return decryptWithKey(googleKey, wrap);
};

export const buildKeyring = (passwordWrap: PasswordWrap, googleWrap?: GoogleWrap): KeyringData => ({
  version: keyringVersion,
  password: passwordWrap,
  google: googleWrap,
});
