const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { dependencies } = require('../../release/app/package.json');
const rootPackage = require('../../package.json');

const rootPath = path.join(__dirname, '../..');
const appPath = path.join(rootPath, 'release', 'app');
const appNodeModulesPath = path.join(appPath, 'node_modules');

if (Object.keys(dependencies || {}).length > 0 && fs.existsSync(appNodeModulesPath)) {
  const electronPackagePath = path.join(rootPath, 'node_modules', 'electron', 'package.json');
  let electronVersion = null;
  if (fs.existsSync(electronPackagePath)) {
    electronVersion = require(electronPackagePath).version;
  }
  if (!electronVersion) {
    const range =
      (rootPackage.devDependencies && rootPackage.devDependencies.electron) ||
      (rootPackage.dependencies && rootPackage.dependencies.electron);
    if (range) {
      electronVersion = String(range).replace(/^[^0-9]*/, '');
    }
  }
  const versionArg = electronVersion ? ` --version ${electronVersion}` : '';
  const electronRebuildCmd =
    `../../node_modules/.bin/electron-rebuild --force --types prod,dev,optional --module-dir .${versionArg}`;
  const cmd =
    process.platform === 'win32'
      ? electronRebuildCmd.replace(/\//g, '\\')
      : electronRebuildCmd;
  execSync(cmd, {
    cwd: appPath,
    stdio: 'inherit',
  });
}
