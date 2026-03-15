import {
  createDatabaseBackupEnvelope,
  DatabaseBackupImportPreview,
} from '@/shared/app/backup-archive';
import { AppBootstrapState } from '@/shared/app/bootstrap';
import { AppMetadata, AppMetadataSchema } from '@/shared/app/state';
import {
  createGoogleSession,
  createPasswordSession,
  getPersistedGoogleSession,
} from '@/shared/auth/session';
import {
  registerBackupAttempt,
  registerBackupFailure,
  registerBackupSuccess,
  registerLaunchBackupCheck,
} from '@/shared/backup/policy';
import { DriveBackupFile } from '@/shared/drive/backups';
import {
  AuthenticateWithGoogleInput,
  AuthenticateWithPasswordInput,
  ChangePasswordInput,
  GrantDriveScopesInput,
  InitializePasswordAuthInput,
  PrepareDriveBackupImportInput,
  SaveGoogleSessionInput,
  SavePasswordSessionInput,
  SetDriveScopesInput,
} from '@/shared/ipc/app-api';
import { AppKernelCore } from '@/main/services/AppKernelCore';

export abstract class AppKernelAuthDrive extends AppKernelCore {
  protected abstract prepareBackupImport(
    serialized: string,
  ): Promise<DatabaseBackupImportPreview>;

  protected async persistDriveAccessState(input: {
    accessToken: string;
    grantedScopes: string[];
  }): Promise<void> {
    const now = this.now();

    await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        drive: {
          ...currentState.drive,
          accessToken: input.accessToken,
          grantedScopes: input.grantedScopes.length
            ? input.grantedScopes
            : currentState.drive.grantedScopes,
          lastValidatedAt: now,
        },
      }),
    );
  }

  protected async refreshDriveAccessState(
    currentState?: AppMetadata,
  ): Promise<AppMetadata> {
    const resolvedState = currentState ?? (await this.repository.read());
    this.accessGuard.assertDatabaseUnlocked(resolvedState);
    const connection = await this.getGoogleDriveService().authorizeConnection(
      resolvedState.drive,
    );

    if (
      connection.accessToken === resolvedState.drive.accessToken &&
      JSON.stringify(connection.grantedScopes) ===
        JSON.stringify(resolvedState.drive.grantedScopes)
    ) {
      return resolvedState;
    }

    const now = this.now();

    return this.repository.update((storedState) =>
      AppMetadataSchema.parse({
        ...storedState,
        drive: {
          ...storedState.drive,
          accessToken: connection.accessToken,
          grantedScopes: connection.grantedScopes.length
            ? connection.grantedScopes
            : storedState.drive.grantedScopes,
          lastValidatedAt: now,
        },
      }),
    );
  }

  protected async executeDriveBackup(currentState?: AppMetadata): Promise<{
    file: DriveBackupFile;
    state: AppMetadata;
  }> {
    await this.refreshDriveAccessState(currentState);
    const attemptedAt = this.now();
    const attemptedState = await this.repository.update((storedState) =>
      AppMetadataSchema.parse({
        ...storedState,
        backup: registerBackupAttempt(storedState.backup, attemptedAt),
      }),
    );
    const envelope = createDatabaseBackupEnvelope(
      attemptedState.reports,
      attemptedAt,
    );

    try {
      const result = await this.getGoogleDriveService().uploadBackup({
        permissionState: attemptedState.drive,
        exportedAt: envelope.exportedAt,
        serializedBackup: JSON.stringify(envelope),
      });
      const succeededAt = this.now();
      const nextState = await this.repository.update((storedState) =>
        AppMetadataSchema.parse({
          ...storedState,
          drive: {
            ...storedState.drive,
            accessToken: result.accessToken,
            grantedScopes: result.grantedScopes.length
              ? result.grantedScopes
              : storedState.drive.grantedScopes,
            lastValidatedAt: succeededAt,
          },
          backup: registerBackupSuccess(storedState.backup, succeededAt),
        }),
      );

      return {
        file: result.file,
        state: nextState,
      };
    } catch (error) {
      const failedAt = this.now();
      await this.repository.update((storedState) =>
        AppMetadataSchema.parse({
          ...storedState,
          backup: registerBackupFailure(storedState.backup, failedAt),
        }),
      );
      throw error;
    }
  }

  protected async tryProcessPendingBackup(
    currentState?: AppMetadata,
  ): Promise<AppMetadata> {
    const resolvedState = currentState ?? (await this.repository.read());

    if (
      !resolvedState.backup.pendingReasons.length ||
      !this.canAttemptDriveBackup(resolvedState)
    ) {
      return resolvedState;
    }

    try {
      const result = await this.executeDriveBackup(resolvedState);
      return result.state;
    } catch {
      return this.repository.read();
    }
  }

  async boot(): Promise<AppBootstrapState> {
    this.passwordConfigured = this.passwordAuthService
      ? await this.passwordAuthService.hasPassword()
      : false;
    const nextState = await this.repository.update((currentState) => {
      const configuredState = this.applyConfiguredDriveState(currentState);
      this.activeSession = configuredState.auth.persistedSession;

      return AppMetadataSchema.parse({
        ...configuredState,
        backup: registerLaunchBackupCheck(configuredState.backup),
      });
    });
    const absenceSyncedState = await this.trySyncAbsenceCatalog(nextState);
    const processedState =
      await this.tryProcessPendingBackup(absenceSyncedState);

    return this.buildBootstrapState(processedState);
  }

  async getBootstrapState(): Promise<AppBootstrapState> {
    this.passwordConfigured = this.passwordAuthService
      ? await this.passwordAuthService.hasPassword()
      : false;
    const currentState = await this.repository.read();
    return this.buildBootstrapState(currentState);
  }

  async syncAbsenceCatalog(force = true): Promise<AppBootstrapState> {
    const currentState = await this.repository.read();
    this.accessGuard.assertOnboardingAccessible(currentState);
    const syncedState = await this.trySyncAbsenceCatalog(currentState, force);

    return this.buildBootstrapState(syncedState);
  }

  async initializePasswordAuth(
    input: InitializePasswordAuthInput,
  ): Promise<AppBootstrapState> {
    await this.getPasswordAuthService().initialize(input.password);
    this.passwordConfigured = true;
    const currentState = await this.repository.read();

    return this.savePasswordSession({
      account: this.createPasswordAccount(currentState),
      rememberMe: input.rememberMe,
    });
  }

  async authenticateWithPassword(
    input: AuthenticateWithPasswordInput,
  ): Promise<AppBootstrapState> {
    const isValid = await this.getPasswordAuthService().verify(input.password);

    if (!isValid) {
      throw new Error('Das Passwort ist ungueltig.');
    }

    this.passwordConfigured = true;
    const currentState = await this.repository.read();

    return this.savePasswordSession({
      account: this.createPasswordAccount(currentState),
      rememberMe: input.rememberMe,
    });
  }

  async changePassword(input: ChangePasswordInput): Promise<AppBootstrapState> {
    await this.getPasswordAuthService().changePassword({
      nextPassword: input.nextPassword,
    });
    this.passwordConfigured = true;

    return this.getBootstrapState();
  }

  async authenticateWithGoogle(
    input: AuthenticateWithGoogleInput,
  ): Promise<AppBootstrapState> {
    const result = await this.getGoogleOAuthService().authorize();

    return this.saveGoogleSession({
      account: result.account,
      rememberMe: input.rememberMe,
    });
  }

  async signOut(): Promise<AppBootstrapState> {
    this.activeSession = null;

    const nextState = await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...this.applyConfiguredDriveState(currentState),
        auth: {
          persistedSession: null,
        },
        recovery: {
          ...currentState.recovery,
          pendingBackupImport: null,
        },
      }),
    );

    return this.buildBootstrapState(nextState);
  }

  async connectGoogleDrive(): Promise<AppBootstrapState> {
    const currentState = await this.repository.read();
    this.accessGuard.assertAuthenticated(currentState);

    if (!this.driveScopes.length) {
      throw new Error('Google Drive Scopes sind nicht konfiguriert.');
    }

    const currentSession = this.getCurrentSession(currentState);

    if (!currentSession) {
      throw new Error('Google-Login fehlt fuer die Drive-Verbindung.');
    }

    const result = await this.getGoogleOAuthService().authorize({
      scopes: this.driveScopes,
      loginHint: currentSession.account.email,
    });
    await this.grantDriveScopes({
      account: result.account,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken ?? undefined,
      grantedScopes: result.grantedScopes,
    });
    const processedState = await this.tryProcessPendingBackup(
      await this.repository.read(),
    );

    return this.buildBootstrapState(processedState);
  }

  async uploadBackupToDrive(): Promise<DriveBackupFile> {
    const result = await this.executeDriveBackup();
    return result.file;
  }

  async listDriveBackups(): Promise<DriveBackupFile[]> {
    const currentState = await this.refreshDriveAccessState();
    const result = await this.getGoogleDriveService().listBackups(
      currentState.drive,
    );

    await this.persistDriveAccessState({
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    });

    return result.files;
  }

  async prepareDriveBackupImport(
    input: PrepareDriveBackupImportInput,
  ): Promise<DatabaseBackupImportPreview> {
    const currentState = await this.refreshDriveAccessState();
    const result = await this.getGoogleDriveService().downloadBackup({
      permissionState: currentState.drive,
      fileId: input.fileId,
    });

    await this.persistDriveAccessState({
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    });

    return this.prepareBackupImport(result.serializedBackup);
  }

  async savePasswordSession(
    input: SavePasswordSessionInput,
  ): Promise<AppBootstrapState> {
    this.accessGuard.assertPasswordConfigured();
    const now = this.now();
    const nextSession = createPasswordSession(input, now);
    this.activeSession = nextSession;

    const nextState = await this.repository.update((currentState) => {
      const configuredState = this.applyConfiguredDriveState(currentState);

      return AppMetadataSchema.parse({
        ...configuredState,
        auth: {
          persistedSession: getPersistedGoogleSession(nextSession),
        },
        recovery: {
          ...configuredState.recovery,
          pendingBackupImport: configuredState.recovery.pendingBackupImport,
        },
        drive: configuredState.drive,
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async saveGoogleSession(
    input: SaveGoogleSessionInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextSession = createGoogleSession(input, now);
    const grantedScopes = input.grantedScopes ?? [];
    const previousSession = this.activeSession;
    this.activeSession = nextSession;

    const nextState = await this.repository.update((currentState) => {
      const configuredState = this.applyConfiguredDriveState(currentState);
      const currentSession =
        previousSession ?? configuredState.auth.persistedSession;
      const isSameAccount = this.hasSameAccount(currentSession, nextSession);
      const baseDriveState = isSameAccount
        ? configuredState.drive
        : this.createDisconnectedDriveState(configuredState);
      const nextDriveState =
        input.accessToken || input.refreshToken || grantedScopes.length
          ? {
              ...baseDriveState,
              account: nextSession.account,
              accessToken: input.accessToken ?? baseDriveState.accessToken,
              refreshToken: input.refreshToken ?? baseDriveState.refreshToken,
              connectedAt: baseDriveState.connectedAt ?? now,
              lastValidatedAt: now,
              grantedScopes: Array.from(
                new Set([...baseDriveState.grantedScopes, ...grantedScopes]),
              ).sort((left, right) => left.localeCompare(right)),
              lastPromptedAt: null,
            }
          : baseDriveState;

      return AppMetadataSchema.parse({
        ...configuredState,
        auth: {
          persistedSession: getPersistedGoogleSession(nextSession),
        },
        recovery: {
          ...configuredState.recovery,
          pendingBackupImport: isSameAccount
            ? configuredState.recovery.pendingBackupImport
            : null,
        },
        drive: nextDriveState,
      });
    });

    return this.buildBootstrapState(nextState);
  }

  async clearGoogleSession(): Promise<AppBootstrapState> {
    this.accessGuard.assertPasswordConfigured();
    const currentState = await this.repository.read();
    const now = this.now();
    const currentSession = this.getCurrentSession(currentState);
    const fallbackSession = createPasswordSession(
      {
        account: this.createPasswordAccount(currentState),
        rememberMe: currentSession?.rememberMe ?? true,
      },
      now,
    );
    this.activeSession = fallbackSession;

    const nextState = await this.repository.update((storedState) =>
      AppMetadataSchema.parse({
        ...this.applyConfiguredDriveState(storedState),
        auth: {
          persistedSession: getPersistedGoogleSession(fallbackSession),
        },
        recovery: {
          ...storedState.recovery,
          pendingBackupImport: null,
        },
        drive: this.createDisconnectedDriveState(storedState),
      }),
    );

    return this.buildBootstrapState(nextState);
  }

  async setDriveScopes(input: SetDriveScopesInput): Promise<AppBootstrapState> {
    const nextState = await this.repository.update((currentState) =>
      AppMetadataSchema.parse({
        ...currentState,
        drive: {
          ...currentState.drive,
          requiredScopes: input.requiredScopes,
          explanation: input.explanation ?? currentState.drive.explanation,
        },
      }),
    );

    return this.buildBootstrapState(nextState);
  }

  async grantDriveScopes(
    input: GrantDriveScopesInput,
  ): Promise<AppBootstrapState> {
    const now = this.now();
    const nextState = await this.repository.update((currentState) => {
      this.accessGuard.assertAuthenticated(currentState);

      return AppMetadataSchema.parse({
        ...this.applyConfiguredDriveState(currentState),
        drive: {
          ...currentState.drive,
          requiredScopes: this.driveScopes,
          account: input.account,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken ?? currentState.drive.refreshToken,
          connectedAt: currentState.drive.connectedAt ?? now,
          lastValidatedAt: now,
          grantedScopes: Array.from(
            new Set([
              ...currentState.drive.grantedScopes,
              ...input.grantedScopes,
            ]),
          ).sort((left, right) => left.localeCompare(right)),
          lastPromptedAt: now,
          explanation: this.driveExplanation,
        },
      });
    });

    return this.buildBootstrapState(nextState);
  }
}
