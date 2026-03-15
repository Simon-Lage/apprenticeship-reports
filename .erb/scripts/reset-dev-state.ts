import { promises as fs } from 'fs';
import path from 'path';

async function removePath(targetPath: string): Promise<boolean> {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'EBUSY' || error.code === 'EPERM')
    ) {
      return false;
    }

    throw error;
  }
}

async function run() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'reset-dev-state darf nur mit NODE_ENV=development ausgefuehrt werden.',
    );
  }

  const devStatePath = path.join(process.cwd(), '.dev-data');
  const userDataPath = path.join(devStatePath, 'user-data');
  const criticalTargets = [
    path.join(userDataPath, 'app-metadata.sqlite'),
    path.join(userDataPath, 'app-metadata.sqlite-shm'),
    path.join(userDataPath, 'app-metadata.sqlite-wal'),
    path.join(userDataPath, 'recovery'),
    path.join(userDataPath, 'Local Storage'),
    path.join(userDataPath, 'Session Storage'),
    path.join(userDataPath, 'WebStorage'),
    path.join(userDataPath, 'Network'),
  ];

  const removedRoot = await removePath(devStatePath);
  if (removedRoot) {
    console.log(`Dev state wurde zurueckgesetzt: ${devStatePath}`);
    return;
  }

  const skippedTargets: string[] = [];

  for (const target of criticalTargets) {
    const removedTarget = await removePath(target);
    if (!removedTarget) {
      skippedTargets.push(target);
    }
  }

  if (skippedTargets.length) {
    console.warn(
      'Reset teilweise ausgefuehrt. Bitte App schliessen und den Command erneut starten.',
    );
    skippedTargets.forEach((target) => console.warn(`Gesperrt: ${target}`));
  } else {
    console.log(`Dev state wurde zurueckgesetzt: ${devStatePath}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
