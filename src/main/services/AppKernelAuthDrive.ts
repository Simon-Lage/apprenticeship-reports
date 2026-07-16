import {
  createDatabaseBackupEnvelope,
  DatabaseBackupImportPreview,
} from '@/shared/app/backup-archive';
import {
  BackupArchiveKind,
  BackupEncryptionMode,
  EncryptedBackupGoogleRecipient,
} from '@/shared/app/backup-encryption';
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
import {
  DriveBackupFile,
  DriveBackupFolder,
  DriveBackupKind,
} from '@/shared/drive/backups';
import {
  BackupImportDecryptionInput,
  AuthenticateWithGoogleInput,
  AuthenticateWithPasswordInput,
  ChangePasswordInput,
  GrantDriveScopesInput,
  InitializePasswordAuthInput,
  PrepareDriveBackupImportInput,
  SaveGoogleSessionInput,
  SavePasswordSessionInput,
  SetDriveScopesInput,
  VerifyPasswordInput,
} from '@/shared/ipc/app-api';
import { parseBackupSettings } from '@/shared/backup/settings';
import { AppKernelCore } from '@/main/services/AppKernelCore';

export abstract class AppKernelAuthDrive extends AppKernelCore {
  protected abstract prepareBackupImport(
    serialized: string,
    decryption?: BackupImportDecryptionInput,
  ): Promise<DatabaseBackupImportPreview>;

  private async createGoogleRecoveryRecipient(input: {
    currentState: AppMetadata;
    masterKey: string;
  }): Promise<EncryptedBackupGoogleRecipient | null> {
    if (
      !input.currentState.drive.account ||
      !this.canAttemptDriveBackup(input.currentState)
    ) {
      return null;
    }

    const keyEnvelope =
      this.backupEncryptionService.createGoogleRecoveryKeyEnvelope(
        input.masterKey,
      );
    const result = await this.getGoogleDriveService().ensureBackupRecoveryKey({
      permissionState: input.currentState.drive,
      serializedKey: JSON.stringify(keyEnvelope),
    });

    await this.persistDriveAccessState({
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    });

    return {
      accountId: input.currentState.drive.account.id,
      email: input.currentState.drive.account.email,
      recoveryFileId: result.file.id,
      recoveryFileName: result.file.name,
    };
  }

  protected async serializeBackupPayload(input: {
    currentState: AppMetadata;
    kind: BackupArchiveKind;
    exportedAt: string;
    plainEnvelope: unknown;
    encryptionMode: BackupEncryptionMode;
    googleRecovery?: 'optional' | 'required' | 'disabled';
  }): Promise<{ serialized: string; encrypted: boolean }> {
    const serializedPayload = JSON.stringify(input.plainEnvelope);

    if (input.encryptionMode === 'plain') {
      return {
        serialized: serializedPayload,
        encrypted: false,
      };
    }

    const material = this.getBackupEncryptionMaterial(input.currentState);
    let googleRecipient: EncryptedBackupGoogleRecipient | null = null;

    if (input.googleRecovery !== 'disabled') {
      try {
        googleRecipient = await this.createGoogleRecoveryRecipient({
          currentState: input.currentState,
          masterKey: material.masterKey,
        });
      } catch (error) {
        if (input.googleRecovery === 'required') {
          throw error;
        }
      }
    }

    const envelope = this.backupEncryptionService.encryptSerializedPayload({
      kind: input.kind,
      exportedAt: input.exportedAt,
      serializedPayload,
      masterKey: material.masterKey,
      passwordKeyWrap: material.passwordKeyWrap,
      googleRecipient,
    });

    return {
      serialized: JSON.stringify(envelope),
      encrypted: true,
    };
  }

  protected async decryptBackupPayload(input: {
    serialized: string;
    expectedKind: BackupArchiveKind;
    decryption?: BackupImportDecryptionInput;
  }): Promise<string> {
    const encryptedEnvelope = this.parseEncryptedBackupEnvelope(
      input.serialized,
    );

    if (!encryptedEnvelope) {
      return input.serialized;
    }

    if (encryptedEnvelope.kind !== input.expectedKind) {
      throw new Error('Backup-Typ passt nicht zum gewählten Import.');
    }

    if (!input.decryption) {
      const currentState = await this.repository.read();
      this.accessGuard.assertApplicationUnlocked(currentState);
      const localMasterKey = currentState.backupEncryption.masterKey;

      if (localMasterKey) {
        try {
          return this.backupEncryptionService.decryptSerializedPayload({
            envelope: encryptedEnvelope,
            masterKey: localMasterKey,
          });
        } catch {
          // A backup from a different installation requires its password or Google recovery key.
        }
      }

      throw new Error(
        'APPREP_BACKUP_DECRYPTION_REQUIRED:Backup ist verschlüsselt.',
      );
    }

    if (input.decryption.method === 'password') {
      return this.backupEncryptionService.decryptSerializedPayloadWithPassword({
        envelope: encryptedEnvelope,
        password: input.decryption.password,
      });
    }

    if (!encryptedEnvelope.googleRecipient) {
      throw new Error('Dieses Backup enthält keine Google-Wiederherstellung.');
    }

    const currentState = await this.refreshDriveAccessState();
    const { account } = currentState.drive;

    if (
      !account ||
      account.id !== encryptedEnvelope.googleRecipient.accountId ||
      account.email !== encryptedEnvelope.googleRecipient.email
    ) {
      throw new Error(
        'Dieses Google-Konto passt nicht zur Backup-Wiederherstellung.',
      );
    }

    const result = await this.getGoogleDriveService().downloadBackupRecoveryKey(
      {
        permissionState: currentState.drive,
        fileId: encryptedEnvelope.googleRecipient.recoveryFileId,
      },
    );
    const masterKey = this.backupEncryptionService.readGoogleRecoveryMasterKey(
      result.serializedKey,
    );

    await this.persistDriveAccessState({
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    });

    return this.backupEncryptionService.decryptSerializedPayload({
      envelope: encryptedEnvelope,
      masterKey,
    });
  }

  private assertGoogleAccountCanAuthenticate(input: {
    currentState: AppMetadata;
    account: SaveGoogleSessionInput['account'];
  }) {
    const currentSession = this.getCurrentSession(input.currentState);

    if (currentSession || !this.passwordConfigured) {
      return;
    }

    const linkedGoogleAccount = input.currentState.drive.account;

    if (!linkedGoogleAccount) {
      throw new Error(
        'Google-Anmeldung ist erst nach einer verknuepften Google-Verbindung moeglich.',
      );
    }

    if (!this.hasSameUserAccount(linkedGoogleAccount, input.account)) {
      throw new Error(
        'Dieses Google-Konto ist nicht fuer diese lokale Datenbank hinterlegt.',
      );
    }
  }

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

  protected async executeDriveBackup(
    currentState?: AppMetadata,
    encryptionMode?: BackupEncryptionMode,
  ): Promise<{
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

    try {
      const envelope = createDatabaseBackupEnvelope(
        attemptedState.reports,
        attemptedAt,
      );
      const backupSettings = parseBackupSettings(
        attemptedState.settings.current.values,
      );
      const serializedBackup = await this.serializeBackupPayload({
        currentState: attemptedState,
        kind: 'reports',
        exportedAt: envelope.exportedAt,
        plainEnvelope: envelope,
        encryptionMode:
          encryptionMode ??
          (backupSettings.automaticBackupsEncrypted ? 'encrypted' : 'plain'),
        googleRecovery: 'required',
      });
      const result = await this.getGoogleDriveService().uploadBackup({
        permissionState: attemptedState.drive,
        exportedAt: envelope.exportedAt,
        serializedBackup: serializedBackup.serialized,
        encrypted: serializedBackup.encrypted,
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

    await this.repository.unlockWithRememberedKey();
    const currentState = await this.repository.read();

    if (!this.repository.isUnlocked()) {
      this.activeSession = null;
      this.launchBackupCheckPending = this.passwordConfigured;
      return this.buildBootstrapState(
        this.applyConfiguredDriveState(currentState),
      );
    }

    const nextState = await this.repository.update((storedState) => {
      const configuredState = this.applyConfiguredDriveState(storedState);
      const normalizedSettingsValues = this.parseSettingsValues(
        configuredState.settings.current.values,
      );
      this.activeSession = configuredState.auth.persistedSession;

      return AppMetadataSchema.parse({
        ...configuredState,
        backup: registerLaunchBackupCheck(configuredState.backup),
        settings: {
          ...configuredState.settings,
          current: {
            ...configuredState.settings.current,
            values: normalizedSettingsValues,
          },
        },
      });
    });
    this.launchBackupCheckPending = false;
    const absenceCheckedState = this.markAbsenceSyncPending(nextState);

    return this.buildBootstrapState(absenceCheckedState);
  }

  async processPendingLaunchBackup(): Promise<AppBootstrapState> {
    const currentState = await this.repository.read();
    const processedState = await this.tryProcessPendingBackup(currentState);

    return this.buildBootstrapState(processedState);
  }

  async getBootstrapState(): Promise<AppBootstrapState> {
    this.passwordConfigured = this.passwordAuthService
      ? await this.passwordAuthService.hasPassword()
      : false;
    const currentState = await this.repository.read();

    if (!this.repository.isUnlocked()) {
      this.activeSession = null;
    }

    return this.buildBootstrapState(currentState);
  }

  async syncAbsenceCatalog(): Promise<AppBootstrapState> {
    const currentState = await this.repository.read();
    this.accessGuard.assertOnboardingAccessible(currentState);
    const syncedState = await this.executeAbsenceCatalogSync(currentState);

    return this.buildBootstrapState(syncedState);
  }

  async initializePasswordAuth(
    input: InitializePasswordAuthInput,
  ): Promise<AppBootstrapState> {
    await this.getPasswordAuthService().initialize(input.password);
    this.passwordConfigured = true;
    const currentState = await this.repository.update((storedState) =>
      AppMetadataSchema.parse({
        ...storedState,
        backupEncryption: this.createBackupEncryptionState({
          password: input.password,
          masterKey: storedState.backupEncryption.masterKey,
        }),
      }),
    );

    return this.persistPasswordSession({
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
    const currentState = await this.repository.update((storedState) =>
      storedState.backupEncryption.masterKey &&
      storedState.backupEncryption.passwordKeyWrap
        ? storedState
        : AppMetadataSchema.parse({
            ...storedState,
            backupEncryption: this.createBackupEncryptionState({
              password: input.password,
            }),
          }),
    );

    return this.persistPasswordSession({
      account: this.createPasswordAccount(currentState),
      rememberMe: input.rememberMe,
    });
  }

  async verifyPassword(input: VerifyPasswordInput): Promise<boolean> {
    this.accessGuard.assertPasswordConfigured();
    const currentState = await this.repository.read();
    this.accessGuard.assertAuthenticated(currentState);

    return this.getPasswordAuthService().verify(input.password);
  }

  private isCurrentGoogleSession(currentState: AppMetadata): boolean {
    return (
      this.getCurrentSession(currentState)?.provider === 'google' &&
      Boolean(currentState.drive.account)
    );
  }

  async changePassword(input: ChangePasswordInput): Promise<AppBootstrapState> {
    const currentState = await this.repository.read();
    this.accessGuard.assertAuthenticated(currentState);
    const isGoogleAuthenticated = this.isCurrentGoogleSession(currentState);

    if (!isGoogleAuthenticated) {
      if (!input.currentPassword) {
        throw new Error('Aktuelles Passwort erforderlich.');
      }

      const isCurrentPasswordValid = await this.getPasswordAuthService().verify(
        input.currentPassword,
      );

      if (!isCurrentPasswordValid) {
        throw new Error('Das aktuelle Passwort ist ungueltig.');
      }
    }

    await this.getPasswordAuthService().changePassword({
      nextPassword: input.nextPassword,
    });
    await this.repository.update((storedState) =>
      AppMetadataSchema.parse({
        ...storedState,
        backupEncryption: this.createBackupEncryptionState({
          password: input.nextPassword,
          masterKey: storedState.backupEncryption.masterKey,
        }),
      }),
    );
    this.passwordConfigured = true;

    return this.getBootstrapState();
  }

  async authenticateWithGoogle(
    input: AuthenticateWithGoogleInput,
  ): Promise<AppBootstrapState> {
    const currentState = await this.repository.read();
    const result = await this.getGoogleOAuthService().authorize();

    this.assertGoogleAccountCanAuthenticate({
      currentState,
      account: result.account,
    });

    if (!this.repository.isUnlocked()) {
      const isUnlocked = await this.repository.unlockWithGoogle();

      if (!isUnlocked) {
        throw new Error(
          'Diese lokale Datenbank kann mit diesem Google-Konto nicht entsperrt werden.',
        );
      }
    }

    return this.persistGoogleSession({
      account: result.account,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken ?? undefined,
      grantedScopes: result.grantedScopes,
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

    this.repository.lock();

    return this.buildBootstrapState(nextState);
  }

  async connectGoogleDrive(): Promise<AppBootstrapState> {
    const currentState = await this.repository.read();
    this.accessGuard.assertAuthenticated(currentState);

    if (!this.driveScopes.length) {
      throw new Error('Google Drive Scopes sind nicht konfiguriert.');
    }

    const connectedAccount = currentState.drive.account;

    if (!connectedAccount) {
      throw new Error('Google-Login fehlt fuer die Drive-Verbindung.');
    }

    const result = await this.getGoogleOAuthService().authorize({
      scopes: this.driveScopes,
      loginHint: connectedAccount.email,
    });

    if (!this.hasSameUserAccount(connectedAccount, result.account)) {
      throw new Error(
        'Dieses Google-Konto ist nicht fuer diese lokale Datenbank hinterlegt.',
      );
    }

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

  async uploadBackupToDrive(
    input: {
      encryptionMode: BackupEncryptionMode;
    } = { encryptionMode: 'encrypted' },
  ): Promise<DriveBackupFile> {
    const result = await this.executeDriveBackup(
      undefined,
      input?.encryptionMode,
    );
    return result.file;
  }

  async listDriveBackups(): Promise<DriveBackupFile[]> {
    const currentState = await this.refreshDriveAccessState();
    const result = await this.getGoogleDriveService().listBackups(
      currentState.drive,
      'reports',
    );

    await this.persistDriveAccessState({
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    });

    return result.files;
  }

  async listDriveSettingsBackups(): Promise<DriveBackupFile[]> {
    const currentState = await this.refreshDriveAccessState();
    const result = await this.getGoogleDriveService().listBackups(
      currentState.drive,
      'settings',
    );

    await this.persistDriveAccessState({
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    });

    return result.files;
  }

  async getDriveBackupFolder(
    kind: DriveBackupKind,
  ): Promise<DriveBackupFolder> {
    const currentState = await this.refreshDriveAccessState();
    const result = await this.getGoogleDriveService().getBackupFolder(
      currentState.drive,
      kind,
    );

    await this.persistDriveAccessState({
      accessToken: result.accessToken,
      grantedScopes: result.grantedScopes,
    });

    return result.folder;
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

    return this.prepareBackupImport(result.serializedBackup, input.decryption);
  }

  async savePasswordSession(
    input: SavePasswordSessionInput,
  ): Promise<AppBootstrapState> {
    this.accessGuard.assertPasswordConfigured();
    const currentState = await this.repository.read();

    if (!this.repository.isUnlocked()) {
      throw new Error('Die lokale Datenbank ist gesperrt.');
    }

    this.accessGuard.assertAuthenticated(currentState);

    return this.persistPasswordSession(input);
  }

  private async persistPasswordSession(
    input: SavePasswordSessionInput,
  ): Promise<AppBootstrapState> {
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
    const checkedState = await this.applyPendingLaunchBackupCheck(nextState);
    const processedState = await this.tryProcessPendingBackup(checkedState);

    return this.buildBootstrapState(processedState);
  }

  private async applyPendingLaunchBackupCheck(
    currentState: AppMetadata,
  ): Promise<AppMetadata> {
    if (!this.launchBackupCheckPending) {
      return currentState;
    }

    const nextState = await this.repository.update((storedState) =>
      AppMetadataSchema.parse({
        ...storedState,
        backup: registerLaunchBackupCheck(storedState.backup),
      }),
    );

    this.launchBackupCheckPending = false;
    return nextState;
  }

  async saveGoogleSession(
    input: SaveGoogleSessionInput,
  ): Promise<AppBootstrapState> {
    const storedState = await this.repository.read();

    if (!this.repository.isUnlocked()) {
      throw new Error('Die lokale Datenbank ist gesperrt.');
    }

    this.accessGuard.assertAuthenticated(storedState);

    this.assertGoogleAccountCanAuthenticate({
      currentState: storedState,
      account: input.account,
    });

    return this.persistGoogleSession(input);
  }

  private async persistGoogleSession(
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
      const isSameAccount =
        this.hasSameAccount(currentSession, nextSession) ||
        this.hasSameUserAccount(
          configuredState.drive.account,
          nextSession.account,
        );
      const baseDriveState = isSameAccount
        ? configuredState.drive
        : this.createDisconnectedDriveState(configuredState);
      const hasNewDriveCredentials = Boolean(
        input.accessToken || input.refreshToken || grantedScopes.length,
      );
      const nextDriveState = {
        ...baseDriveState,
        account: nextSession.account,
        accessToken: input.accessToken ?? baseDriveState.accessToken,
        refreshToken: input.refreshToken ?? baseDriveState.refreshToken,
        connectedAt: baseDriveState.connectedAt ?? now,
        lastValidatedAt: hasNewDriveCredentials
          ? now
          : baseDriveState.lastValidatedAt,
        grantedScopes: Array.from(
          new Set([...baseDriveState.grantedScopes, ...grantedScopes]),
        ).sort((left, right) => left.localeCompare(right)),
        lastPromptedAt: null,
      };

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
    const checkedState = await this.applyPendingLaunchBackupCheck(nextState);
    const processedState = await this.tryProcessPendingBackup(checkedState);

    return this.buildBootstrapState(processedState);
  }

  async clearGoogleSession(): Promise<AppBootstrapState> {
    this.accessGuard.assertPasswordConfigured();
    const currentState = await this.repository.read();
    this.accessGuard.assertAuthenticated(currentState);
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

      if (
        currentState.drive.account &&
        !this.hasSameUserAccount(currentState.drive.account, input.account)
      ) {
        throw new Error(
          'Dieses Google-Konto ist nicht fuer diese lokale Datenbank hinterlegt.',
        );
      }

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
