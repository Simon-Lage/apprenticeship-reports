import { promises as fs } from 'fs';
import path from 'path';

import {
  AppMetadata,
  AppMetadataSchema,
} from '@/shared/app/state';
import {
  AppMetadataSqliteStore,
  StoredPasswordCredential,
} from '@/main/services/AppMetadataSqliteStore';

export class AppMetadataRepository {
  private readonly recoveryDirectoryPath: string;

  private readonly store: AppMetadataSqliteStore;

  private queue: Promise<void> = Promise.resolve();

  constructor(filePath: string, now: () => string) {
    this.recoveryDirectoryPath = path.join(path.dirname(filePath), 'recovery');
    this.store = new AppMetadataSqliteStore(filePath, now);
  }

  getDatabasePath(): string {
    return this.store.getDatabasePath();
  }

  private getRecoveryFilePath(snapshotId: string): string {
    return path.join(this.recoveryDirectoryPath, `${snapshotId}.json`);
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const nextTask = this.queue.then(task, task);
    this.queue = nextTask.then(
      () => undefined,
      () => undefined,
    );
    return nextTask;
  }

  read(): Promise<AppMetadata> {
    return this.enqueue(() => this.store.read());
  }

  write(value: AppMetadata): Promise<AppMetadata> {
    return this.enqueue(() => this.store.write(value));
  }

  hasPasswordCredential(): Promise<boolean> {
    return this.enqueue(() => this.store.hasPasswordCredential());
  }

  readPasswordCredential(): Promise<StoredPasswordCredential | null> {
    return this.enqueue(() => this.store.readPasswordCredential());
  }

  writePasswordCredential(value: StoredPasswordCredential): Promise<StoredPasswordCredential> {
    return this.enqueue(() => this.store.writePasswordCredential(value));
  }

  update(
    updater: (currentState: AppMetadata) => AppMetadata | Promise<AppMetadata>,
  ): Promise<AppMetadata> {
    return this.enqueue(async () => {
      const currentState = await this.store.read();
      const nextState = await updater(currentState);
      return this.store.write(nextState);
    });
  }

  async writeRecoverySnapshot(
    snapshotId: string,
    value: AppMetadata,
  ): Promise<string> {
    const parsedValue = AppMetadataSchema.parse(value);
    const filePath = this.getRecoveryFilePath(snapshotId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(parsedValue, null, 2), 'utf-8');
    return filePath;
  }
}