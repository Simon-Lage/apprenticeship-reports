import { z } from 'zod';

export const BackupArchiveKindSchema = z.enum(['reports', 'settings']);

export const BackupEncryptionModeSchema = z.enum(['encrypted', 'plain']);

export const BackupPasswordKeyWrapSchema = z
  .object({
    kdf: z.literal('scrypt'),
    salt: z.string().min(1),
    iv: z.string().min(1),
    tag: z.string().min(1),
    ciphertext: z.string().min(1),
  })
  .strict();

export const EncryptedBackupGoogleRecipientSchema = z
  .object({
    accountId: z.string().min(1),
    email: z.string().email(),
    recoveryFileId: z.string().min(1),
    recoveryFileName: z.string().min(1),
  })
  .strict();

export const EncryptedBackupEnvelopeSchema = z
  .object({
    source: z.literal('apprep-encrypted-backup'),
    version: z.literal(1),
    kind: BackupArchiveKindSchema,
    exportedAt: z.string().datetime(),
    algorithm: z.literal('aes-256-gcm'),
    iv: z.string().min(1),
    tag: z.string().min(1),
    ciphertext: z.string().min(1),
    passwordRecipient: BackupPasswordKeyWrapSchema,
    googleRecipient:
      EncryptedBackupGoogleRecipientSchema.nullable().default(null),
  })
  .strict();

export const GoogleBackupRecoveryKeyEnvelopeSchema = z
  .object({
    source: z.literal('apprep-google-backup-recovery-key'),
    version: z.literal(1),
    key: z.string().regex(/^[a-f0-9]{64}$/i),
  })
  .strict();

export const BackupEncryptionStateSchema = z
  .object({
    version: z.literal(1).default(1),
    masterKey: z
      .string()
      .regex(/^[a-f0-9]{64}$/i)
      .nullable()
      .default(null),
    passwordKeyWrap: BackupPasswordKeyWrapSchema.nullable().default(null),
  })
  .default({
    version: 1,
    masterKey: null,
    passwordKeyWrap: null,
  });

export type BackupArchiveKind = z.infer<typeof BackupArchiveKindSchema>;
export type BackupEncryptionMode = z.infer<typeof BackupEncryptionModeSchema>;
export type BackupPasswordKeyWrap = z.infer<typeof BackupPasswordKeyWrapSchema>;
export type BackupEncryptionState = z.infer<typeof BackupEncryptionStateSchema>;
export type EncryptedBackupEnvelope = z.infer<
  typeof EncryptedBackupEnvelopeSchema
>;
export type EncryptedBackupGoogleRecipient = z.infer<
  typeof EncryptedBackupGoogleRecipientSchema
>;
export type GoogleBackupRecoveryKeyEnvelope = z.infer<
  typeof GoogleBackupRecoveryKeyEnvelopeSchema
>;

export function isEncryptedBackupEnvelope(value: unknown): boolean {
  return EncryptedBackupEnvelopeSchema.safeParse(value).success;
}
