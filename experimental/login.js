#!/usr/bin/env node

/* eslint-disable no-console */

const { COOKIE_FILE, login } = require('./ihk-client');

async function main() {
  const { status } = await login();

  console.log(`HTTP ${status}`);
  console.log('Logged in: yes');
  console.log(`Cookies saved: ${COOKIE_FILE}`);
}

main()
  .then(() => undefined)
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
