import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

import { z } from 'zod';

import { AppMetadataRepository } from '@/main/services/AppMetadataRepository';

const PasswordSecretSchema = z.string().min(8).max(128);
const PASSWORD_KEY_LENGTH = 64;

export type PasswordAuthInput = z.input<typeof PasswordSecretSchema>;

export class PasswordAuthService {
  private readonly repository: AppMetadataRepository;

  constructor(repository: AppMetadataRepository) {
    this.repository = repository;
  }

  async hasPassword(): Promise<boolean> {
    return this.repository.hasPasswordCredential();
  }

  async initialize(password: PasswordAuthInput): Promise<void> {
    if (await this.hasPassword()) {
      throw new Error('Ein Passwort ist bereits eingerichtet.');
    }

    await this.repository.writePasswordCredential(this.createCredential(password));
  }

  async verify(password: PasswordAuthInput): Promise<boolean> {
    const parsedPassword = PasswordSecretSchema.parse(password);
    const credential = await this.repository.readPasswordCredential();

    if (!credential) {
      return false;
    }

    const expectedHash = Buffer.from(credential.hash, 'hex');
    const actualHash = scryptSync(parsedPassword, Buffer.from(credential.salt, 'hex'), PASSWORD_KEY_LENGTH);

    if (expectedHash.length !== actualHash.length) {
      return false;
    }

    return timingSafeEqual(expectedHash, actualHash);
  }

  async changePassword(input: {
    currentPassword: PasswordAuthInput;
    nextPassword: PasswordAuthInput;
  }): Promise<void> {
    const currentPassword = PasswordSecretSchema.parse(input.currentPassword);
    const nextPassword = PasswordSecretSchema.parse(input.nextPassword);
    const isValid = await this.verify(currentPassword);

    if (!isValid) {
      throw new Error('Das aktuelle Passwort ist ungueltig.');
    }

    await this.repository.writePasswordCredential(this.createCredential(nextPassword));
  }

  private createCredential(password: PasswordAuthInput) {
    const parsedPassword = PasswordSecretSchema.parse(password);
    const salt = randomBytes(16);
    const hash = scryptSync(parsedPassword, salt, PASSWORD_KEY_LENGTH);
    const now = new Date().toISOString();

    return {
      salt: salt.toString('hex'),
      hash: hash.toString('hex'),
      createdAt: now,
      updatedAt: now,
    };
  }
}
