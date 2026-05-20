import { createDefaultAppMetadata, AppMetadata } from '@/shared/app/state';
import { createPasswordSession } from '@/shared/auth/session';
import defaultOnboardingSteps from '@/shared/onboarding/default-steps';
import { JsonObject } from '@/shared/common/json';
import {
  applyUpsertDailyReport,
  applyUpsertWeeklyReport,
} from '@/shared/reports/mutations';
import { createDefaultReportsState } from '@/shared/reports/models';
import { resolveReportStartDateFromSettings } from '@/shared/settings/report-start-date';

export const DEV_TEST_APPRENTICE_PASSWORD = '1!aA1234';
export const DEV_TEST_APPRENTICE_DRIVE_SCOPE =
  'https://www.googleapis.com/auth/drive.file';

type TimetableSlot = {
  lesson: number;
  subject: string;
  teacher: string;
};

type WeekKey = {
  weekStart: string;
  weekEnd: string;
};

type DateRange = {
  startDate: string;
  endDate: string;
};

type NamedDateRange = DateRange & {
  name: string;
};

type CatalogEntry = {
  id: string;
  startDate: string;
  endDate: string;
  name: string;
  names: Array<{ language: string; text: string }>;
  nationwide: boolean;
  subdivisionCodes: string[];
};

export type DevTestSeedHolidayCatalog = {
  year: number;
  publicHolidays: CatalogEntry[];
  schoolHolidays: CatalogEntry[];
};

type ManualAbsence = {
  id: string;
  type: 'sick' | 'vacation' | 'public-holiday' | 'school-holiday';
  startDate: string;
  endDate: string;
  label: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type DailyResolution =
  | {
      dayType: 'work' | 'school';
      baseDayType: 'work' | 'school';
      freeReason: '';
      freeDayCategory: null;
      entryMode: 'manual';
    }
  | {
      dayType: 'free';
      baseDayType: 'work' | 'school';
      freeReason: string;
      freeDayCategory: 'work' | 'school';
      entryMode: 'manual' | 'automatic';
    };

export type DevTestSeedStats = {
  reportsStartDate: string;
  reportsEndDate: string;
  trainingStartDate: string;
  trainingEndDate: string;
  weeklyReportCount: number;
  dailyReportCount: number;
  freeDayCount: number;
  schoolDayCount: number;
  workDayCount: number;
  absenceCount: number;
};

export type DevTestApprenticeSeed = {
  metadata: AppMetadata;
  stats: DevTestSeedStats;
};

const subdivisionCode = 'DE-NW';
const departmentName = 'Backend und Integration';
const supervisorEmail = 'musterausbilder@muster.de';
const driveAccount = {
  id: 'drive-test-azubi',
  email: 'test.azubi@ausbildung.test',
  displayName: 'Max Mustermann',
};

const workActivities = [
  'User Story im Ticketsystem analysiert',
  'REST API Endpunkt erweitert',
  'Datenbankmigration vorbereitet und getestet',
  'Code Review im Team durchgefuehrt',
  'Fehleranalyse in Logdateien erledigt',
  'Frontend Formular validiert und angepasst',
  'Unit Tests geschrieben und Fehler behoben',
  'Dokumentation im Projektwiki aktualisiert',
  'Deployment im Testsystem vorbereitet',
  'Support Ticket aus Fachabteilung geloest',
];

const workTrainings = [
  'Sicherheitsunterweisung im Betrieb',
  'Scrum Retrospektive mit Aufgabenplanung',
  'Interne Schulung zu Clean Code',
  'Einweisung in Monitoring und Alerting',
];

const lessonTopicsBySubject: Record<string, string[]> = {
  Anwendungsentwicklung: [
    'Objektorientierte Modellierung',
    'Refactoring und Wartbarkeit',
    'Fehlerbehandlung in Services',
    'Teststrategien fuer Komponenten',
  ],
  Datenbanken: [
    'Normalformen und Datenmodellierung',
    'Indexe und Query Optimierung',
    'Transaktionen und Isolation',
    'SQL Joins in Praxisfaellen',
  ],
  Wirtschaft: [
    'Rechte und Pflichten im Ausbildungsvertrag',
    'Projektkosten und Kalkulation',
    'Datenschutz im Unternehmensalltag',
  ],
  Englisch: [
    'Technische Dokumentation auf Englisch',
    'IT Fachbegriffe im Kundengespraech',
    'Mailkommunikation im Support',
  ],
  Netzwerktechnik: [
    'IPv4 Subnetting Uebungen',
    'Routing und Switching Grundlagen',
    'DNS und DHCP im Unternehmensnetz',
  ],
  Betriebssysteme: [
    'Prozessverwaltung unter Linux',
    'Dateirechte und Rollen',
    'Systemdienste und Logging',
  ],
  Projektmanagement: [
    'Aufwandsschaetzung mit Story Points',
    'Kanban Board Pflege',
    'Risikoanalyse fuer Releases',
  ],
  Qualitaetssicherung: [
    'Testfallentwurf nach Aequivalenzklassen',
    'Regressionstestplanung',
    'Abnahme und Dokumentationspflichten',
  ],
};

const tuesdayTimetable: TimetableSlot[] = [
  { lesson: 1, subject: 'Anwendungsentwicklung', teacher: 'Herr Keller' },
  { lesson: 2, subject: 'Anwendungsentwicklung', teacher: 'Herr Keller' },
  { lesson: 3, subject: 'Datenbanken', teacher: 'Frau Nguyen' },
  { lesson: 4, subject: 'Datenbanken', teacher: 'Frau Nguyen' },
  { lesson: 5, subject: 'Wirtschaft', teacher: 'Herr Braun' },
  { lesson: 6, subject: 'Wirtschaft', teacher: 'Herr Braun' },
  { lesson: 7, subject: 'Englisch', teacher: 'Frau Beck' },
  { lesson: 8, subject: 'Englisch', teacher: 'Frau Beck' },
];

const thursdayTimetable: TimetableSlot[] = [
  { lesson: 1, subject: 'Netzwerktechnik', teacher: 'Herr Scholz' },
  { lesson: 2, subject: 'Netzwerktechnik', teacher: 'Herr Scholz' },
  { lesson: 3, subject: 'Betriebssysteme', teacher: 'Frau Walter' },
  { lesson: 4, subject: 'Betriebssysteme', teacher: 'Frau Walter' },
  { lesson: 5, subject: 'Projektmanagement', teacher: 'Herr Lehmann' },
  { lesson: 6, subject: 'Projektmanagement', teacher: 'Herr Lehmann' },
  { lesson: 7, subject: 'Qualitaetssicherung', teacher: 'Frau Koch' },
  { lesson: 8, subject: 'Qualitaetssicherung', teacher: 'Frau Koch' },
  { lesson: 9, subject: 'Anwendungsentwicklung', teacher: 'Herr Keller' },
  { lesson: 10, subject: 'Anwendungsentwicklung', teacher: 'Herr Keller' },
  { lesson: 11, subject: 'Datenbanken', teacher: 'Frau Nguyen' },
  { lesson: 12, subject: 'Datenbanken', teacher: 'Frau Nguyen' },
];

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addDaysIso(value: string, days: number): string {
  return toIsoDate(addDays(fromIsoDate(value), days));
}

function listDatesForRange(startDate: string, endDate: string): string[] {
  const start = fromIsoDate(startDate);
  const end = fromIsoDate(endDate);
  const result: string[] = [];
  const cursor = new Date(start.getTime());

  while (cursor.getTime() <= end.getTime()) {
    result.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

function formatMonthDay(month: number, day: number): string {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toIsoDateParts(year: number, month: number, day: number): string {
  return `${year}-${formatMonthDay(month, day)}`;
}

function isRangeWithin(range: DateRange, bounds: DateRange): boolean {
  return range.startDate >= bounds.startDate && range.endDate <= bounds.endDate;
}

function getWeekRange(date: string): WeekKey {
  const parsed = fromIsoDate(date);
  const dayOfWeek = parsed.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = addDays(parsed, mondayOffset);
  const weekEnd = addDays(weekStart, 6);

  return {
    weekStart: toIsoDate(weekStart),
    weekEnd: toIsoDate(weekEnd),
  };
}

function getDateIndexInYear(date: string): number {
  const year = Number(date.slice(0, 4));
  const start = fromIsoDate(`${year}-01-01`).getTime();
  const current = fromIsoDate(date).getTime();
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((current - start) / millisecondsPerDay);
}

function findRangeMatch<T extends DateRange>(
  ranges: T[],
  date: string,
): T | null {
  return (
    ranges.find((entry) => entry.startDate <= date && entry.endDate >= date) ??
    null
  );
}

function isWeekend(date: string): boolean {
  const day = fromIsoDate(date).getUTCDay();
  return day === 0 || day === 6;
}

function resolveBaseDayType(date: string): 'work' | 'school' {
  const day = fromIsoDate(date).getUTCDay();
  return day === 2 || day === 4 ? 'school' : 'work';
}

function resolveEasterSunday(year: number): string {
  const c = Math.floor(year / 100);
  const n = year - 19 * Math.floor(year / 19);
  const k = Math.floor((c - 17) / 25);
  const i = c - Math.floor(c / 4) - Math.floor((c - k) / 3) + 19 * n + 15;
  const j = year + Math.floor(year / 4) + i + 2 - c + Math.floor(c / 4);
  const l = i - 30 * Math.floor(i / 30);
  const m = j - 7 * Math.floor(j / 7);
  const d = l - m;
  const month = 3 + Math.floor((d + 40) / 44);
  const day = d + 28 - 31 * Math.floor(month / 4);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function createPublicHolidayCatalog(year: number): CatalogEntry[] {
  const easterSunday = resolveEasterSunday(year);
  const goodFriday = addDaysIso(easterSunday, -2);
  const easterMonday = addDaysIso(easterSunday, 1);
  const ascensionDay = addDaysIso(easterSunday, 39);
  const whitMonday = addDaysIso(easterSunday, 50);
  const corpusChristi = addDaysIso(easterSunday, 60);

  return [
    {
      id: `public-${year}-new-year`,
      startDate: `${year}-01-01`,
      endDate: `${year}-01-01`,
      name: 'Neujahr',
      names: [{ language: 'de', text: 'Neujahr' }],
      nationwide: true,
      subdivisionCodes: [],
    },
    {
      id: `public-${year}-good-friday`,
      startDate: goodFriday,
      endDate: goodFriday,
      name: 'Karfreitag',
      names: [{ language: 'de', text: 'Karfreitag' }],
      nationwide: true,
      subdivisionCodes: [],
    },
    {
      id: `public-${year}-easter-monday`,
      startDate: easterMonday,
      endDate: easterMonday,
      name: 'Ostermontag',
      names: [{ language: 'de', text: 'Ostermontag' }],
      nationwide: true,
      subdivisionCodes: [],
    },
    {
      id: `public-${year}-labour-day`,
      startDate: `${year}-05-01`,
      endDate: `${year}-05-01`,
      name: 'Tag der Arbeit',
      names: [{ language: 'de', text: 'Tag der Arbeit' }],
      nationwide: true,
      subdivisionCodes: [],
    },
    {
      id: `public-${year}-ascension`,
      startDate: ascensionDay,
      endDate: ascensionDay,
      name: 'Christi Himmelfahrt',
      names: [{ language: 'de', text: 'Christi Himmelfahrt' }],
      nationwide: true,
      subdivisionCodes: [],
    },
    {
      id: `public-${year}-whit-monday`,
      startDate: whitMonday,
      endDate: whitMonday,
      name: 'Pfingstmontag',
      names: [{ language: 'de', text: 'Pfingstmontag' }],
      nationwide: true,
      subdivisionCodes: [],
    },
    {
      id: `public-${year}-corpus-christi`,
      startDate: corpusChristi,
      endDate: corpusChristi,
      name: 'Fronleichnam',
      names: [{ language: 'de', text: 'Fronleichnam' }],
      nationwide: false,
      subdivisionCodes: [subdivisionCode],
    },
    {
      id: `public-${year}-unity-day`,
      startDate: `${year}-10-03`,
      endDate: `${year}-10-03`,
      name: 'Tag der Deutschen Einheit',
      names: [{ language: 'de', text: 'Tag der Deutschen Einheit' }],
      nationwide: true,
      subdivisionCodes: [],
    },
    {
      id: `public-${year}-all-saints`,
      startDate: `${year}-11-01`,
      endDate: `${year}-11-01`,
      name: 'Allerheiligen',
      names: [{ language: 'de', text: 'Allerheiligen' }],
      nationwide: false,
      subdivisionCodes: [subdivisionCode],
    },
    {
      id: `public-${year}-christmas-1`,
      startDate: `${year}-12-25`,
      endDate: `${year}-12-25`,
      name: '1. Weihnachtstag',
      names: [{ language: 'de', text: '1. Weihnachtstag' }],
      nationwide: true,
      subdivisionCodes: [],
    },
    {
      id: `public-${year}-christmas-2`,
      startDate: `${year}-12-26`,
      endDate: `${year}-12-26`,
      name: '2. Weihnachtstag',
      names: [{ language: 'de', text: '2. Weihnachtstag' }],
      nationwide: true,
      subdivisionCodes: [],
    },
  ];
}

function createSchoolHolidayCatalog(year: number): CatalogEntry[] {
  const easterSunday = resolveEasterSunday(year);
  const easterBreakStart = addDaysIso(easterSunday, -16);
  const easterBreakEnd = addDaysIso(easterSunday, -2);

  return [
    {
      id: `school-${year}-winter`,
      startDate: `${year}-01-02`,
      endDate: `${year}-01-06`,
      name: 'Winterferien',
      names: [{ language: 'de', text: 'Winterferien' }],
      nationwide: false,
      subdivisionCodes: [subdivisionCode],
    },
    {
      id: `school-${year}-easter`,
      startDate: easterBreakStart,
      endDate: easterBreakEnd,
      name: 'Osterferien',
      names: [{ language: 'de', text: 'Osterferien' }],
      nationwide: false,
      subdivisionCodes: [subdivisionCode],
    },
    {
      id: `school-${year}-summer`,
      startDate: `${year}-07-06`,
      endDate: `${year}-08-18`,
      name: 'Sommerferien',
      names: [{ language: 'de', text: 'Sommerferien' }],
      nationwide: false,
      subdivisionCodes: [subdivisionCode],
    },
    {
      id: `school-${year}-autumn`,
      startDate: `${year}-10-12`,
      endDate: `${year}-10-24`,
      name: 'Herbstferien',
      names: [{ language: 'de', text: 'Herbstferien' }],
      nationwide: false,
      subdivisionCodes: [subdivisionCode],
    },
    {
      id: `school-${year}-christmas`,
      startDate: `${year}-12-23`,
      endDate: `${year + 1}-01-06`,
      name: 'Weihnachtsferien',
      names: [{ language: 'de', text: 'Weihnachtsferien' }],
      nationwide: false,
      subdivisionCodes: [subdivisionCode],
    },
  ];
}

function createManualAbsences(input: {
  rangeStart: string;
  rangeEnd: string;
  now: string;
}): ManualAbsence[] {
  const range: DateRange = {
    startDate: input.rangeStart,
    endDate: input.rangeEnd,
  };
  const startYear = Number(input.rangeStart.slice(0, 4));
  const endYear = Number(input.rangeEnd.slice(0, 4));
  const candidateAbsences: Array<
    Omit<ManualAbsence, 'id' | 'createdAt' | 'updatedAt'>
  > = [
    {
      type: 'vacation',
      startDate: toIsoDateParts(endYear, 2, 10),
      endDate: toIsoDateParts(endYear, 3, 1),
      label: '',
      note: null,
    },
    {
      type: 'vacation',
      startDate: toIsoDateParts(startYear, 8, 31),
      endDate: toIsoDateParts(startYear, 9, 11),
      label: '',
      note: null,
    },
    {
      type: 'sick',
      startDate: toIsoDateParts(endYear, 3, 2),
      endDate: toIsoDateParts(endYear, 3, 4),
      label: '',
      note: null,
    },
    {
      type: 'sick',
      startDate: toIsoDateParts(startYear, 11, 16),
      endDate: toIsoDateParts(startYear, 11, 20),
      label: '',
      note: null,
    },
    {
      type: 'public-holiday',
      startDate: toIsoDateParts(startYear, 5, 15),
      endDate: toIsoDateParts(startYear, 5, 15),
      label: 'Betrieblicher Feiertag',
      note: null,
    },
    {
      type: 'school-holiday',
      startDate: toIsoDateParts(startYear, 5, 22),
      endDate: toIsoDateParts(startYear, 5, 22),
      label: 'Beweglicher Ferientag',
      note: null,
    },
  ];
  const selected = candidateAbsences.filter((absence) =>
    isRangeWithin(absence, range),
  );
  const hasVacation = selected.some((entry) => entry.type === 'vacation');
  const hasSick = selected.some((entry) => entry.type === 'sick');
  const hasPublicHoliday = selected.some(
    (entry) => entry.type === 'public-holiday',
  );
  const hasSchoolHoliday = selected.some(
    (entry) => entry.type === 'school-holiday',
  );
  const pushBoundedAbsence = (
    absence: Omit<ManualAbsence, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (isRangeWithin(absence, range)) {
      selected.push(absence);
    }
  };

  if (!hasVacation) {
    pushBoundedAbsence({
      type: 'vacation',
      startDate: addDaysIso(input.rangeStart, 45),
      endDate: addDaysIso(input.rangeStart, 54),
      label: '',
      note: null,
    });
  }

  if (!hasSick) {
    pushBoundedAbsence({
      type: 'sick',
      startDate: addDaysIso(input.rangeStart, 120),
      endDate: addDaysIso(input.rangeStart, 123),
      label: '',
      note: null,
    });
  }

  if (!hasPublicHoliday) {
    const date = addDaysIso(input.rangeStart, 95);
    pushBoundedAbsence({
      type: 'public-holiday',
      startDate: date,
      endDate: date,
      label: 'Betrieblicher Feiertag',
      note: null,
    });
  }

  if (!hasSchoolHoliday) {
    const date = addDaysIso(input.rangeStart, 185);
    pushBoundedAbsence({
      type: 'school-holiday',
      startDate: date,
      endDate: date,
      label: 'Beweglicher Ferientag',
      note: null,
    });
  }

  return selected.map((absence, index) => ({
    id: `manual-${index + 1}`,
    ...absence,
    createdAt: input.now,
    updatedAt: input.now,
  }));
}

function createTimetable() {
  return {
    monday: [] as TimetableSlot[],
    tuesday: tuesdayTimetable,
    wednesday: [] as TimetableSlot[],
    thursday: thursdayTimetable,
    friday: [] as TimetableSlot[],
  };
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right),
  );
}

function createSchoolLessons(input: {
  date: string;
  slots: TimetableSlot[];
  weekStart: string;
}) {
  const dayIndex = getDateIndexInYear(input.date);
  const weekIndex = getDateIndexInYear(input.weekStart);

  return input.slots.map((slot) => {
    const topicPool = lessonTopicsBySubject[slot.subject] ?? [
      'Unterrichtsthema',
    ];
    const topic =
      topicPool[(dayIndex + weekIndex + slot.lesson) % topicPool.length];

    return {
      lesson: slot.lesson,
      subject: slot.subject,
      teacher: slot.teacher,
      topics: [topic],
    };
  });
}

function resolveDailyState(input: {
  date: string;
  catalogPublicHolidayRanges: NamedDateRange[];
  manualPublicHolidayRanges: NamedDateRange[];
  catalogSchoolHolidayRanges: NamedDateRange[];
  manualSchoolHolidayRanges: NamedDateRange[];
  sickRanges: DateRange[];
  vacationRanges: DateRange[];
}): DailyResolution {
  const baseDayType = resolveBaseDayType(input.date);
  const manualPublicHoliday = findRangeMatch(
    input.manualPublicHolidayRanges,
    input.date,
  );
  const catalogPublicHoliday = findRangeMatch(
    input.catalogPublicHolidayRanges,
    input.date,
  );
  const publicHoliday = manualPublicHoliday ?? catalogPublicHoliday;

  if (publicHoliday) {
    return {
      dayType: 'free',
      baseDayType,
      freeReason: publicHoliday.name,
      freeDayCategory: baseDayType,
      entryMode: 'automatic',
    };
  }

  if (isWeekend(input.date)) {
    return {
      dayType: 'free',
      baseDayType,
      freeReason: 'Wochenende',
      freeDayCategory: baseDayType,
      entryMode: 'automatic',
    };
  }

  if (findRangeMatch(input.sickRanges, input.date)) {
    return {
      dayType: 'free',
      baseDayType,
      freeReason: 'Krankheit',
      freeDayCategory: baseDayType,
      entryMode: 'manual',
    };
  }

  if (findRangeMatch(input.vacationRanges, input.date)) {
    return {
      dayType: 'free',
      baseDayType,
      freeReason: 'Urlaub',
      freeDayCategory: baseDayType,
      entryMode: 'manual',
    };
  }

  const manualSchoolHoliday = findRangeMatch(
    input.manualSchoolHolidayRanges,
    input.date,
  );
  const catalogSchoolHoliday = findRangeMatch(
    input.catalogSchoolHolidayRanges,
    input.date,
  );
  const schoolHoliday = manualSchoolHoliday ?? catalogSchoolHoliday;

  if (baseDayType === 'school' && schoolHoliday) {
    return {
      dayType: 'free',
      baseDayType,
      freeReason: schoolHoliday.name,
      freeDayCategory: baseDayType,
      entryMode: 'automatic',
    };
  }

  return {
    dayType: baseDayType,
    baseDayType,
    freeReason: '',
    freeDayCategory: null,
    entryMode: 'manual',
  };
}

function createDailyValues(input: {
  date: string;
  weekStart: string;
  dailyState: DailyResolution;
  timetable: ReturnType<typeof createTimetable>;
}) {
  const dayIndex = Math.max(0, getDateIndexInYear(input.date));

  if (input.dailyState.dayType === 'free') {
    return {
      entryMode: input.dailyState.entryMode,
      dayType: 'free',
      freeReason: input.dailyState.freeReason,
      freeDayCategory: input.dailyState.freeDayCategory,
      activities: [],
      trainings: [],
      schoolTopics: [],
      lessons: [],
    };
  }

  if (input.dailyState.dayType === 'school') {
    const day = fromIsoDate(input.date).getUTCDay();
    const slots =
      day === 2 ? input.timetable.tuesday : input.timetable.thursday;
    const lessons = createSchoolLessons({
      date: input.date,
      slots,
      weekStart: input.weekStart,
    });
    const schoolTopics = uniqueSorted(
      lessons
        .slice(0, 3)
        .map((lesson) =>
          lesson.subject.length
            ? `${lesson.subject}: ${lesson.topics[0]}`
            : lesson.topics[0],
        ),
    );

    return {
      entryMode: 'manual',
      dayType: 'school',
      freeReason: '',
      freeDayCategory: null,
      activities:
        dayIndex % 5 === 0
          ? ['Unterrichtsinhalte fuer den Betrieb nachbereitet']
          : [],
      trainings:
        dayIndex % 3 === 0 ? ['Lernzielkontrolle und Klausurvorbereitung'] : [],
      schoolTopics,
      lessons,
    };
  }

  const firstActivity = workActivities[dayIndex % workActivities.length];
  const secondActivity = workActivities[(dayIndex + 4) % workActivities.length];

  return {
    entryMode: 'manual',
    dayType: 'work',
    freeReason: '',
    freeDayCategory: null,
    activities: uniqueSorted([firstActivity, secondActivity]),
    trainings:
      dayIndex % 4 === 0
        ? [workTrainings[(dayIndex / 4) % workTrainings.length]]
        : [],
    schoolTopics: [],
    lessons: [],
  };
}

function createWeeklyValues(input: { weekEnd: string; weekIndex: number }) {
  const submitted = input.weekEnd < `${input.weekEnd.slice(0, 4)}-12-01`;

  return {
    reportDate: input.weekEnd,
    area: departmentName,
    supervisorEmailPrimary: supervisorEmail,
    submitted,
    submittedToEmail: submitted ? supervisorEmail : null,
    notes:
      input.weekIndex % 3 === 0
        ? 'Wochenbericht fristgerecht vorbereitet'
        : 'Wochenbericht im Regelprozess bearbeitet',
  };
}

function buildReportsForRange(input: {
  rangeStart: string;
  rangeEnd: string;
  publicHolidays: CatalogEntry[];
  schoolHolidays: CatalogEntry[];
  manualAbsences: ManualAbsence[];
}) {
  let reports = createDefaultReportsState();
  const dates = listDatesForRange(input.rangeStart, input.rangeEnd);
  const timetable = createTimetable();
  const weekKeys = new Set<string>();
  const catalogPublicHolidayRanges = input.publicHolidays.map((entry) => ({
    startDate: entry.startDate,
    endDate: entry.endDate,
    name: entry.name,
  }));
  const catalogSchoolHolidayRanges = input.schoolHolidays.map((entry) => ({
    startDate: entry.startDate,
    endDate: entry.endDate,
    name: entry.name,
  }));
  const manualPublicHolidayRanges = input.manualAbsences
    .filter((entry) => entry.type === 'public-holiday')
    .map((entry) => ({
      startDate: entry.startDate,
      endDate: entry.endDate,
      name: entry.label.trim() || 'Feiertag',
    }));
  const manualSchoolHolidayRanges = input.manualAbsences
    .filter((entry) => entry.type === 'school-holiday')
    .map((entry) => ({
      startDate: entry.startDate,
      endDate: entry.endDate,
      name: entry.label.trim() || 'Schulferien',
    }));
  const sickRanges = input.manualAbsences
    .filter((entry) => entry.type === 'sick')
    .map((entry) => ({
      startDate: entry.startDate,
      endDate: entry.endDate,
    }));
  const vacationRanges = input.manualAbsences
    .filter((entry) => entry.type === 'vacation')
    .map((entry) => ({
      startDate: entry.startDate,
      endDate: entry.endDate,
    }));

  dates.forEach((date) => {
    const weekRange = getWeekRange(date);
    weekKeys.add(`${weekRange.weekStart}:${weekRange.weekEnd}`);
    const dailyState = resolveDailyState({
      date,
      catalogPublicHolidayRanges,
      manualPublicHolidayRanges,
      catalogSchoolHolidayRanges,
      manualSchoolHolidayRanges,
      sickRanges,
      vacationRanges,
    });
    const values = createDailyValues({
      date,
      weekStart: weekRange.weekStart,
      dailyState,
      timetable,
    });
    const dailyTimestamp = `${date}T17:00:00.000Z`;
    const result = applyUpsertDailyReport(reports, {
      weekStart: weekRange.weekStart,
      weekEnd: weekRange.weekEnd,
      date,
      values,
      now: dailyTimestamp,
    });

    reports = result.reports;
  });

  const sortedWeeks = [...weekKeys]
    .map((entry) => {
      const [weekStart, weekEnd] = entry.split(':');
      return { weekStart, weekEnd };
    })
    .sort((left, right) =>
      left.weekStart === right.weekStart
        ? left.weekEnd.localeCompare(right.weekEnd)
        : left.weekStart.localeCompare(right.weekStart),
    );

  sortedWeeks.forEach((week, index) => {
    const weeklyTimestamp = `${week.weekEnd}T20:00:00.000Z`;
    const result = applyUpsertWeeklyReport(reports, {
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      values: createWeeklyValues({
        weekEnd: week.weekEnd,
        weekIndex: index,
      }),
      now: weeklyTimestamp,
    });

    reports = result.reports;
  });

  return reports;
}

function createAbsenceValues(input: {
  years: number[];
  now: string;
  publicHolidays: CatalogEntry[];
  schoolHolidays: CatalogEntry[];
  manualAbsences: ManualAbsence[];
}) {
  const publicHolidayByYear = new Map<number, CatalogEntry[]>();
  const schoolHolidayByYear = new Map<number, CatalogEntry[]>();

  input.years.forEach((year) => {
    publicHolidayByYear.set(year, []);
    schoolHolidayByYear.set(year, []);
  });

  input.publicHolidays.forEach((entry) => {
    const year = Number(entry.startDate.slice(0, 4));
    publicHolidayByYear.set(year, [
      ...(publicHolidayByYear.get(year) ?? []),
      entry,
    ]);
  });

  input.schoolHolidays.forEach((entry) => {
    const year = Number(entry.startDate.slice(0, 4));
    schoolHolidayByYear.set(year, [
      ...(schoolHolidayByYear.get(year) ?? []),
      entry,
    ]);
  });

  const catalogsByYear = input.years.reduce<
    Record<
      string,
      {
        year: number;
        subdivisionCode: string;
        fetchedAt: string;
        publicHolidays: CatalogEntry[];
        schoolHolidays: CatalogEntry[];
      }
    >
  >((result, year) => {
    result[String(year)] = {
      year,
      subdivisionCode,
      fetchedAt: input.now,
      publicHolidays: publicHolidayByYear.get(year) ?? [],
      schoolHolidays: schoolHolidayByYear.get(year) ?? [],
    };

    return result;
  }, {});

  return {
    subdivisionCode,
    lastSyncYear: input.years[input.years.length - 1] ?? null,
    lastSyncedAt: input.now,
    lastSyncError: null,
    autoSyncHolidays: true,
    catalogsByYear,
    manualAbsences: input.manualAbsences,
  };
}

function createSettingsValues(input: {
  reportsStartDate: string | null;
  trainingStartDate: string;
  trainingEndDate: string;
  years: number[];
  now: string;
  publicHolidays: CatalogEntry[];
  schoolHolidays: CatalogEntry[];
  manualAbsences: ManualAbsence[];
}) {
  const timetable = createTimetable();
  const allTeachers = uniqueSorted([
    ...timetable.tuesday.map((slot) => slot.teacher),
    ...timetable.thursday.map((slot) => slot.teacher),
  ]);
  const allSubjects = uniqueSorted([
    ...timetable.tuesday.map((slot) => slot.subject),
    ...timetable.thursday.map((slot) => slot.subject),
  ]);
  const absence = createAbsenceValues({
    years: input.years,
    now: input.now,
    publicHolidays: input.publicHolidays,
    schoolHolidays: input.schoolHolidays,
    manualAbsences: input.manualAbsences,
  });

  return {
    onboarding: {
      identity: {
        firstName: 'Max',
        lastName: 'Mustermann',
        apprenticeIdentifier: '4711',
        profession: 'Fachinformatiker Anwendungsentwicklung',
      },
      'training-period': {
        trainingStart: input.trainingStartDate,
        trainingEnd: input.trainingEndDate,
        reportsSince: input.reportsStartDate,
      },
      region: {
        subdivisionCode,
      },
      workplace: {
        department: departmentName,
        trainerEmail: supervisorEmail,
        ihkLink: 'https://www.ihk.de',
      },
      google: {
        linked: false,
        email: null,
      },
    },
    appUi: {
      defaultDepartment: departmentName,
      supervisorEmailPrimary: supervisorEmail,
      teachers: allTeachers,
      subjects: allSubjects,
      timetable,
    },
    absence,
    backup: {
      enabled: true,
    },
  };
}

function resolveTodayIsoDate(nowIsoDateTime: string): string {
  const parsedNow = new Date(nowIsoDateTime);

  if (Number.isNaN(parsedNow.getTime())) {
    throw new Error('Ungueltiger now-Zeitpunkt fuer Testdatenseed.');
  }

  return toIsoDate(parsedNow);
}

function resolveTrainingStartDate(nowIsoDateTime: string): string {
  const today = resolveTodayIsoDate(nowIsoDateTime);
  const year = Number(today.slice(0, 4));
  const candidateCurrentYear = `${year}-08-01`;

  if (candidateCurrentYear <= today) {
    return candidateCurrentYear;
  }

  return `${year - 1}-08-01`;
}

function resolveTrainingEndDate(trainingStartDate: string): string {
  const start = fromIsoDate(trainingStartDate);
  const trainingEnd = new Date(start.getTime());

  trainingEnd.setUTCFullYear(trainingEnd.getUTCFullYear() + 3);
  trainingEnd.setUTCDate(trainingEnd.getUTCDate() - 1);

  return toIsoDate(trainingEnd);
}

function resolveReportWindow(input: {
  now: string;
  settingsValues: JsonObject;
}): {
  reportsStartDate: string;
  reportsEndDate: string;
} {
  const reportsStartDate = resolveReportStartDateFromSettings(
    input.settingsValues,
  );

  if (!reportsStartDate) {
    throw new Error(
      'Berichtsstart fuer Testdatenseed konnte nicht ermittelt werden.',
    );
  }

  const today = resolveTodayIsoDate(input.now);
  const oneYearEnd = addDaysIso(
    toIsoDate(
      (() => {
        const start = fromIsoDate(reportsStartDate);
        start.setUTCFullYear(start.getUTCFullYear() + 1);
        return start;
      })(),
    ),
    -1,
  );

  if (!oneYearEnd) {
    throw new Error(
      'Berichtsende fuer Testdatenseed konnte nicht ermittelt werden.',
    );
  }

  if (reportsStartDate > today) {
    throw new Error('Berichtsstart fuer Testdatenseed liegt in der Zukunft.');
  }

  return {
    reportsStartDate,
    reportsEndDate: oneYearEnd < today ? oneYearEnd : today,
  };
}

function listYearsForRange(rangeStart: string, rangeEnd: string): number[] {
  const startYear = Number(rangeStart.slice(0, 4));
  const endYear = Number(rangeEnd.slice(0, 4));
  const years: number[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year);
  }

  return years;
}

function mapHolidayCatalogsByYear(
  catalogs: DevTestSeedHolidayCatalog[] | undefined,
): Map<number, DevTestSeedHolidayCatalog> {
  return new Map((catalogs ?? []).map((catalog) => [catalog.year, catalog]));
}

function resolvePublicHolidaysForYears(
  years: number[],
  catalogsByYear: Map<number, DevTestSeedHolidayCatalog>,
): CatalogEntry[] {
  return years.flatMap(
    (year) =>
      catalogsByYear.get(year)?.publicHolidays ??
      createPublicHolidayCatalog(year),
  );
}

function resolveSchoolHolidaysForYears(
  years: number[],
  catalogsByYear: Map<number, DevTestSeedHolidayCatalog>,
): CatalogEntry[] {
  return years.flatMap(
    (year) =>
      catalogsByYear.get(year)?.schoolHolidays ??
      createSchoolHolidayCatalog(year),
  );
}

function resolveSeedPeriod(input: { now: string }): {
  trainingStartDate: string;
  trainingEndDate: string;
  reportsStartDate: string;
  reportsEndDate: string;
  years: number[];
} {
  const trainingStartDate = resolveTrainingStartDate(input.now);
  const trainingEndDate = resolveTrainingEndDate(trainingStartDate);
  const periodSettingsValues: JsonObject = {
    onboarding: {
      'training-period': {
        trainingStart: trainingStartDate,
        trainingEnd: trainingEndDate,
        reportsSince: null,
      },
    },
  };
  const reportWindow = resolveReportWindow({
    now: input.now,
    settingsValues: periodSettingsValues,
  });

  return {
    trainingStartDate,
    trainingEndDate,
    reportsStartDate: reportWindow.reportsStartDate,
    reportsEndDate: reportWindow.reportsEndDate,
    years: listYearsForRange(
      reportWindow.reportsStartDate,
      reportWindow.reportsEndDate,
    ),
  };
}

export function resolveDevTestApprenticeSeedRequiredHolidayYears(input: {
  now: string;
}): number[] {
  return resolveSeedPeriod(input).years;
}

export function createDevTestApprenticeSeed(input: {
  now: string;
  driveScope?: string;
  holidayCatalogsByYear?: DevTestSeedHolidayCatalog[];
}): DevTestApprenticeSeed {
  const seedPeriod = resolveSeedPeriod({ now: input.now });
  const catalogsByYear = mapHolidayCatalogsByYear(input.holidayCatalogsByYear);
  const publicHolidays = resolvePublicHolidaysForYears(
    seedPeriod.years,
    catalogsByYear,
  );
  const schoolHolidays = resolveSchoolHolidaysForYears(
    seedPeriod.years,
    catalogsByYear,
  );
  const manualAbsences = createManualAbsences({
    rangeStart: seedPeriod.reportsStartDate,
    rangeEnd: seedPeriod.reportsEndDate,
    now: input.now,
  });
  const reports = buildReportsForRange({
    rangeStart: seedPeriod.reportsStartDate,
    rangeEnd: seedPeriod.reportsEndDate,
    publicHolidays,
    schoolHolidays,
    manualAbsences,
  });
  const metadata = createDefaultAppMetadata(input.now);
  const stepIds = defaultOnboardingSteps.map((step) => step.id);
  const settingsValues = createSettingsValues({
    reportsStartDate: null,
    trainingStartDate: seedPeriod.trainingStartDate,
    trainingEndDate: seedPeriod.trainingEndDate,
    years: seedPeriod.years,
    now: input.now,
    publicHolidays,
    schoolHolidays,
    manualAbsences,
  });

  metadata.auth.persistedSession = createPasswordSession(
    {
      account: {
        id: 'local-password-user',
        email: 'local@apprenticeship-reports.app',
        displayName: 'Max Mustermann',
      },
      rememberMe: true,
    },
    input.now,
  );
  metadata.drive = {
    ...metadata.drive,
    requiredScopes: [input.driveScope ?? DEV_TEST_APPRENTICE_DRIVE_SCOPE],
    grantedScopes: [input.driveScope ?? DEV_TEST_APPRENTICE_DRIVE_SCOPE],
    account: driveAccount,
    accessToken: 'dev-seed-access-token',
    refreshToken: 'dev-seed-refresh-token',
    connectedAt: input.now,
    lastValidatedAt: input.now,
    explanation:
      'Die Google-Drive-Berechtigung wird fuer regelmaessige Backups benoetigt.',
  };
  metadata.backup = {
    ...metadata.backup,
    hasUnsavedChanges: false,
    pendingReasons: [],
    dailyReportsSinceLastBackup: 0,
    lastAttemptedBackupAt: input.now,
    lastSuccessfulBackupAt: input.now,
    lastFailedBackupAt: null,
  };
  metadata.onboarding = {
    ...metadata.onboarding,
    definitionVersion: 'dev-seed-v1',
    completedStepIds: stepIds,
    skippedStepIds: [],
    lastActiveStepId: stepIds[stepIds.length - 1] ?? null,
    completedAt: input.now,
    updatedAt: input.now,
    drafts: {},
  };
  metadata.settings.current = {
    ...metadata.settings.current,
    id: 'settings-current',
    schemaVersion: 1,
    capturedAt: input.now,
    values: settingsValues,
  };
  metadata.settings.lastExportedAt = null;
  metadata.settings.pendingImport = null;
  metadata.reports = reports;
  metadata.recovery.pendingBackupImport = null;
  metadata.recovery.lastRecoverySnapshotPath = null;
  metadata.recovery.lastRestoredAt = null;
  metadata.ui.isFullScreen = false;

  const dailyReports = Object.values(metadata.reports.dailyReports);
  const freeDayCount = dailyReports.filter(
    (dailyReport) =>
      typeof dailyReport.values.dayType === 'string' &&
      dailyReport.values.dayType === 'free',
  ).length;
  const schoolDayCount = dailyReports.filter(
    (dailyReport) =>
      typeof dailyReport.values.dayType === 'string' &&
      dailyReport.values.dayType === 'school',
  ).length;
  const workDayCount = dailyReports.filter(
    (dailyReport) =>
      typeof dailyReport.values.dayType === 'string' &&
      dailyReport.values.dayType === 'work',
  ).length;

  return {
    metadata,
    stats: {
      reportsStartDate: seedPeriod.reportsStartDate,
      reportsEndDate: seedPeriod.reportsEndDate,
      trainingStartDate: seedPeriod.trainingStartDate,
      trainingEndDate: seedPeriod.trainingEndDate,
      weeklyReportCount: Object.keys(metadata.reports.weeklyReports).length,
      dailyReportCount: Object.keys(metadata.reports.dailyReports).length,
      freeDayCount,
      schoolDayCount,
      workDayCount,
      absenceCount: manualAbsences.length,
    },
  };
}
