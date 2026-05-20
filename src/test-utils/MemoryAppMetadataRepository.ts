import { promises as fs } from 'fs';
import path from 'path';

import { AppMetadataRepository } from '@/main/services/AppMetadataRepository';
import { SecretStorageService } from '@/main/services/SecretStorageService';
import {
  AppMetadata,
  AppMetadataSchema,
  createDefaultAppMetadata,
} from '@/shared/app/state';

type MemoryCredential = Parameters<
  AppMetadataRepository['initializePassword']
>[1];

type MemoryStore = {
  state: AppMetadata | null;
  credential: MemoryCredential | null;
};

const memoryStores = new Map<string, MemoryStore>();

export class MemoryAppMetadataRepository extends AppMetadataRepository {
  private readonly memoryStore: MemoryStore;

  private unlocked = false;

  private readonly memoryDatabasePath: string;

  private readonly memoryRecoveryDirectoryPath: string;

  private readonly getNow: () => string;

  constructor(
    filePath: string,
    now: () => string,
    secretStorage: SecretStorageService | null = null,
  ) {
    super(filePath, now, secretStorage);
    this.memoryDatabasePath = filePath.replace(/\.json$/i, '.memory.sqlite');
    this.memoryRecoveryDirectoryPath = path.join(
      path.dirname(filePath),
      'recovery',
    );
    this.getNow = now;
    this.memoryStore = memoryStores.get(filePath) ?? {
      state: null,
      credential: null,
    };
    memoryStores.set(filePath, this.memoryStore);
  }

  getDatabasePath(): string {
    return this.memoryDatabasePath;
  }

  private cloneState(value: AppMetadata): AppMetadata {
    return AppMetadataSchema.parse(JSON.parse(JSON.stringify(value)));
  }

  private getState(): AppMetadata {
    if (!this.memoryStore.state) {
      this.memoryStore.state = createDefaultAppMetadata(this.getNow());
    }

    return this.cloneState(this.memoryStore.state);
  }

  read(): Promise<AppMetadata> {
    return Promise.resolve(this.getState());
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  lock(): void {
    this.unlocked = false;
  }

  unlockWithRememberedKey(): Promise<boolean> {
    const canUnlock = Boolean(
      this.memoryStore.credential &&
        this.memoryStore.state?.auth.persistedSession?.rememberMe,
    );
    this.unlocked = canUnlock;

    return Promise.resolve(canUnlock);
  }

  unlockWithPassword(): Promise<boolean> {
    const canUnlock = Boolean(this.memoryStore.credential);
    this.unlocked = canUnlock;

    return Promise.resolve(canUnlock);
  }

  unlockWithGoogle(): Promise<boolean> {
    const canUnlock = Boolean(
      this.memoryStore.credential && this.memoryStore.state?.drive.account,
    );
    this.unlocked = canUnlock;

    return Promise.resolve(canUnlock);
  }

  initializePassword(
    _password: string,
    credential: Parameters<AppMetadataRepository['initializePassword']>[1],
  ): Promise<void> {
    this.memoryStore.credential = credential;
    this.unlocked = true;
    this.memoryStore.state =
      this.memoryStore.state ?? createDefaultAppMetadata(this.getNow());

    return Promise.resolve();
  }

  changePassword(
    _password: string,
    credential: Parameters<AppMetadataRepository['changePassword']>[1],
  ): Promise<void> {
    this.memoryStore.credential = credential;
    this.unlocked = true;

    return Promise.resolve();
  }

  write(value: AppMetadata): Promise<AppMetadata> {
    this.memoryStore.state = this.cloneState(value);

    return Promise.resolve(this.getState());
  }

  hasPasswordCredential(): Promise<boolean> {
    return Promise.resolve(Boolean(this.memoryStore.credential));
  }

  readPasswordCredential(): Promise<
    Parameters<AppMetadataRepository['initializePassword']>[1] | null
  > {
    return Promise.resolve(
      this.memoryStore.credential ? { ...this.memoryStore.credential } : null,
    );
  }

  writePasswordCredential(
    value: Parameters<AppMetadataRepository['writePasswordCredential']>[0],
  ): Promise<Parameters<AppMetadataRepository['writePasswordCredential']>[0]> {
    this.memoryStore.credential = value;

    return Promise.resolve({ ...value });
  }

  async update(
    updater: (currentState: AppMetadata) => AppMetadata | Promise<AppMetadata>,
  ): Promise<AppMetadata> {
    const nextState = await updater(this.getState());
    this.memoryStore.state = this.cloneState(nextState);

    return this.getState();
  }

  async writeRecoverySnapshot(
    snapshotId: string,
    value: AppMetadata,
  ): Promise<string> {
    const parsedValue = AppMetadataSchema.parse(value);
    const filePath = path.join(
      this.memoryRecoveryDirectoryPath,
      `${snapshotId}.json`,
    );
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(parsedValue, null, 2), 'utf-8');

    return filePath;
  }
}
