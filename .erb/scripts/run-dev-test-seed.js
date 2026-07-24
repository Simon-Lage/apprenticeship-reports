const { spawnSync } = require('child_process');

const result = spawnSync(
  require('electron'),
  [
    require.resolve('ts-node/dist/bin.js'),
    './.erb/scripts/seed-dev-test-data.ts',
    ...process.argv.slice(2),
  ],
  {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'development',
      NODE_OPTIONS: '-r tsconfig-paths/register',
      TS_NODE_TRANSPILE_ONLY: 'true',
    },
    stdio: 'inherit',
    shell: false,
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(typeof result.status === 'number' ? result.status : 1);
