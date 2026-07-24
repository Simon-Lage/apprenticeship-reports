import path from 'path';

import { AppMetadataRepository } from '../../src/main/services/AppMetadataRepository';
import { PasswordAuthService } from '../../src/main/services/PasswordAuthService';
import {
  createDevTestApprenticeSeed,
  DevTestSeedHolidayCatalog,
  DEV_TEST_APPRENTICE_DRIVE_SCOPE,
  DEV_TEST_APPRENTICE_PASSWORD,
  resolveDevTestApprenticeSeedRequiredHolidayYears,
} from '../../src/shared/dev/test-apprentice-seed';
import OpenHolidaysService from '../../src/main/services/OpenHolidaysService';

function parseNowFromArgs(args: string[]): string | null {
  const nowArg = args.find((arg) => arg.startsWith('--now=')) ?? null;

  if (!nowArg) {
    return null;
  }

  const parsed = nowArg.slice('--now='.length).trim();

  if (!parsed.length || Number.isNaN(new Date(parsed).getTime())) {
    throw new Error('Bitte einen gueltigen ISO-Zeitpunkt fuer --now angeben.');
  }

  return parsed;
}

async function ensurePassword(
  passwordAuthService: PasswordAuthService,
): Promise<void> {
  const hasPassword = await passwordAuthService.hasPassword();

  if (hasPassword) {
    const isUnlocked = await passwordAuthService.verify(
      DEV_TEST_APPRENTICE_PASSWORD,
    );

    if (!isUnlocked) {
      throw new Error(
        'Das vorhandene Dev-Passwort weicht vom Testpasswort ab. Bitte zuerst npm run reset:dev-state ausfuehren.',
      );
    }

    return;
  }

  await passwordAuthService.initialize(DEV_TEST_APPRENTICE_PASSWORD);
}

async function fetchHolidayCatalogs(
  years: number[],
): Promise<DevTestSeedHolidayCatalog[]> {
  const service = new OpenHolidaysService();
  const catalogs = await Promise.all(
    years.map(async (year) => {
      const catalog = await service.fetchYearCatalog({
        subdivisionCode: 'DE-NW',
        year,
      });

      return {
        year,
        publicHolidays: catalog.publicHolidays,
        schoolHolidays: catalog.schoolHolidays,
      };
    }),
  );

  return catalogs;
}

async function run(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'seed-dev-test-data darf nur mit NODE_ENV=development ausgefuehrt werden.',
    );
  }

  const now =
    parseNowFromArgs(process.argv.slice(2)) ?? new Date().toISOString();
  const rootPath = path.join(process.cwd(), '.dev-data', 'user-data');
  const metadataPath = path.join(rootPath, 'app-metadata.json');
  const repository = new AppMetadataRepository(metadataPath, () =>
    new Date().toISOString(),
  );
  const passwordAuthService = new PasswordAuthService(repository);
  const holidayYears = resolveDevTestApprenticeSeedRequiredHolidayYears({
    now,
  });
  const holidayCatalogsByYear = await fetchHolidayCatalogs(holidayYears);
  const seed = createDevTestApprenticeSeed({
    now,
    driveScope: DEV_TEST_APPRENTICE_DRIVE_SCOPE,
    holidayCatalogsByYear,
  });

  await ensurePassword(passwordAuthService);
  await repository.write(seed.metadata);

  console.log('Dev-Testdaten erfolgreich geschrieben.');
  console.log(
    `Berichtszeitraum: ${seed.stats.reportsStartDate} bis ${seed.stats.reportsEndDate}`,
  );
  console.log(
    `Ausbildungszeitraum: ${seed.stats.trainingStartDate} bis ${seed.stats.trainingEndDate}`,
  );
  console.log(`Wochenberichte: ${seed.stats.weeklyReportCount}`);
  console.log(`Tagesberichte: ${seed.stats.dailyReportCount}`);
  console.log(`Arbeitstage: ${seed.stats.workDayCount}`);
  console.log(`Schultage: ${seed.stats.schoolDayCount}`);
  console.log(`Freie Tage: ${seed.stats.freeDayCount}`);
  console.log(`Manuelle Abwesenheiten: ${seed.stats.absenceCount}`);
  console.log(`Passwort: ${DEV_TEST_APPRENTICE_PASSWORD}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
