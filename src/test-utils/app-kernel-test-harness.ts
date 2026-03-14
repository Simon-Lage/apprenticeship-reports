import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { z } from 'zod';

import { AppKernel } from '@/main/services/AppKernel';
import { AppMetadataRepository } from '@/main/services/AppMetadataRepository';
import { WeeklyReportHashService } from '@/main/services/WeeklyReportHashService';
import { PasswordAuthService } from '@/main/services/PasswordAuthService';
import { createDefaultAppMetadata } from '@/shared/app/state';
import { JsonObject, ensureJsonObject } from '@/shared/common/json';

export function useAppKernelTestHarness() {
  let rootDirectory: string;
  let currentTime = '2026-03-13T10:00:00.000Z';

  beforeEach(async () => {
    rootDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'apprenticeship-reports-'),
    );
  });

  afterEach(async () => {
    await fs.rm(rootDirectory, { recursive: true, force: true });
  });

  function setCurrentTime(nextTime: string) {
    currentTime = nextTime;
  }

  function getCurrentTime() {
    return currentTime;
  }

  function getRootDirectory() {
    return rootDirectory;
  }

  function createKernel(options?: {
    googleDriveService?: unknown;
    googleOAuthService?: unknown;
  }) {
    const repository = new AppMetadataRepository(
      path.join(rootDirectory, 'app-metadata.json'),
      () => currentTime,
    );

    const passwordAuthService = new PasswordAuthService(repository);
    const kernel = new AppKernel(repository, new WeeklyReportHashService(), {
      now: () => currentTime,
      driveScopes: ['scope:drive'],
      driveExplanation: 'Backups',
      settingsSchemaVersion: 1,
      onboardingSteps: [
        {
          id: 'profile',
          schema: z.object({
            firstName: z.string().min(1),
          }),
        },
        {
          id: 'notes',
          optional: true,
          schema: z.object({
            comment: z.string().min(1).optional(),
          }),
        },
      ],
      normalizeSettingsValues: (values) =>
        ensureJsonObject(
          z
            .object({
              backup: z
                .object({
                  enabled: z.boolean(),
                })
                .partial()
                .optional(),
            })
            .passthrough()
            .parse(values),
        ),
      passwordAuthService,
      googleDriveService: (options?.googleDriveService ?? null) as any,
      googleOAuthService: (options?.googleOAuthService ?? null) as any,
    });

    return {
      kernel,
      repository,
    };
  }

  async function signIn(
    kernel: AppKernel,
    grantedScopes: string[] = ['scope:drive'],
  ) {
    await ensurePasswordSetup(kernel);

    return kernel.saveGoogleSession({
      account: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User Example',
      },
      accessToken: 'drive-token',
      grantedScopes,
      rememberMe: true,
    });
  }

  async function ensurePasswordSetup(kernel: AppKernel) {
    const bootstrap = await kernel.getBootstrapState();

    if (bootstrap.auth.passwordConfigured) {
      return;
    }

    await kernel.initializePasswordAuth({
      password: 'CorrectHorse1',
      rememberMe: true,
    });
  }

  async function completeRequiredOnboarding(kernel: AppKernel) {
    await kernel.saveOnboardingDraft({
      stepId: 'profile',
      values: {
        firstName: 'Ada',
      },
    });
    await kernel.completeOnboardingStep('profile');
  }

  async function writeReportsFixture(
    repository: AppMetadataRepository,
    input: {
      weeklyReports: Array<{
        id: string;
        weekStart: string;
        weekEnd: string;
        updatedAt: string;
        values?: JsonObject;
        dailyReports: Array<{
          id: string;
          date: string;
          updatedAt: string;
          values?: JsonObject;
        }>;
      }>;
    },
  ) {
    const persistedState = await repository
      .read()
      .catch(() => createDefaultAppMetadata(currentTime));
    const state = createDefaultAppMetadata(currentTime);

    state.auth = persistedState.auth;
    state.drive = persistedState.drive;
    state.backup = persistedState.backup;
    state.recovery = persistedState.recovery;
    state.onboarding = persistedState.onboarding;
    state.settings = persistedState.settings;

    input.weeklyReports.forEach((weeklyReport) => {
      state.reports.weeklyReports[weeklyReport.id] = {
        id: weeklyReport.id,
        weekStart: weeklyReport.weekStart,
        weekEnd: weeklyReport.weekEnd,
        values: weeklyReport.values ?? {},
        dailyReportIds: weeklyReport.dailyReports.map(
          (dailyReport) => dailyReport.id,
        ),
        createdAt: weeklyReport.updatedAt,
        updatedAt: weeklyReport.updatedAt,
      };

      weeklyReport.dailyReports.forEach((dailyReport) => {
        state.reports.dailyReports[dailyReport.id] = {
          id: dailyReport.id,
          weeklyReportId: weeklyReport.id,
          date: dailyReport.date,
          values: dailyReport.values ?? {},
          createdAt: dailyReport.updatedAt,
          updatedAt: dailyReport.updatedAt,
        };
      });
    });

    await repository.write(state);
    return state;
  }

  return {
    setCurrentTime,
    getCurrentTime,
    getRootDirectory,
    createKernel,
    signIn,
    ensurePasswordSetup,
    completeRequiredOnboarding,
    writeReportsFixture,
  };
}
