#!/usr/bin/env node

/* eslint-disable no-console */

const { getWeeklyReports, saveWeeklyReport } = require('./ihk-client');

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function requireValue(value, label) {
  if (!value) {
    throw new Error(`Missing ${label}.`);
  }

  return value;
}

function parseGermanDate(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}

function formatGermanDate(date) {
  return [
    String(date.getUTCDate()).padStart(2, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    date.getUTCFullYear(),
  ].join('.');
}

function addDays(date, days) {
  const nextDate = new Date(date.getTime());
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function parseReportPeriod(period) {
  const [startText, endText] = period.split(' - ');
  const start = startText ? parseGermanDate(startText.trim()) : null;
  const end = endText ? parseGermanDate(endText.trim()) : null;

  if (!start || !end) {
    return null;
  }

  return { start, end };
}

function resolveNewestReport(reports) {
  const newestReport = reports
    .map((report) => ({
      period: parseReportPeriod(report.period || ''),
      report,
    }))
    .filter((entry) => entry.period)
    .sort(
      (left, right) => right.period.end.getTime() - left.period.end.getTime(),
    )[0];

  if (!newestReport) {
    throw new Error('Could not resolve newest weekly report period.');
  }

  return newestReport;
}

function resolveNextWeekRange(reports) {
  const newestReport = resolveNewestReport(reports);
  const nextStart = addDays(newestReport.period.end, 1);
  const nextEnd = addDays(nextStart, 6);

  return {
    weekStart: formatGermanDate(nextStart),
    weekEnd: formatGermanDate(nextEnd),
  };
}

function resolveTestReportDefaults(reports) {
  const newestReport = resolveNewestReport(reports).report;

  return {
    department: process.env.IHK_TEST_DEPARTMENT || 'Test',
    supervisorEmail:
      process.env.IHK_TEST_SUPERVISOR_EMAIL ||
      newestReport.supervisorEmail ||
      'test@example.invalid',
  };
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function assertValidEmail(value) {
  if (!validateEmail(value)) {
    throw new Error(
      'Supervisor email must be a valid email address. Set IHK_TEST_SUPERVISOR_EMAIL if needed.',
    );
  }

  return value;
}

async function listReports() {
  const reports = await getWeeklyReports();
  console.table(reports);
}

async function saveTestReport() {
  let weekStart = readArg('--from') || process.env.IHK_WEEK_START;
  let weekEnd = readArg('--to') || process.env.IHK_WEEK_END;
  const reports = await getWeeklyReports();
  const defaults = resolveTestReportDefaults(reports);

  if (!weekStart || !weekEnd) {
    const nextWeekRange = resolveNextWeekRange(reports);

    weekStart = nextWeekRange.weekStart;
    weekEnd = nextWeekRange.weekEnd;
  }

  const result = await saveWeeklyReport({
    weekStart: requireValue(weekStart, 'week start'),
    weekEnd: requireValue(weekEnd, 'week end'),
    department: defaults.department,
    supervisorEmail: assertValidEmail(defaults.supervisorEmail),
    workText: 'Test',
    trainingText: 'Test',
    schoolText: 'Test',
  });

  console.log(`Week: ${weekStart} - ${weekEnd}`);
  console.log(`HTTP ${result.status}`);
  console.log(
    `Saved: ${result.status === 302 || result.status === 200 ? 'yes' : 'unknown'}`,
  );
  if (result.location) {
    console.log(`Location: ${result.location}`);
  }
}

async function main() {
  const command = process.argv[2] || 'list';

  if (command === 'list') {
    await listReports();
    return;
  }

  if (command === 'save-test') {
    await saveTestReport();
    return;
  }

  throw new Error(
    'Usage: node experimental/weekly-report.js list | save-test [--from DD.MM.YYYY --to DD.MM.YYYY]',
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
