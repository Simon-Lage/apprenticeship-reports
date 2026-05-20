import { BackupEncryptionService } from '@/main/services/BackupEncryptionService';
import { EncryptedBackupEnvelopeSchema } from '@/shared/app/backup-encryption';

describe('backup encryption service', () => {
  it('decrypts payloads with the backup password without local state', () => {
    const service = new BackupEncryptionService();
    const masterKey = service.createMasterKey();
    const passwordKeyWrap = service.createPasswordKeyWrap({
      masterKey,
      password: 'CorrectHorse1',
    });
    const encrypted = service.encryptSerializedPayload({
      kind: 'reports',
      exportedAt: '2026-03-13T10:00:00.000Z',
      serializedPayload: JSON.stringify({
        reports: {
          weeks: [{ content: 'secret' }],
        },
      }),
      masterKey,
      passwordKeyWrap,
    });

    const parsedEncrypted = EncryptedBackupEnvelopeSchema.parse(encrypted);
    const decrypted = service.decryptSerializedPayloadWithPassword({
      envelope: parsedEncrypted,
      password: 'CorrectHorse1',
    });

    expect(JSON.stringify(parsedEncrypted)).not.toContain('secret');
    expect(decrypted).toContain('secret');
  });

  it('rejects payload decryption with a wrong password', () => {
    const service = new BackupEncryptionService();
    const masterKey = service.createMasterKey();
    const encrypted = service.encryptSerializedPayload({
      kind: 'settings',
      exportedAt: '2026-03-13T10:00:00.000Z',
      serializedPayload: '{"settings":{"secret":true}}',
      masterKey,
      passwordKeyWrap: service.createPasswordKeyWrap({
        masterKey,
        password: 'CorrectHorse1',
      }),
    });

    expect(() =>
      service.decryptSerializedPayloadWithPassword({
        envelope: encrypted,
        password: 'wrong-password',
      }),
    ).toThrow('Backup konnte mit diesem Passwort nicht entschlüsselt werden.');
  });
});
