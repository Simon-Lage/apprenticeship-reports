import path from 'path';
import { stat } from 'node:fs/promises';
import { app, BrowserWindow, dialog, nativeTheme, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

import registerAppHandlers from '@/main/ipc/registerAppHandlers';
import loadEnvLocal from '@/main/load-env-local';
import { resolveHtmlPath } from '@/main/utils';
import { AppKernel } from '@/main/services/AppKernel';
import { AppMetadataRepository } from '@/main/services/AppMetadataRepository';
import { GoogleDriveService } from '@/main/services/GoogleDriveService';
import { GoogleOAuthService } from '@/main/services/GoogleOAuthService';
import { WeeklyReportHashService } from '@/main/services/WeeklyReportHashService';
import { PasswordAuthService } from '@/main/services/PasswordAuthService';
import { DesktopFileDialogService } from '@/main/services/DesktopFileDialogService';
import { ElectronSecretStorageService } from '@/main/services/SecretStorageService';
import { preparePersistentUserDataPath } from '@/main/persistent-user-data-path';
import OpenHolidaysService from '@/main/services/OpenHolidaysService';
import deTranslation from '@/renderer/i18n/translations/de';
import type {
  AppBuildInfo,
  AppUpdateCheckResult,
  AppUpdateCheckStatus,
  RendererErrorInput,
} from '@/shared/ipc/app-api';
import { AppIpcChannel } from '@/shared/ipc/app-api';
import defaultOnboardingSteps from '@/shared/onboarding/default-steps';

const updateFeedUrl =
  'https://github.com/Simon-Lage/apprenticeship-reports/releases/latest/download';

class AppUpdater {
  private readonly updateChecksEnabled: boolean;

  private isDownloading = false;

  constructor(private readonly mainWindow: BrowserWindow) {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = true;
    autoUpdater.disableDifferentialDownload = true;
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: updateFeedUrl,
    });
    this.updateChecksEnabled = app.isPackaged;

    autoUpdater.on('download-progress', () => {
      if (this.isDownloading) {
        return;
      }

      this.isDownloading = true;
      this.sendUpdateStatus('update-downloading');
    });

    autoUpdater.on('update-downloaded', async () => {
      this.isDownloading = false;
      this.sendUpdateStatus('update-downloaded');
      const dialogTranslations = deTranslation.mainDialogs.updateReady;
      const result = await dialog.showMessageBox(this.mainWindow, {
        type: 'question',
        title: dialogTranslations.title,
        message: dialogTranslations.message,
        detail: dialogTranslations.detail,
        buttons: [dialogTranslations.installNow, dialogTranslations.later],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });

      if (result.response === 0) {
        autoUpdater.quitAndInstall(true, true);
      }
    });

    if (this.updateChecksEnabled) {
      this.checkForUpdates().catch((error) => {
        log.error('Automatic update check failed', error);
      });
    }
  }

  async checkForUpdates(): Promise<AppUpdateCheckResult> {
    if (!this.updateChecksEnabled) {
      return {
        started: false,
        unavailableReason: 'not-packaged',
      };
    }

    const status = await new Promise<AppUpdateCheckStatus>((resolve) => {
      const cleanup = () => {
        autoUpdater.off('update-available', handleUpdateAvailable);
        autoUpdater.off('update-not-available', handleUpdateNotAvailable);
        autoUpdater.off('error', handleError);
      };
      const settle = (nextStatus: AppUpdateCheckStatus) => {
        cleanup();
        resolve(nextStatus);
      };
      const handleUpdateAvailable = () => {
        this.sendUpdateStatus('update-available');
        settle('update-available');
      };
      const handleUpdateNotAvailable = () => {
        settle('update-not-available');
      };
      const handleError = (error: Error) => {
        log.error('Update check failed', error);
        settle('error');
      };

      autoUpdater.once('update-available', handleUpdateAvailable);
      autoUpdater.once('update-not-available', handleUpdateNotAvailable);
      autoUpdater.once('error', handleError);

      autoUpdater.checkForUpdates().catch(handleError);
    });

    return {
      started: true,
      status,
    };
  }

  private sendUpdateStatus(status: AppUpdateCheckStatus): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(
        AppIpcChannel.onUpdateCheckStatus,
        status,
      );
    }
  }
}

let mainWindow: BrowserWindow | null = null;
let appKernel: AppKernel | null = null;
let appUpdater: AppUpdater | null = null;
let isQuittingAfterBackupRegistration = false;
let isAppDirty = false;
let isRestartingAfterRendererError = false;

loadEnvLocal([
  path.join(process.cwd(), '.env.local'),
  path.join(app.getAppPath(), '.env.local'),
  path.join(app.getAppPath(), '..', '.env.local'),
  path.join(process.resourcesPath, '.env.local'),
  path.join(path.dirname(process.execPath), '.env.local'),
]);

if (process.env.NODE_ENV === 'production') {
  require('source-map-support').install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (process.env.NODE_ENV === 'development') {
  app.setPath('userData', path.join(process.cwd(), '.dev-data', 'user-data'));
} else {
  app.setPath(
    'userData',
    preparePersistentUserDataPath(app.getPath('appData')),
  );
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (isDebug) {
  require('electron-debug').default();
}

async function installExtensions(): Promise<void> {
  const installer = require('electron-devtools-installer');
  const forceDownload = Boolean(process.env.UPGRADE_EXTENSIONS);
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  await installer
    .default(
      extensions.map((name: string) => installer[name]),
      forceDownload,
    )
    .catch((error: unknown) => {
      log.error('Devtools extension installation failed', error);
    });
}

function getConfiguredDriveScopes(): string[] {
  const rawValue = process.env.GOOGLE_DRIVE_REQUIRED_SCOPES?.trim() ?? '';
  if (!rawValue) {
    return ['https://www.googleapis.com/auth/drive.file'];
  }

  return rawValue
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function createAppKernel(): AppKernel {
  const secretStorageService = new ElectronSecretStorageService();
  const repository = new AppMetadataRepository(
    path.join(app.getPath('userData'), 'app-metadata.json'),
    () => new Date().toISOString(),
    secretStorageService,
  );
  const googleOAuthService = new GoogleOAuthService({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? null,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? null,
    openExternal: (url) => shell.openExternal(url),
  });
  const googleDriveService = new GoogleDriveService({
    oauthService: googleOAuthService,
  });
  const passwordAuthService = new PasswordAuthService(repository);
  const openHolidaysService = new OpenHolidaysService();

  return new AppKernel(repository, new WeeklyReportHashService(), {
    driveScopes: getConfiguredDriveScopes(),
    driveExplanation:
      'Die Google-Drive-Berechtigung wird für regelmässige Backups benötigt.',
    onboardingSteps: defaultOnboardingSteps,
    passwordAuthService,
    googleOAuthService,
    googleDriveService,
    openHolidaysService,
    secretStorageService,
  });
}

async function resolveAppUpdatedAt(): Promise<string | null> {
  const targetPath = app.isPackaged ? app.getPath('exe') : app.getAppPath();

  try {
    const fileStat = await stat(targetPath);
    return fileStat.mtime.toISOString();
  } catch (error) {
    log.warn('Unable to read app timestamp for home footer', error);
    return null;
  }
}

async function getAppBuildInfo(): Promise<AppBuildInfo> {
  return {
    version: app.getVersion(),
    updatedAt: await resolveAppUpdatedAt(),
  };
}

async function checkForUpdates(): Promise<AppUpdateCheckResult> {
  if (!appUpdater) {
    return {
      started: false,
      unavailableReason: 'updater-not-ready',
    };
  }

  return appUpdater.checkForUpdates();
}

function handleRendererError(input: RendererErrorInput): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (input.restartApp && isRestartingAfterRendererError) {
    return;
  }

  log.error('Renderer error', {
    source: input.source,
    route: input.route,
    url: input.url,
    message: input.message,
    stack: input.stack,
    componentStack: input.componentStack,
    restartApp: input.restartApp,
  });

  if (!input.restartApp) {
    return;
  }

  isRestartingAfterRendererError = true;
  isAppDirty = false;
  isQuittingAfterBackupRegistration = true;

  setTimeout(() => {
    app.relaunch();
    app.exit(1);
  }, 100);
}

async function createWindow(): Promise<void> {
  if (isDebug) {
    await installExtensions();
  }

  nativeTheme.themeSource = 'light';

  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string =>
    path.join(resourcesPath, ...paths);

  mainWindow = new BrowserWindow({
    show: false,
    width: 1500,
    height: 870,
    minWidth: 1500,
    minHeight: 870,
    fullscreen: appKernel ? await appKernel.getIsFullScreen() : false,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('Main window is not available.');
    }

    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
      return;
    }

    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (isAppDirty && mainWindow) {
      const dialogTranslations =
        deTranslation.mainDialogs.closeWithUnsavedChanges;
      const result = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        title: dialogTranslations.title,
        message: dialogTranslations.message,
        detail: dialogTranslations.detail,
        buttons: [dialogTranslations.quitAnyway, dialogTranslations.cancel],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
      });

      if (result === 1) {
        event.preventDefault();
      } else {
        isAppDirty = false;
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    appUpdater = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.key !== 'F11') {
      return;
    }

    if (!mainWindow) {
      return;
    }

    event.preventDefault();
    const nextValue = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(nextValue);

    if (appKernel) {
      appKernel.setIsFullScreen(nextValue).catch((error) => {
        log.error('Failed to persist fullscreen state', error);
      });
    }
  });
  appUpdater = new AppUpdater(mainWindow);
}

function focusMainWindow(): void {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();
}

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', focusMainWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', async (event) => {
    if (!appKernel || isQuittingAfterBackupRegistration) {
      return;
    }

    event.preventDefault();
    isQuittingAfterBackupRegistration = true;

    try {
      await appKernel.handleAppClose();
    } catch (error) {
      log.error('App close backup registration failed', error);
    } finally {
      app.quit();
    }
  });

  app
    .whenReady()
    .then(async () => {
      appKernel = createAppKernel();
      const desktopFileDialogService = new DesktopFileDialogService(
        () => mainWindow,
      );
      registerAppHandlers(
        appKernel,
        desktopFileDialogService,
        () => mainWindow,
        (isDirty) => {
          isAppDirty = isDirty;
        },
        getAppBuildInfo,
        checkForUpdates,
        handleRendererError,
      );
      await appKernel.boot();
      await createWindow();
      appKernel.processPendingLaunchBackup().catch((error) => {
        log.error('Launch backup processing failed', error);
      });

      app.on('activate', async () => {
        if (mainWindow === null) {
          await createWindow();
        }
      });

      return undefined;
    })
    .catch((error: unknown) => {
      log.error('App startup failed', error);
    });
}
