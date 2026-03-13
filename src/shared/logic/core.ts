export type LogicStubResult<T> = {
  implemented: boolean;
  data: T;
  touchedAt: string;
};

export type LogicServiceName =
  | 'config'
  | 'timetable'
  | 'entries'
  | 'absences'
  | 'dailyReports'
  | 'weeklyReports'
  | 'reportGeneration'
  | 'export'
  | 'import'
  | 'integrity'
  | 'audit'
  | 'backup';
