import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

import {
  BackupArchiveKind,
  BackupPasswordKeyWrap,
  BackupPasswordKeyWrapSchema,
  EncryptedBackupEnvelope,
  EncryptedBackupEnvelopeSchema,
  EncryptedBackupGoogleRecipient,
  GoogleBackupRecoveryKeyEnvelope,
  GoogleBackupRecoveryKeyEnvelopeSchema,
} from '@/shared/app/backup-encryption';

const KEY_LENGTH = 32;

function derivePasswordKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH, {
    N: 16_384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
}

function encryptWithKey(
  value: string,
  key: Buffer,
): {
  iv: string;
  tag: string;
  ciphertext: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);

  return {
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptWithKey(input: {
  iv: string;
  tag: string;
  ciphertext: string;
  key: Buffer;
}): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    input.key,
    Buffer.from(input.iv, 'hex'),
  );

  decipher.setAuthTag(Buffer.from(input.tag, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function assertMasterKey(value: string): string {
  if (!/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error('Backup encryption key is invalid.');
  }

  return value;
}

export class BackupEncryptionService {
  createMasterKey(): string {
    return randomBytes(KEY_LENGTH).toString('hex');
  }

  createPasswordKeyWrap(input: {
    masterKey: string;
    password: string;
  }): BackupPasswordKeyWrap {
    const salt = randomBytes(16);
    const key = derivePasswordKey(input.password, salt);

    return BackupPasswordKeyWrapSchema.parse({
      kdf: 'scrypt',
      salt: salt.toString('hex'),
      ...encryptWithKey(assertMasterKey(input.masterKey), key),
    });
  }

  unwrapPasswordKey(input: {
    passwordKeyWrap: BackupPasswordKeyWrap;
    password: string;
  }): string {
    const wrap = BackupPasswordKeyWrapSchema.parse(input.passwordKeyWrap);
    const key = derivePasswordKey(
      input.password,
      Buffer.from(wrap.salt, 'hex'),
    );

    try {
      return assertMasterKey(
        decryptWithKey({
          iv: wrap.iv,
          tag: wrap.tag,
          ciphertext: wrap.ciphertext,
          key,
        }),
      );
    } catch {
      throw new Error(
        'Backup konnte mit diesem Passwort nicht entschlüsselt werden.',
      );
    }
  }

  encryptSerializedPayload(input: {
    kind: BackupArchiveKind;
    exportedAt: string;
    serializedPayload: string;
    masterKey: string;
    passwordKeyWrap: BackupPasswordKeyWrap;
    googleRecipient?: EncryptedBackupGoogleRecipient | null;
  }): EncryptedBackupEnvelope {
    const encrypted = encryptWithKey(
      input.serializedPayload,
      Buffer.from(assertMasterKey(input.masterKey), 'hex'),
    );

    return EncryptedBackupEnvelopeSchema.parse({
      source: 'apprep-encrypted-backup',
      version: 1,
      kind: input.kind,
      exportedAt: input.exportedAt,
      algorithm: 'aes-256-gcm',
      ...encrypted,
      passwordRecipient: input.passwordKeyWrap,
      googleRecipient: input.googleRecipient ?? null,
    });
  }

  decryptSerializedPayload(input: {
    envelope: EncryptedBackupEnvelope;
    masterKey: string;
  }): string {
    const envelope = EncryptedBackupEnvelopeSchema.parse(input.envelope);

    try {
      return decryptWithKey({
        iv: envelope.iv,
        tag: envelope.tag,
        ciphertext: envelope.ciphertext,
        key: Buffer.from(assertMasterKey(input.masterKey), 'hex'),
      });
    } catch {
      throw new Error('Backup konnte nicht entschlüsselt werden.');
    }
  }

  decryptSerializedPayloadWithPassword(input: {
    envelope: EncryptedBackupEnvelope;
    password: string;
  }): string {
    const envelope = EncryptedBackupEnvelopeSchema.parse(input.envelope);
    const masterKey = this.unwrapPasswordKey({
      passwordKeyWrap: envelope.passwordRecipient,
      password: input.password,
    });

    return this.decryptSerializedPayload({ envelope, masterKey });
  }

  createGoogleRecoveryKeyEnvelope(
    masterKey: string,
  ): GoogleBackupRecoveryKeyEnvelope {
    return GoogleBackupRecoveryKeyEnvelopeSchema.parse({
      source: 'apprep-google-backup-recovery-key',
      version: 1,
      key: assertMasterKey(masterKey),
    });
  }

  readGoogleRecoveryMasterKey(serialized: string): string {
    try {
      return GoogleBackupRecoveryKeyEnvelopeSchema.parse(JSON.parse(serialized))
        .key;
    } catch {
      throw new Error('Google-Recovery-Key konnte nicht gelesen werden.');
    }
  }
}
