import {
  createDatabaseBackupEnvelope,
  createDatabaseBackupImportPreview,
  createReportsStateFromDatabaseBackup,
  DatabaseBackupEnvelope,
  DatabaseBackupImportPreview,
  parseDatabaseBackupEnvelope,
} from '@/shared/app/backup-archive';
import { AppBootstrapState } from '@/shared/app/bootstrap';
import { AppMetadataSchema } from '@/shared/app/state';
import {
  markBackupDirty,
} from '@/shared/backup/policy';
import { JsonObject, JsonObjectSchema } from '@/shared/common/json';
import {
  ApplyBackupImportInput,
  ApplySettingsImportInput,
  SaveOnboardingDraftInput,
} from '@/shared/ipc/app-api';
import {
  completeOnboardingStep as completeValidatedOnboardingStep,
  saveOnboardingStepDraft as saveValidatedOnboardingStepDraft,
  skipOnboardingStep as skipValidatedOnboardingStep,
} from '@/shared/onboarding/progress';
import {
  BackupConflictStrategy,
  createWeekIdentity,
  mergeReportsState,
} from '@/shared/reports/models';
import {
  createSettingsExportEnvelope,
  createSettingsImportPreview,
  createSettingsSnapshot,
  parseSettingsImportEnvelope,
  SettingsExportEnvelope,
  SettingsImportPreview,
  SettingsSnapshot,
  SettingsSnapshotSchema,
} from '@/shared/settings/schema';
import { ReportsState, ReportsStateSchema } from '@/shared/reports/models';
import { AppKernelReports } from '@/main/services/AppKernelReports';
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

  async exportSettings(): Promise<SettingsExportEnvelope> {
    const exportedAt = this.now();
    let envelope: SettingsExportEnvelope | null = null;

    await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      envelope = createSettingsExportEnvelope(
        currentState.settings.current,
        exportedAt,
      );

      return AppMetadataSchema.parse({
        ...currentState,
        settings: {
          ...currentState.settings,
          lastExportedAt: exportedAt,
        },
      });
    });

    if (!envelope) {
      throw new Error('Settings export could not be created.');
    }

    return envelope;
  }

  async prepareSettingsImport(
    serialized: string,
  ): Promise<SettingsImportPreview> {
    const importedEnvelope = parseSettingsImportEnvelope(serialized);
    const normalizedIncomingSnapshot = createSettingsSnapshot({
      id: importedEnvelope.snapshot.id,
      schemaVersion: importedEnvelope.snapshot.schemaVersion,
      capturedAt: importedEnvelope.snapshot.capturedAt,
      values: this.parseSettingsValues(importedEnvelope.snapshot.values),
    });
    let preview: SettingsImportPreview | null = null;

    await this.repository.update((currentState) => {
      this.accessGuard.assertApplicationUnlocked(currentState);
      preview = createSettingsImportPreview({
        id: this.createImportPreviewId(this.now(), 'settings'),
        createdAt: this.now(),
        current: currentState.settings.current,
        incoming: normalizedIncomingSnapshot,
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
      const pendingImport = currentState.settings.pendingImport;

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

  async exportBackupArchive(): Promise<DatabaseBackupEnvelope> {
    const currentState = await this.repository.read();
    this.accessGuard.assertApplicationUnlocked(currentState);

    return createDatabaseBackupEnvelope(currentState.reports, this.now());
  }

  async prepareBackupImport(
    serialized: string,
  ): Promise<DatabaseBackupImportPreview> {
    const currentState = await this.repository.read();
    this.accessGuard.assertApplicationUnlocked(currentState);

    const envelope = parseDatabaseBackupEnvelope(serialized);
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
            serializedEnvelope: serialized,
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
      const pendingBackupImport = currentState.recovery.pendingBackupImport;

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
      const importedReports = createReportsStateFromDatabaseBackup(
        pendingEnvelope,
      );
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

    return this.buildBootstrapState(nextState);
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
