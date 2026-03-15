import path from 'path';
import { app, BrowserWindow, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

import { registerAppHandlers } from '@/main/ipc/registerAppHandlers';
import { resolveHtmlPath } from '@/main/utils';
import { AppKernel } from '@/main/services/AppKernel';
import { AppMetadataRepository } from '@/main/services/AppMetadataRepository';
import { GoogleDriveService } from '@/main/services/GoogleDriveService';
import { GoogleOAuthService } from '@/main/services/GoogleOAuthService';
import { WeeklyReportHashService } from '@/main/services/WeeklyReportHashService';
import { PasswordAuthService } from '@/main/services/PasswordAuthService';
import { DesktopFileDialogService } from '@/main/services/DesktopFileDialogService';
import OpenHolidaysService from '@/main/services/OpenHolidaysService';
import defaultOnboardingSteps from '@/shared/onboarding/default-steps';

class AppUpdater {
  constructor(mainWindow: BrowserWindow) {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-downloaded', async () => {
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Update bereit',
        message: 'Ein Update wurde heruntergeladen.',
        detail:
          'Jetzt neu starten und installieren? Wenn du später wählst, wird das Update automatisch beim Beenden installiert.',
        buttons: ['Jetzt installieren', 'Später'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });

      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });

    if (app.isPackaged) {
      autoUpdater.checkForUpdates();
    }
  }
}

let mainWindow: BrowserWindow | null = null;
let appKernel: AppKernel | null = null;
let isQuittingAfterBackupRegistration = false;

if (process.env.NODE_ENV === 'production') {
  require('source-map-support').install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (process.env.NODE_ENV === 'development') {
  app.setPath('userData', path.join(process.cwd(), '.dev-data', 'user-data'));
}

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
    .catch(console.log);
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
  const repository = new AppMetadataRepository(
    path.join(app.getPath('userData'), 'app-metadata.json'),
    () => new Date().toISOString(),
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
  });
}

async function createWindow(): Promise<void> {
  if (isDebug) {
    await installExtensions();
  }

  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string =>
    path.join(resourcesPath, ...paths);

  mainWindow = new BrowserWindow({
    show: false,
    width: 1240,
    height: 860,
    minWidth: 1100,
    minHeight: 760,
    fullscreen: true,
    autoHideMenuBar: true,
    icon: getAssetPath('apprenticeship-reports-logo-small.png'),
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  new AppUpdater(mainWindow);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (event) => {
  if (!appKernel || isQuittingAfterBackupRegistration) {
    return;
  }

  event.preventDefault();
  isQuittingAfterBackupRegistration = true;

  appKernel
    .handleAppClose()
    .catch((error) => {
      log.error('App close backup registration failed', error);
    })
    .finally(() => {
      app.quit();
    });
});

app
  .whenReady()
  .then(async () => {
    appKernel = createAppKernel();
    const desktopFileDialogService = new DesktopFileDialogService(
      () => mainWindow,
    );
    registerAppHandlers(appKernel, desktopFileDialogService);
    await appKernel.boot();
    await createWindow();

    app.on('activate', async () => {
      if (mainWindow === null) {
        await createWindow();
      }
    });
  })
  .catch(console.log);
