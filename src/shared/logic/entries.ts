import { DayType } from './common';

export type EntryRecord = {
  id: number;
  activities: string;
  dayType: DayType;
};

export type EntryCreateInput = {
  activities: string;
  dayType: DayType;
};

export type EntryUpdateInput = Partial<EntryCreateInput>;

