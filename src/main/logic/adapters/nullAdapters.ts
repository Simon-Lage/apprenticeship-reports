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
import {
  AbsencesRepositoryAdapter,
  ConfigRepositoryAdapter,
  DailyReportsRepositoryAdapter,
  EntriesRepositoryAdapter,
  LogicAdapters,
  TimetableRepositoryAdapter,
  WeeklyReportsRepositoryAdapter,
} from './types';

const createDefaultConfigRecord = (): ConfigRecord => ({
  id: '',
  name: '',
  surname: '',
  ihkLink: null,
  department: null,
  trainerEmail: null,
  trainingStart: null,
  trainingEnd: null,
  settings: {},
});

const createDefaultEntryRecord = (payload?: Partial<EntryRecord>): EntryRecord => ({
  id: payload?.id ?? 0,
  activities: payload?.activities ?? '',
  dayType: payload?.dayType ?? 'work',
});

const createDefaultAbsenceRecord = (
  payload?: Partial<AbsenceRecord>,
): AbsenceRecord => ({
  id: payload?.id ?? '',
  type: payload?.type ?? 'other',
  fromDate: payload?.fromDate ?? '',
  toDate: payload?.toDate ?? '',
  note: payload?.note ?? null,
});

const createDefaultWeeklyReportRecord = (
  payload?: Partial<WeeklyReportRecord>,
): WeeklyReportRecord => ({
  id: payload?.id ?? 0,
  weekStart: payload?.weekStart ?? '',
  weekEnd: payload?.weekEnd ?? '',
  departmentWhenSent: payload?.departmentWhenSent ?? null,
  trainerEmailWhenSent: payload?.trainerEmailWhenSent ?? null,
  sent: payload?.sent ?? false,
});

const createDefaultDailyReportRecord = (
  payload?: Partial<DailyReportRecord>,
): DailyReportRecord => ({
  id: payload?.id ?? '',
  date: payload?.date ?? '',
  createdAt: payload?.createdAt ?? '',
  updatedAt: payload?.updatedAt ?? '',
  dayType: payload?.dayType ?? 'work',
  weeklyReportId: payload?.weeklyReportId ?? null,
});

const createConfigAdapter = (): ConfigRepositoryAdapter => ({
  async getConfig() {
    return null;
  },
  async initializeConfig(payload: ConfigRecord) {
    return payload;
  },
  async updateConfig(payload: Partial<ConfigRecord>) {
    return {
      ...createDefaultConfigRecord(),
      ...payload,
      settings: {
        ...createDefaultConfigRecord().settings,
        ...(payload.settings ?? {}),
      },
    };
  },
  async resetConfig() {
    return true;
  },
});

const createTimetableAdapter = (): TimetableRepositoryAdapter => ({
  async getTimetable() {
    return [] as TimetableRecord[];
  },
  async replaceTimetable(_payload: TimetableRecord[]) {
    return;
  },
});

const createEntriesAdapter = (): EntriesRepositoryAdapter => ({
  async getEntries() {
    return [] as EntryRecord[];
  },
  async getEntriesByDayType(_payload: { dayType: DayType }) {
    return [] as EntryRecord[];
  },
  async getEntriesByWeeklyReportId(_payload: { weeklyReportId: number }) {
    return [] as EntryRecord[];
  },
  async getEntry(_payload: { id: number }) {
    return null;
  },
  async setEntry(payload: EntryCreateInput) {
    return createDefaultEntryRecord({
      activities: payload.activities,
      dayType: payload.dayType,
    });
  },
  async updateEntry(payload: { id: number; patch: EntryUpdateInput }) {
    return createDefaultEntryRecord({
      id: payload.id,
      ...payload.patch,
    });
  },
  async deleteEntry(_payload: { id: number }) {
    return true;
  },
});

const createAbsencesAdapter = (): AbsencesRepositoryAdapter => ({
  async getAbsences() {
    return [] as AbsenceRecord[];
  },
  async getAbsencesByType(_payload: { type: AbsenceType }) {
    return [] as AbsenceRecord[];
  },
  async getAbsence(_payload: { id: string }) {
    return null;
  },
  async setAbsence(payload: AbsenceCreateInput) {
    return createDefaultAbsenceRecord({
      ...payload,
      note: payload.note ?? null,
    });
  },
  async updateAbsence(payload: { id: string; patch: AbsenceUpdateInput }) {
    return createDefaultAbsenceRecord({
      id: payload.id,
      ...payload.patch,
    });
  },
  async deleteAbsence(_payload: { id: string }) {
    return true;
  },
});

const createWeeklyReportsAdapter = (): WeeklyReportsRepositoryAdapter => ({
  async getWeeklyReports() {
    return [] as WeeklyReportRecord[];
  },
  async setWeeklyReport(payload: WeeklyReportCreateInput) {
    return createDefaultWeeklyReportRecord({
      weekStart: payload.weekStart,
      weekEnd: payload.weekEnd,
      departmentWhenSent: payload.departmentWhenSent ?? null,
      trainerEmailWhenSent: payload.trainerEmailWhenSent ?? null,
      sent: payload.sent ?? false,
    });
  },
  async updateWeeklyReport(payload: { id: number; patch: WeeklyReportUpdateInput }) {
    return createDefaultWeeklyReportRecord({
      id: payload.id,
      ...payload.patch,
    });
  },
  async deleteWeeklyReport(_payload: { id: number }) {
    return true;
  },
  async getWeeklyReport(_payload: { id: number }) {
    return null;
  },
});

const createDailyReportsAdapter = (): DailyReportsRepositoryAdapter => ({
  async getDailyReports(_payload?: { fromDate?: string; toDate?: string; dayType?: DayType }) {
    return [] as DailyReportRecord[];
  },
  async getDailyReportsByWeeklyReportId(_payload: { weeklyReportId: number }) {
    return [] as DailyReportRecord[];
  },
  async getDailyReport(_payload: { id: string }) {
    return null;
  },
  async getDailyReportEntries(_payload: { dailyReportId: string }) {
    return [] as DailyReportEntryRecord[];
  },
  async setDailyReport(payload: DailyReportCreateInput) {
    return createDefaultDailyReportRecord({
      date: payload.date,
      dayType: payload.dayType,
      weeklyReportId: payload.weeklyReportId ?? null,
    });
  },
  async updateDailyReport(payload: { id: string; patch: DailyReportUpdateInput }) {
    return createDefaultDailyReportRecord({
      id: payload.id,
      ...payload.patch,
    });
  },
  async deleteDailyReport(_payload: { id: string }) {
    return true;
  },
  async setDailyReportEntries(_payload: {
    dailyReportId: string;
    entries: DailyReportEntryInput[];
  }) {
    return [] as DailyReportEntryRecord[];
  },
  async removeDailyReportEntry(_payload: { dailyReportId: string; entryId: number }) {
    return true;
  },
});

export const createNullLogicAdapters = (): LogicAdapters => ({
  config: createConfigAdapter(),
  timetable: createTimetableAdapter(),
  entries: createEntriesAdapter(),
  absences: createAbsencesAdapter(),
  weeklyReports: createWeeklyReportsAdapter(),
  dailyReports: createDailyReportsAdapter(),
});
