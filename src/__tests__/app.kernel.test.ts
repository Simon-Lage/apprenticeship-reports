import { promises as fs } from 'fs';
import path from 'path';

import {
  mergeAbsenceSettings,
  parseAbsenceSettings,
} from '@/shared/absence/settings';
import { createDefaultAppMetadata } from '@/shared/app/state';
import { SettingsExportEnvelope } from '@/shared/settings/schema';
import { useAppKernelTestHarness } from '@/src/test-utils/app-kernel-test-harness';

describe('app kernel', () => {
  const {
    createKernel,
    signIn,
    ensurePasswordSetup,
    completeRequiredOnboarding,
    setCurrentTime,
    getRootDirectory,
  } = useAppKernelTestHarness();

  it('boots into a locked state before authentication', async () => {
    const { kernel } = createKernel();
    const bootstrap = await kernel.boot();

    expect(bootstrap.app.isLocked).toBe(true);
    expect(bootstrap.app.lockReasons).toContain('password-setup');
    expect(bootstrap.app.lockReasons).not.toContain('authentication');
    expect(bootstrap.database.status).toBe('locked');
  });

  it('enforces password-first onboarding before profile data can be written', async () => {
    const { kernel } = createKernel();
    await kernel.boot();

    await expect(
      kernel.saveOnboardingDraft({
        stepId: 'profile',
        values: {
          firstName: 'Ada',
        },
      }),
    ).rejects.toThrow('lokales Passwort');
  });

  it('creates a sqlite database and migrates legacy json metadata', async () => {
    const rootDirectory = getRootDirectory();
    const legacyFilePath = path.join(rootDirectory, 'app-metadata.json');
    const { kernel, repository } = createKernel();
    const legacyState = createDefaultAppMetadata('2026-03-13T10:00:00.000Z');

    legacyState.settings.current.values = {
      backup: {
        enabled: true,
      },
    };

    delete (legacyState as Partial<typeof legacyState>).ui;

    await fs.writeFile(
      legacyFilePath,
      JSON.stringify(legacyState, null, 2),
      'utf-8',
    );

    await kernel.initializePasswordAuth({
      password: 'CorrectHorse1',
      rememberMe: true,
    });

    const migratedState = await repository.read();
    const databaseStats = await fs.stat(repository.getDatabasePath());
    const databaseBytes = await fs.readFile(repository.getDatabasePath());

    expect(databaseStats.isFile()).toBe(true);
    expect(databaseBytes.includes(Buffer.from('app_metadata'))).toBe(false);
    expect(databaseBytes.includes(Buffer.from('"backup"'))).toBe(false);
    expect(migratedState.settings.current.values).toEqual({
      backup: {
        enabled: true,
      },
    });
    expect(migratedState.ui).toEqual({
      isFullScreen: false,
    });
  });

  it('persists a remembered session and drive consent', async () => {
    const { kernel } = createKernel();
    await kernel.boot();

    const bootstrap = await signIn(kernel);

    expect(bootstrap.auth.status).toBe('active');
    expect(bootstrap.drive.status).toBe('granted');
    expect(bootstrap.database.status).toBe('ready');
  });

  it('rejects google login with a different account than the linked account', async () => {
    const googleOAuthService = {
      isConfigured: jest.fn(() => true),
      authorize: jest.fn().mockResolvedValue({
        account: {
          id: 'other-user',
          email: 'other@example.com',
          displayName: 'Other Example',
        },
        accessToken: 'other-token',
        refreshToken: null,
        grantedScopes: ['profile'],
      }),
    };
    const { kernel } = createKernel({ googleOAuthService });
    await kernel.boot();
    await signIn(kernel);
    await kernel.signOut();

    await expect(
      kernel.authenticateWithGoogle({ rememberMe: true }),
    ).rejects.toThrow('nicht fuer diese lokale Datenbank');

    const bootstrap = await kernel.getBootstrapState();

    expect(bootstrap.auth.isAuthenticated).toBe(false);
    expect(bootstrap.drive.connectedAccountEmail).toBe('user@example.com');
  });

  it('allows google login with the linked account after sign out', async () => {
    const googleOAuthService = {
      isConfigured: jest.fn(() => true),
      authorize: jest.fn().mockResolvedValue({
        account: {
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'User Example',
        },
        accessToken: 'next-token',
        refreshToken: null,
        grantedScopes: ['profile'],
      }),
    };
    const { kernel } = createKernel({ googleOAuthService });
    await kernel.boot();
    await signIn(kernel);
    await kernel.signOut();

    const bootstrap = await kernel.authenticateWithGoogle({ rememberMe: true });

    expect(bootstrap.auth.isAuthenticated).toBe(true);
    expect(bootstrap.auth.provider).toBe('google');
    expect(bootstrap.drive.connectedAccountEmail).toBe('user@example.com');
  });

  it('blocks local data writes until the user is authenticated', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await ensurePasswordSetup(kernel);
    await kernel.savePasswordSession({
      account: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User Example',
      },
      rememberMe: false,
    });
    await kernel.clearGoogleSession();

    const { kernel: restartedKernel } = createKernel();
    await restartedKernel.boot();

    await expect(
      restartedKernel.setSettingsValues({
        backup: {
          enabled: true,
        },
      }),
    ).rejects.toThrow('gueltige Anmeldung');
  });

  it('does not block the app for drive permissions when no google account is linked', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await ensurePasswordSetup(kernel);
    await kernel.clearGoogleSession();
    const bootstrap = await kernel.savePasswordSession({
      account: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User Example',
      },
      rememberMe: true,
    });

    expect(bootstrap.drive.status).toBe('not-configured');
    expect(bootstrap.drive.connectedAccountEmail).toBeNull();
    expect(bootstrap.app.lockReasons).not.toContain('drive-permissions');
  });

  it('blocks local data writes until drive access is granted for a linked google account', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await ensurePasswordSetup(kernel);
    await kernel.saveGoogleSession({
      account: {
        id: 'google-user-1',
        email: 'google@example.com',
        displayName: 'Google Example',
      },
      rememberMe: true,
    });

    await expect(
      kernel.setSettingsValues({
        backup: {
          enabled: true,
        },
      }),
    ).rejects.toThrow('Google-Drive-Berechtigungen fehlen');
  });

  it('allows absence sync without drive permissions when authenticated', async () => {
    const openHolidaysService = {
      fetchYearCatalog: jest.fn().mockResolvedValue({
        publicHolidays: [],
        schoolHolidays: [],
      }),
    };
    const { kernel, repository } = createKernel();
    (kernel as any).openHolidaysService = openHolidaysService;
    await kernel.boot();
    await ensurePasswordSetup(kernel);
    await kernel.clearGoogleSession();
    await kernel.savePasswordSession({
      account: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User Example',
      },
      rememberMe: true,
    });

    const persistedState = await repository.read();
    persistedState.settings.current.values = {
      ...persistedState.settings.current.values,
      onboarding: {
        region: {
          subdivisionCode: 'DE-NW',
        },
      },
    };
    await repository.write(persistedState);

    await kernel.syncAbsenceCatalog();

    const nextState = await repository.read();
    const absenceSettings = parseAbsenceSettings(
      nextState.settings.current.values,
    );

    expect(openHolidaysService.fetchYearCatalog).toHaveBeenCalled();
    expect(absenceSettings.lastSyncedAt).not.toBeNull();
  });

  it('syncs all missing absence catalog years from report start until current year', async () => {
    const openHolidaysService = {
      fetchYearCatalog: jest.fn().mockImplementation(async ({ year }) => ({
        publicHolidays: [
          {
            id: `public-${year}-1`,
            startDate: `${year}-05-01`,
            endDate: `${year}-05-01`,
            name: 'Tag der Arbeit',
            names: [{ language: 'de', text: 'Tag der Arbeit' }],
            nationwide: true,
            subdivisionCodes: [],
          },
        ],
        schoolHolidays: [],
      })),
    };
    const { kernel, repository } = createKernel();
    (kernel as any).openHolidaysService = openHolidaysService;
    await kernel.boot();
    await ensurePasswordSetup(kernel);
    await kernel.clearGoogleSession();
    await kernel.savePasswordSession({
      account: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User Example',
      },
      rememberMe: true,
    });

    const persistedState = await repository.read();
    persistedState.settings.current.values = mergeAbsenceSettings(
      {
        ...persistedState.settings.current.values,
        onboarding: {
          region: {
            subdivisionCode: 'DE-NW',
          },
          'training-period': {
            trainingStart: '2024-08-01',
            trainingEnd: '2027-07-31',
            reportsSince: '2025-01-01',
          },
        },
      },
      parseAbsenceSettings(persistedState.settings.current.values),
    );
    await repository.write(persistedState);
    setCurrentTime('2026-04-08T10:00:00.000Z');

    await kernel.syncAbsenceCatalog();

    const nextState = await repository.read();
    const absenceSettings = parseAbsenceSettings(
      nextState.settings.current.values,
    );

    expect(openHolidaysService.fetchYearCatalog).toHaveBeenCalledTimes(2);
    expect(openHolidaysService.fetchYearCatalog).toHaveBeenNthCalledWith(1, {
      subdivisionCode: 'DE-NW',
      year: 2025,
    });
    expect(openHolidaysService.fetchYearCatalog).toHaveBeenNthCalledWith(2, {
      subdivisionCode: 'DE-NW',
      year: 2026,
    });
    expect(absenceSettings.catalogsByYear['2025']).toBeDefined();
    expect(absenceSettings.catalogsByYear['2026']).toBeDefined();
  });

  it('keeps previously synced years when syncing a new year', async () => {
    const openHolidaysService = {
      fetchYearCatalog: jest
        .fn()
        .mockImplementation(async ({ year, subdivisionCode }) => ({
          publicHolidays: [
            {
              id: `public-${year}-1`,
              startDate: `${year}-05-01`,
              endDate: `${year}-05-01`,
              name: `Feiertag ${year}`,
              names: [{ language: 'de', text: `Feiertag ${year}` }],
              nationwide: true,
              subdivisionCodes: [subdivisionCode],
            },
          ],
          schoolHolidays: [],
        })),
    };
    const { kernel, repository } = createKernel();
    (kernel as any).openHolidaysService = openHolidaysService;
    await kernel.boot();
    await ensurePasswordSetup(kernel);
    await kernel.clearGoogleSession();
    await kernel.savePasswordSession({
      account: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User Example',
      },
      rememberMe: true,
    });

    const persistedState = await repository.read();
    persistedState.settings.current.values = mergeAbsenceSettings(
      {
        ...persistedState.settings.current.values,
        onboarding: {
          region: {
            subdivisionCode: 'DE-NW',
          },
          'training-period': {
            trainingStart: '2024-08-01',
            trainingEnd: '2027-07-31',
            reportsSince: '2025-01-01',
          },
        },
      },
      {
        ...parseAbsenceSettings(persistedState.settings.current.values),
        subdivisionCode: 'DE-NW',
        catalogsByYear: {
          2025: {
            year: 2025,
            subdivisionCode: 'DE-NW',
            fetchedAt: '2025-12-31T10:00:00.000Z',
            publicHolidays: [
              {
                id: 'public-2025-existing',
                startDate: '2025-10-03',
                endDate: '2025-10-03',
                name: 'Tag der Deutschen Einheit',
                names: [{ language: 'de', text: 'Tag der Deutschen Einheit' }],
                nationwide: true,
                subdivisionCodes: [],
              },
            ],
            schoolHolidays: [],
          },
        },
      },
    );
    await repository.write(persistedState);
    setCurrentTime('2026-04-08T10:00:00.000Z');

    await kernel.syncAbsenceCatalog();

    const nextState = await repository.read();
    const absenceSettings = parseAbsenceSettings(
      nextState.settings.current.values,
    );

    expect(absenceSettings.catalogsByYear['2025']).toBeDefined();
    expect(absenceSettings.catalogsByYear['2026']).toBeDefined();
  });

  it('keeps absence sync blocked while unauthenticated', async () => {
    const openHolidaysService = {
      fetchYearCatalog: jest.fn().mockResolvedValue({
        publicHolidays: [],
        schoolHolidays: [],
      }),
    };
    const { kernel } = createKernel();
    (kernel as any).openHolidaysService = openHolidaysService;
    await kernel.boot();
    await ensurePasswordSetup(kernel);
    await kernel.savePasswordSession({
      account: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User Example',
      },
      rememberMe: false,
    });
    await kernel.clearGoogleSession();

    const { kernel: restartedKernel } = createKernel();
    (restartedKernel as any).openHolidaysService = openHolidaysService;
    await restartedKernel.boot();

    await expect(restartedKernel.syncAbsenceCatalog()).rejects.toThrow(
      'gueltige Anmeldung',
    );
  });

  it('does not queue an automatic absence sync prompt when auto sync is disabled', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await ensurePasswordSetup(kernel);

    const persistedState = await repository.read();
    const absenceSettings = parseAbsenceSettings(
      persistedState.settings.current.values,
    );

    persistedState.settings.current.values = mergeAbsenceSettings(
      {
        ...persistedState.settings.current.values,
        onboarding: {
          region: {
            subdivisionCode: 'DE-NW',
          },
        },
      },
      {
        ...absenceSettings,
        autoSyncHolidays: false,
      },
    );
    await repository.write(persistedState);

    const { kernel: restartedKernel } = createKernel();
    const bootstrap = await restartedKernel.boot();

    expect(bootstrap.absence.syncPending).toBe(false);
  });

  it('blocks app usage when only google auth exists but no local password is configured', async () => {
    const { kernel } = createKernel();
    await kernel.boot();

    await expect(
      kernel.saveGoogleSession({
        account: {
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'User Example',
        },
        accessToken: 'drive-token',
        grantedScopes: ['scope:drive'],
        rememberMe: true,
      }),
    ).rejects.toThrow('gesperrt');
  });

  it('blocks non-onboarding actions until required onboarding data is complete', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    await expect(
      kernel.setSettingsValues({
        backup: {
          enabled: true,
        },
      }),
    ).rejects.toThrow('Onboarding ist unvollstaendig');
  });

  it('reopens onboarding when a required onboarding value is missing after restart', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

    const stateBeforeRemoval = await kernel.getBootstrapState();

    expect(stateBeforeRemoval.onboarding.isComplete).toBe(true);
    expect(stateBeforeRemoval.app.lockReasons).not.toContain('onboarding');

    const persistedState = await repository.read();
    persistedState.settings.current.values = {};
    await repository.write(persistedState);

    const { kernel: restartedKernel } = createKernel();
    await restartedKernel.boot();
    const stateAfterRestart = await restartedKernel.getBootstrapState();

    expect(stateAfterRestart.onboarding.isComplete).toBe(false);
    expect(stateAfterRestart.onboarding.nextStepId).toBe('profile');
    expect(stateAfterRestart.onboarding.remainingStepIds).toContain('profile');
    expect(stateAfterRestart.app.lockReasons).toContain('onboarding');
  });

  it('treats prefilled required onboarding values as completed after authentication', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await ensurePasswordSetup(kernel);
    const persistedState = await repository.read();

    persistedState.settings.current.values = {
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
    };
    await repository.write(persistedState);

    const bootstrap = await signIn(kernel);

    expect(bootstrap.onboarding.isComplete).toBe(true);
    expect(bootstrap.app.lockReasons).not.toContain('onboarding');
  });

  it('clears stale drive consent when another account signs in', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel, ['scope:drive']);
    await kernel.clearGoogleSession();

    const bootstrap = await kernel.saveGoogleSession({
      account: {
        id: 'user-2',
        email: 'second@example.com',
        displayName: 'Second User',
      },
      rememberMe: true,
    });

    expect(bootstrap.drive.status).toBe('missing');
    expect(bootstrap.drive.missingScopes).toEqual(['scope:drive']);
    expect(bootstrap.drive.connectedAccountEmail).toBe('second@example.com');
  });

  it('signs out and locks the app until the next authentication', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    const bootstrap = await kernel.signOut();

    expect(bootstrap.auth.isAuthenticated).toBe(false);
    expect(bootstrap.auth.provider).toBeNull();
    expect(bootstrap.app.lockReasons).toContain('authentication');
  });

  it('keeps the user authenticated with password session after removing google', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    const bootstrap = await kernel.clearGoogleSession();

    expect(bootstrap.auth.status).toBe('active');
    expect(bootstrap.auth.provider).toBe('password');
    expect(bootstrap.drive.connectedAccountEmail).toBeNull();
  });

  it('keeps google drive linkage after sign out and password login', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    await kernel.signOut();

    const bootstrap = await kernel.authenticateWithPassword({
      password: 'CorrectHorse1',
      rememberMe: true,
    });

    expect(bootstrap.auth.provider).toBe('password');
    expect(bootstrap.drive.connectedAccountEmail).toBe('user@example.com');
  });

  it('stores a settings import preview and can cancel it', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

    await kernel.prepareSettingsImport(
      JSON.stringify({
        exportedAt: '2026-03-13T11:00:00.000Z',
        snapshot: {
          id: 'incoming',
          schemaVersion: 1,
          capturedAt: '2026-03-13T11:00:00.000Z',
          values: {
            backup: {
              enabled: true,
            },
          },
        },
      }),
    );

    const bootstrap = await kernel.cancelSettingsImport();

    expect(bootstrap.settings.pendingImport).toBe(false);
    expect(bootstrap.settings.pendingImportDifferenceCount).toBe(0);
  });

  it('rejects non-json settings imports with a hard error', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

    await expect(kernel.prepareSettingsImport('not-json')).rejects.toThrow(
      'Settings import expects valid JSON.',
    );
  });

  it('strips legacy secondary supervisor email from persisted settings values', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

    await kernel.setSettingsValues({
      appUi: {
        defaultDepartment: 'Abteilung',
        supervisorEmailPrimary: 'trainer@example.com',
        supervisorEmailSecondary: 'legacy@example.com',
      },
    });

    const snapshot = await kernel.getSettingsSnapshot();
    const appUi =
      typeof snapshot.values.appUi === 'object' && snapshot.values.appUi
        ? snapshot.values.appUi
        : {};

    expect(appUi).not.toHaveProperty('supervisorEmailSecondary');
    expect(appUi).toHaveProperty('supervisorEmailPrimary');
  });

  it('exports settings in the spec envelope shape', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await kernel.setSettingsValues({
      backup: {
        enabled: true,
      },
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
    });

    const envelope = (await kernel.exportSettings({
      encryptionMode: 'plain',
    })) as SettingsExportEnvelope;

    expect(typeof envelope.exportedAt).toBe('string');
    expect(envelope).toHaveProperty('settings');
    expect(envelope).not.toHaveProperty('snapshot');
    expect(envelope.settings).toEqual(
      expect.objectContaining({
        backup: {
          enabled: true,
        },
      }),
    );
  });

  it('exports settings with the selected backup scope', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await kernel.setSettingsValues({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
      appUi: {
        defaultDepartment: 'Lab',
      },
      absence: {
        autoSyncHolidays: true,
      },
    });

    const envelope = (await kernel.exportSettings({
      encryptionMode: 'plain',
      scope: {
        onboarding: false,
        ui: true,
        absence: false,
      },
    })) as SettingsExportEnvelope;

    expect(envelope.settings).toEqual({
      appUi: {
        defaultDepartment: 'Lab',
      },
    });
  });

  it('stores a settings import preview and applies it', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);

    const preview = await kernel.prepareSettingsImport(
      JSON.stringify({
        exportedAt: '2026-03-13T11:00:00.000Z',
        snapshot: {
          id: 'incoming',
          schemaVersion: 1,
          capturedAt: '2026-03-13T11:00:00.000Z',
          values: {
            backup: {
              enabled: true,
            },
          },
        },
      }),
    );

    const bootstrap = await kernel.applySettingsImport({
      previewId: preview.id,
    });

    expect(preview.differences.map((difference) => difference.path)).toContain(
      'backup',
    );
    expect(bootstrap.settings.pendingImport).toBe(false);
    expect(bootstrap.backup.hasUnsavedChanges).toBe(true);
  });

  it('keeps missing settings import areas unchanged', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await completeRequiredOnboarding(kernel);
    await kernel.setSettingsValues({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
      appUi: {
        defaultDepartment: 'Old Department',
      },
      absence: {
        autoSyncHolidays: true,
      },
    });

    const preview = await kernel.prepareSettingsImport(
      JSON.stringify({
        exportedAt: '2026-03-13T11:00:00.000Z',
        settings: {
          appUi: {
            defaultDepartment: 'New Department',
          },
        },
      }),
    );

    await kernel.applySettingsImport({
      previewId: preview.id,
    });

    const snapshot = await kernel.getSettingsSnapshot();

    expect(preview.importedAt).toBe('2026-03-13T11:00:00.000Z');
    expect(preview.affectedKeys).toEqual(['appUi']);
    expect(preview.incoming.values).toEqual(
      expect.objectContaining({
        appUi: {
          defaultDepartment: 'New Department',
        },
        absence: {
          autoSyncHolidays: true,
        },
      }),
    );
    expect(snapshot.values).toEqual(
      expect.objectContaining({
        appUi: {
          defaultDepartment: 'New Department',
        },
        absence: {
          autoSyncHolidays: true,
        },
      }),
    );
  });

  it('supports skipping an optional onboarding step', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);
    await kernel.saveOnboardingDraft({
      stepId: 'profile',
      values: {
        firstName: 'Ada',
      },
    });
    await kernel.completeOnboardingStep('profile');

    const bootstrap = await kernel.skipOnboardingStep('notes');

    expect(bootstrap.onboarding.skippedStepIds).toEqual(['notes']);
    expect(bootstrap.onboarding.isComplete).toBe(true);
  });

  it('validates onboarding drafts before saving them', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    await expect(
      kernel.saveOnboardingDraft({
        stepId: 'profile',
        values: {},
      }),
    ).rejects.toThrow();
  });

  it('mirrors onboarding drafts into settings values for later settings editing', async () => {
    const { kernel, repository } = createKernel();
    await kernel.boot();
    await signIn(kernel);

    await kernel.saveOnboardingDraft({
      stepId: 'profile',
      values: {
        firstName: 'Ada',
      },
    });

    const persistedState = await repository.read();

    expect(persistedState.settings.current.values).toEqual({
      onboarding: {
        profile: {
          firstName: 'Ada',
        },
      },
    });
  });

  it('initializes a local password and allows password login after a restart', async () => {
    const { kernel } = createKernel();
    await kernel.boot();

    const setupBootstrap = await kernel.initializePasswordAuth({
      password: 'CorrectHorse1',
      rememberMe: true,
    });

    expect(setupBootstrap.auth.passwordConfigured).toBe(true);
    expect(setupBootstrap.auth.provider).toBe('password');

    await kernel.clearGoogleSession();

    const { kernel: restartedKernel } = createKernel();
    await restartedKernel.boot();
    const bootstrap = await restartedKernel.authenticateWithPassword({
      password: 'CorrectHorse1',
      rememberMe: true,
    });

    expect(bootstrap.auth.status).toBe('active');
    expect(bootstrap.auth.passwordConfigured).toBe(true);
    expect(bootstrap.auth.provider).toBe('password');
  });

  it('rejects password login with an invalid secret', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await kernel.initializePasswordAuth({
      password: 'CorrectHorse1',
      rememberMe: true,
    });
    await kernel.clearGoogleSession();

    const { kernel: restartedKernel } = createKernel();
    await restartedKernel.boot();

    await expect(
      restartedKernel.authenticateWithPassword({
        password: 'WrongHorse1',
        rememberMe: true,
      }),
    ).rejects.toThrow('ungueltig');

    await expect(
      restartedKernel.authenticateWithPassword({
        password: 'short',
        rememberMe: true,
      }),
    ).rejects.toThrow('ungueltig');
  });

  it('changes the stored password and invalidates the previous secret', async () => {
    const { kernel } = createKernel();
    await kernel.boot();
    await kernel.initializePasswordAuth({
      password: 'CorrectHorse1',
      rememberMe: true,
    });

    const bootstrap = await kernel.changePassword({
      nextPassword: 'CorrectHorse2',
    });

    expect(bootstrap.auth.passwordConfigured).toBe(true);

    await kernel.clearGoogleSession();

    const { kernel: restartedKernel } = createKernel();
    await restartedKernel.boot();

    await expect(
      restartedKernel.authenticateWithPassword({
        password: 'CorrectHorse1',
        rememberMe: true,
      }),
    ).rejects.toThrow('ungueltig');

    const reloginBootstrap = await restartedKernel.authenticateWithPassword({
      password: 'CorrectHorse2',
      rememberMe: true,
    });

    expect(reloginBootstrap.auth.provider).toBe('password');
  });
});
