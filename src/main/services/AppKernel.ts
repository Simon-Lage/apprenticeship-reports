import {
  createDatabaseBackupEnvelope,
  createDatabaseBackupImportPreview,
  createReportsStateFromDatabaseBackup,
  DatabaseBackupEnvelope,
  DatabaseBackupImportPreview,
  parseDatabaseBackupEnvelope,
} from '@/shared/app/backup-archive';
import { EncryptedBackupEnvelope } from '@/shared/app/backup-encryption';
import { AppBootstrapState } from '@/shared/app/bootstrap';
import { AppMetadataSchema } from '@/shared/app/state';
import { markBackupDirty } from '@/shared/backup/policy';
import { JsonObject, JsonObjectSchema } from '@/shared/common/json';
import {
  ApplyBackupImportInput,
  BackupImportDecryptionInput,
  ExportBackupArchiveInput,
  ExportSettingsInput,
  ApplySettingsImportInput,
  PrepareDriveBackupImportInput,
  SaveOnboardingDraftInput,
} from '@/shared/ipc/app-api';
import { DriveBackupFile } from '@/shared/drive/backups';
import {
  completeOnboardingStep as completeValidatedOnboardingStep,
  saveOnboardingStepDraft as saveValidatedOnboardingStepDraft,
  skipOnboardingStep as skipValidatedOnboardingStep,
} from '@/shared/onboarding/progress';
import {
  BackupConflictStrategy,
  createWeekIdentity,
  mergeReportsState,
  ReportsState,
  ReportsStateSchema,
} from '@/shared/reports/models';
import {
  createSettingsExportEnvelope,
  createSettingsImportPreview,
  createSettingsSnapshot,
  mergeSettingsImportValues,
  parseSettingsImportEnvelope,
  SettingsExportEnvelope,
  SettingsImportPreview,
  SettingsSnapshot,
  SettingsSnapshotSchema,
} from '@/shared/settings/schema';
import AppKernelReports from '@/main/services/AppKernelReports';
import { AppKernelOptions } from '@/main/services/AppKernelCore';
import { AppMetadataRepository } from '@/main/services/AppMetadataRepository';
import { WeeklyReportHashService } from '@/main/services/WeeklyReportHashService';

export type { AppKernelOptions };

export class AppKernel extends AppKernelReports {
  constructor(
    repository: AppMetadataRepository,
    weeklyReportHashService: WeeklyReportHashService,
    options: AppKernelOptions = {},
  ) {
    super(repository, weeklyReportHashService, options);
  }

  async getIsFullScreen(): Promise<boolean> {
    const currentState = await this.repository.read();
    return currentState.ui.isFullScreen;
  }

  async setIsFullScreen(enabled: boolean): Promise<void> {
    await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        ui: {
          ...currentState.ui,
          isFullScreen: enabled,
        },
      }),
    );
  }

  async getSettingsSnapshot(): Promise<SettingsSnapshot> {
    const currentState = await this.repository.read();
    this.accessGuard.assertOnboardingAccessible(currentState);

    return SettingsSnapshotSchema.parse(currentState.settings.current);
  }

  async getReportsState(): Promise<ReportsState> {
    const currentState = await this.repository.read();
    this.accessGuard.assertApplicationUnlocked(currentState);

    return ReportsStateSchema.parse(currentState.reports);
  }

  private async createSerializedSettingsExport(
    input: ExportSettingsInput,
    googleRecovery: 'optional' | 'required' | 'disabled',
  ): Promise<{
    envelope: SettingsExportEnvelope;
    serialized: {
      serialized: string;
      encrypted: boolean;
    };
  }> {
    const exportedAt = this.now();
    const currentState = await this.repository.read();

    this.accessGuard.assertApplicationUnlocked(currentState);

    const envelope = createSettingsExportEnvelope(
      currentState.settings.current,
      exportedAt,
      input.scope,
    );
    const serialized = await this.serializeBackupPayload({
      currentState,
      kind: 'settings',
      exportedAt,
      plainEnvelope: envelope,
      encryptionMode: input.encryptionMode ?? 'encrypted',
      googleRecovery,
    });

    await this.repository.update((storedState) =>
      AppMetadataSchema.parse({
        ...storedState,
        settings: {
          ...storedState.settings,
          lastExportedAt: exportedAt,
        },
      }),
    );

    return {
      envelope,
      serialized,
    };
  }

  async exportSettings(
    input: ExportSettingsInput = { encryptionMode: 'encrypted' },
  ): Promise<SettingsExportEnvelope | EncryptedBackupEnvelope> {
    const { envelope, serialized } = await this.createSerializedSettingsExport(
      input,
      'optional',
    );

    return serialized.encrypted
      ? (JSON.parse(serialized.serialized) as EncryptedBackupEnvelope)
      : envelope;
  }

  async uploadSettingsBackupToDrive(
    input: ExportSettingsInput = { encryptionMode: 'encrypted' },
  ): Promise<DriveBackupFile> {
    const { envelope, serialized } = await this.createSerializedSettingsExport(
      input,
      'required',
    );
    const currentState = await this.refreshDriveAccessState();
    const result = await this.getGoogleDriveService().uploadBackup({
      permissionState: currentState.drive,
      exportedAt: envelope.exportedAt,
      serializedBackup: serialized.serialized,
      kind: 'settings',
      encrypted: serialized.encrypted,
    });

    await this.persistDriveAccessState({
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    });

    return result.file;
  }

  async prepareSettingsImport(
    serialized: string,
    decryption?: BackupImportDecryptionInput,
  ): Promise<SettingsImportPreview> {
    const decryptedSerialized = await this.decryptBackupPayload({
      serialized,
      expectedKind: 'settings',
      decryption,
    });
    const importedEnvelope = parseSettingsImportEnvelope(decryptedSerialized);
    const normalizedIncomingValues = this.parseSettingsValues(
      importedEnvelope.settings,
    );
    const affectedKeys = Object.keys(normalizedIncomingValues).sort(
      (left, right) => left.localeCompare(right),
    );

    if (!affectedKeys.length) {
      throw new Error('Settings import contains no settings areas.');
    }

    let preview: SettingsImportPreview | null = null;

    await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      const mergedIncomingValues = mergeSettingsImportValues({
        currentValues: currentState.settings.current.values,
        incomingValues: normalizedIncomingValues,
      });
      const normalizedIncomingSnapshot = createSettingsSnapshot({
        id: `imported-settings-${importedEnvelope.exportedAt.replace(/[^0-9]/g, '')}`,
        schemaVersion: this.settingsSchemaVersion,
        capturedAt: importedEnvelope.exportedAt,
        values: mergedIncomingValues,
      });

      preview = createSettingsImportPreview({
        id: this.createImportPreviewId(this.now(), 'settings'),
        createdAt: this.now(),
        importedAt: importedEnvelope.exportedAt,
        affectedKeys,
        current: currentState.settings.current,
        incoming: normalizedIncomingSnapshot,
        warning: `Settings-Import vom ${importedEnvelope.exportedAt}. Überschrieben werden nur vorhandene Bereiche: ${affectedKeys.join(', ')}.`,
      });

      return AppMetadataSchema.parse({
        ...currentState,
        settings: {
          ...currentState.settings,
          pendingImport: preview,
        },
      });
    });

    if (!preview) {
      throw new Error('Settings import preview could not be created.');
    }

    return preview;
  }

  async prepareDriveSettingsImport(
    input: PrepareDriveBackupImportInput,
  ): Promise<SettingsImportPreview> {
    const currentState = await this.refreshDriveAccessState();
    const result = await this.getGoogleDriveService().downloadBackup({
      permissionState: currentState.drive,
      fileId: input.fileId,
    });

    await this.persistDriveAccessState({
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    });

    return this.prepareSettingsImport(
      result.serializedBackup,
      input.decryption,
    );
  }

  async cancelSettingsImport(): Promise<AppBootstrapState> {
    const nextState = await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        settings: {
          ...currentState.settings,
          pendingImport: null,
        },
      }),
    );

    return this.buildBootstrapState(nextState);
  }

  async applySettingsImport(
    input: ApplySettingsImportInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      const { pendingImport } = currentState.settings;

      if (!pendingImport || pendingImport.id !== input.previewId) {
        throw new Error('Unknown settings import preview.');
      }

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        settings: {
          ...currentState.settings,
          current: createSettingsSnapshot({
            id: this.getSettingsSnapshotId(currentState),
            schemaVersion: pendingImport.incoming.schemaVersion,
            capturedAt: now,
            values: pendingImport.incoming.values,
          }),
          pendingImport: null,
        },
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async exportBackupArchive(
    input: ExportBackupArchiveInput = { encryptionMode: 'encrypted' },
  ): Promise<DatabaseBackupEnvelope | EncryptedBackupEnvelope> {
    const currentState = await this.repository.read();
    this.accessGuard.assertApplicationUnlocked(currentState);
    const envelope = createDatabaseBackupEnvelope(
      currentState.reports,
      this.now(),
    );
    const serialized = await this.serializeBackupPayload({
      currentState,
      kind: 'reports',
      exportedAt: envelope.exportedAt,
      plainEnvelope: envelope,
      encryptionMode: input.encryptionMode ?? 'encrypted',
      googleRecovery: 'optional',
    });

    return serialized.encrypted
      ? (JSON.parse(serialized.serialized) as EncryptedBackupEnvelope)
      : envelope;
  }

  async prepareBackupImport(
    serialized: string,
    decryption?: BackupImportDecryptionInput,
  ): Promise<DatabaseBackupImportPreview> {
    const currentState = await this.repository.read();
    this.accessGuard.assertApplicationUnlocked(currentState);

    const decryptedSerialized = await this.decryptBackupPayload({
      serialized,
      expectedKind: 'reports',
      decryption,
    });
    const envelope = parseDatabaseBackupEnvelope(decryptedSerialized);
    const incomingReports = createReportsStateFromDatabaseBackup(envelope);
    const now = this.now();
    const preview = createDatabaseBackupImportPreview({
      id: this.createImportPreviewId(now, 'backup'),
      createdAt: now,
      currentReports: currentState.reports,
      incomingReports,
    });

    await this.repository.update((storedState) =>
      AppMetadataSchema.parse({
        ...storedState,
        recovery: {
          ...storedState.recovery,
          pendingBackupImport: {
            id: preview.id,
            createdAt: preview.createdAt,
            serializedEnvelope: decryptedSerialized,
          },
        },
      }),
    );

    return preview;
  }

  async cancelBackupImport(): Promise<AppBootstrapState> {
    const nextState = await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        recovery: {
          ...currentState.recovery,
          pendingBackupImport: null,
        },
      }),
    );

    return this.buildBootstrapState(nextState);
  }

  async applyBackupImport(
    input: ApplyBackupImportInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const recoverySnapshotId = this.createRecoverySnapshotId(now);
    const nextState = await this.repository.update(async (currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      const { pendingBackupImport } = currentState.recovery;

      if (!pendingBackupImport || pendingBackupImport.id !== input.previewId) {
        throw new Error('Unknown backup import preview.');
      }

      const pendingEnvelope = parseDatabaseBackupEnvelope(
        pendingBackupImport.serializedEnvelope,
      );
      const recoverySnapshotPath = await this.repository.writeRecoverySnapshot(
        recoverySnapshotId,
        currentState,
      );
      const importedReports =
        createReportsStateFromDatabaseBackup(pendingEnvelope);
      const mergedReports = mergeReportsState({
        currentState: currentState.reports,
        incomingState: importedReports,
        strategy: input.conflictStrategy,
        weekConflictStrategies: (input.weekConflictResolutions ?? []).reduce<
          Record<string, BackupConflictStrategy>
        >((result, resolution) => {
          result[createWeekIdentity(resolution.weekStart, resolution.weekEnd)] =
            resolution.strategy;
          return result;
        }, {}),
      });

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        recovery: {
          pendingBackupImport: null,
          lastRecoverySnapshotPath: recoverySnapshotPath,
          lastRestoredAt: now,
        },
        reports: mergedReports,
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async setSettingsValues(values: JsonObject): Promise<AppBootstrapState> {
    const now = this.now();
    const parsedValues = this.parseSettingsValues(values);
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        settings: {
          ...currentState.settings,
          current: createSettingsSnapshot({
            id: this.getSettingsSnapshotId(currentState),
            schemaVersion: this.settingsSchemaVersion,
            capturedAt: now,
            values: parsedValues,
          }),
        },
      });
    });

    const syncCheckedState = this.markAbsenceSyncPending(nextState);

    return this.buildBootstrapState(syncCheckedState);
  }

  async dismissAbsenceSync(): Promise<AppBootstrapState> {
    this.dismissAbsenceSyncPending();
    const currentState = await this.repository.read();

    return this.buildBootstrapState(currentState);
  }

  async triggerAbsenceSyncPrompt(): Promise<AppBootstrapState> {
    this.triggerAbsenceSyncPending();
    const currentState = await this.repository.read();

    return this.buildBootstrapState(currentState);
  }

  async saveOnboardingDraft(
    input: SaveOnboardingDraftInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertOnboardingAccessible(currentState);
      this.onboardingResolver.assertStepIsKnown(input.stepId);
      const onboarding = this.onboardingSteps.length
        ? saveValidatedOnboardingStepDraft(
            this.onboardingSteps,
            currentState.onboarding,
            input.stepId,
            input.values,
            now,
          )
        : AppMetadataSchema.shape.onboarding.parse({
            ...currentState.onboarding,
            drafts: {
              ...currentState.onboarding.drafts,
              [input.stepId]: JsonObjectSchema.parse(input.values),
            },
            lastActiveStepId: input.stepId,
            updatedAt: now,
          });
      const draftValues =
        onboarding.drafts[input.stepId] ?? JsonObjectSchema.parse(input.values);
      const nextSettingsValues = this.mergeOnboardingDraftIntoSettings(
        currentState.settings.current.values,
        input.stepId,
        draftValues,
      );

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        onboarding,
        settings: {
          ...currentState.settings,
          current: createSettingsSnapshot({
            id: this.getSettingsSnapshotId(currentState),
            schemaVersion: currentState.settings.current.schemaVersion,
            capturedAt: now,
            values: nextSettingsValues,
          }),
        },
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async completeOnboardingStep(stepId: string): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertOnboardingAccessible(currentState);
      this.onboardingResolver.assertStepIsKnown(stepId);
      const onboarding = this.onboardingSteps.length
        ? completeValidatedOnboardingStep(
            this.onboardingSteps,
            currentState.onboarding,
            stepId,
            now,
          )
        : AppMetadataSchema.shape.onboarding.parse({
            ...currentState.onboarding,
            completedStepIds: Array.from(
              new Set([...currentState.onboarding.completedStepIds, stepId]),
            ),
            lastActiveStepId: stepId,
            updatedAt: now,
          });

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        onboarding,
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async skipOnboardingStep(stepId: string): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertOnboardingAccessible(currentState);
      this.onboardingResolver.assertStepIsKnown(stepId);
      const onboarding = this.onboardingSteps.length
        ? skipValidatedOnboardingStep(
            this.onboardingSteps,
            currentState.onboarding,
            stepId,
            now,
          )
        : (() => {
            throw new Error(
              'Optional onboarding steps require explicit definitions.',
            );
          })();

      return AppMetadataSchema.parse({
        ...currentState,
        backup: markBackupDirty(currentState.backup),
        onboarding,
      });
    });

    return this.buildBootstrapState(nextState);
  }
}
