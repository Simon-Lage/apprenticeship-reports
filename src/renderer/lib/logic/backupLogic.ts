import { LogicClient } from './client';

export class BackupLogic {
  constructor(private readonly client: LogicClient) {}

  async exportLocalEncrypted() {
    return this.client.call('backup', 'exportLocalEncrypted');
  }

  async exportGoogleDriveEncrypted() {
    return this.client.call('backup', 'exportGoogleDriveEncrypted');
  }

  async importEncryptedBackup() {
    return this.client.call('backup', 'importEncryptedBackup');
  }
}

