import { AbsenceType } from './common';

export type AbsenceRecord = {
  id: string;
  type: AbsenceType;
  fromDate: string;
  toDate: string;
  note: string | null;
};

export type AbsenceCreateInput = Omit<AbsenceRecord, 'note'> & {
  note?: string | null;
};

export type AbsenceUpdateInput = Partial<Omit<AbsenceRecord, 'id'>>;

