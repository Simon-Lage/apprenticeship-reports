import {
  AbsenceCreateInput,
  AbsenceRecord,
  AbsenceType,
  AbsenceUpdateInput,
  ConfigRecord,
  DailyReportCreateInput,
  DailyReportEntryInput,
  DailyReportEntryRecord,
  DailyReportRecord,
  DailyReportUpdateInput,
  DayType,
  EntryCreateInput,
  EntryRecord,
  EntryUpdateInput,
  TimetableRecord,
  WeeklyReportCreateInput,
  WeeklyReportRecord,
  WeeklyReportUpdateInput,
} from '../../../shared/logic';

export type ConfigRepositoryAdapter = {
  getConfig: () => Promise<ConfigRecord | null>;
  initializeConfig: (payload: ConfigRecord) => Promise<ConfigRecord>;
  updateConfig: (payload: Partial<ConfigRecord>) => Promise<ConfigRecord>;
  resetConfig: () => Promise<boolean>;
};

export type TimetableRepositoryAdapter = {
  getTimetable: () => Promise<TimetableRecord[]>;
  replaceTimetable: (payload: TimetableRecord[]) => Promise<void>;
};

export type EntriesRepositoryAdapter = {
  getEntries: () => Promise<EntryRecord[]>;
  getEntriesByDayType: (payload: { dayType: DayType }) => Promise<EntryRecord[]>;
  getEntriesByWeeklyReportId: (payload: { weeklyReportId: number }) => Promise<EntryRecord[]>;
  getEntry: (payload: { id: number }) => Promise<EntryRecord | null>;
  setEntry: (payload: EntryCreateInput) => Promise<EntryRecord>;
  updateEntry: (payload: { id: number; patch: EntryUpdateInput }) => Promise<EntryRecord>;
  deleteEntry: (payload: { id: number }) => Promise<boolean>;
};

export type AbsencesRepositoryAdapter = {
  getAbsences: () => Promise<AbsenceRecord[]>;
  getAbsencesByType: (payload: { type: AbsenceType }) => Promise<AbsenceRecord[]>;
  getAbsence: (payload: { id: string }) => Promise<AbsenceRecord | null>;
  setAbsence: (payload: AbsenceCreateInput) => Promise<AbsenceRecord>;
  updateAbsence: (payload: { id: string; patch: AbsenceUpdateInput }) => Promise<AbsenceRecord>;
  deleteAbsence: (payload: { id: string }) => Promise<boolean>;
};

export type WeeklyReportsRepositoryAdapter = {
  getWeeklyReports: () => Promise<WeeklyReportRecord[]>;
  setWeeklyReport: (payload: WeeklyReportCreateInput) => Promise<WeeklyReportRecord>;
  updateWeeklyReport: (
    payload: { id: number; patch: WeeklyReportUpdateInput },
  ) => Promise<WeeklyReportRecord>;
  deleteWeeklyReport: (payload: { id: number }) => Promise<boolean>;
  getWeeklyReport: (payload: { id: number }) => Promise<WeeklyReportRecord | null>;
};

export type DailyReportsRepositoryAdapter = {
  getDailyReports: (payload?: { fromDate?: string; toDate?: string; dayType?: DayType }) => Promise<
    DailyReportRecord[]
  >;
  getDailyReportsByWeeklyReportId: (payload: { weeklyReportId: number }) => Promise<
    DailyReportRecord[]
  >;
  getDailyReport: (payload: { id: string }) => Promise<DailyReportRecord | null>;
  getDailyReportEntries: (payload: { dailyReportId: string }) => Promise<DailyReportEntryRecord[]>;
  setDailyReport: (payload: DailyReportCreateInput) => Promise<DailyReportRecord>;
  updateDailyReport: (
    payload: { id: string; patch: DailyReportUpdateInput },
  ) => Promise<DailyReportRecord>;
  deleteDailyReport: (payload: { id: string }) => Promise<boolean>;
  setDailyReportEntries: (
    payload: { dailyReportId: string; entries: DailyReportEntryInput[] },
  ) => Promise<DailyReportEntryRecord[]>;
  removeDailyReportEntry: (payload: {
    dailyReportId: string;
    entryId: number;
  }) => Promise<boolean>;
};

export type LogicAdapters = {
  config: ConfigRepositoryAdapter;
  timetable: TimetableRepositoryAdapter;
  entries: EntriesRepositoryAdapter;
  absences: AbsencesRepositoryAdapter;
  weeklyReports: WeeklyReportsRepositoryAdapter;
  dailyReports: DailyReportsRepositoryAdapter;
};
