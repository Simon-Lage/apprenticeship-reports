import { safeStorage } from 'electron';

export type SecretStorageService = {
  isEncryptionAvailable: () => boolean;
  encryptString: (value: string) => string;
  decryptString: (value: string) => string;
};

export class ElectronSecretStorageService implements SecretStorageService {
  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  encryptString(value: string): string {
    return safeStorage.encryptString(value).toString('base64');
  }

  decryptString(value: string): string {
    return safeStorage.decryptString(Buffer.from(value, 'base64'));
  }
}
