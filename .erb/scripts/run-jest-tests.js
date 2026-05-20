const { spawnSync } = require('child_process');

const npmCommand = process.env.npm_execpath ? process.execPath : 'npm';
const npmArgs = process.env.npm_execpath ? [process.env.npm_execpath] : [];

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return typeof result.status === 'number' ? result.status : 1;
}

function runNpm(args) {
  return run(npmCommand, [...npmArgs, ...args]);
}

let exitCode = runNpm([
  '--prefix',
  'release/app',
  'rebuild',
  'better-sqlite3-multiple-ciphers',
]);

if (exitCode === 0) {
  exitCode = run(process.execPath, [
    require.resolve('jest/bin/jest'),
    '--runInBand',
    '--silent',
    ...process.argv.slice(2),
  ]);
}

if (process.env.SKIP_TEST_ELECTRON_REBUILD !== '1') {
  const restoreCode = runNpm(['run', 'rebuild']);
  if (exitCode === 0) {
    exitCode = restoreCode;
  }
}

process.exit(exitCode);
