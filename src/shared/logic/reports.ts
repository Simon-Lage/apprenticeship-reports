import { DayType } from './common';

export type DailyReportRecord = {
  id: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  dayType: DayType;
  weeklyReportId: number | null;
};

export type DailyReportCreateInput = {
  id?: string;
  date: string;
  dayType: DayType;
  weeklyReportId?: number | null;
};

export type DailyReportUpdateInput = Partial<Omit<DailyReportRecord, 'id'>>;

export type DailyReportEntryRecord = {
  dailyReportId: string;
  entryId: number;
  position: number;
};

export type DailyReportEntryInput = Omit<DailyReportEntryRecord, 'position'> & {
  position?: number;
};

export type WeeklyReportRecord = {
  id: number;
  weekStart: string;
  weekEnd: string;
  departmentWhenSent: string | null;
  trainerEmailWhenSent: string | null;
  sent: boolean;
};

export type WeeklyReportCreateInput = {
  weekStart: string;
  weekEnd: string;
  departmentWhenSent?: string | null;
  trainerEmailWhenSent?: string | null;
  sent?: boolean;
};

export type WeeklyReportUpdateInput = Partial<WeeklyReportCreateInput>;
