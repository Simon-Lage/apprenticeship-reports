export type LogicScope =
  | '*'
  | 'config:read'
  | 'config:write'
  | 'timetable:read'
  | 'timetable:write'
  | 'entries:read'
  | 'entries:write'
  | 'absences:read'
  | 'absences:write'
  | 'dailyReports:read'
  | 'dailyReports:write'
  | 'weeklyReports:read'
  | 'weeklyReports:write'
  | 'reportGeneration:read'
  | 'export:read'
  | 'import:write'
  | 'integrity:read'
  | 'integrity:write'
  | 'audit:read'
  | 'audit:write'
  | 'backup:read'
  | 'backup:write';

export type LogicAccessContext = {
  actor: string;
  source: 'renderer' | 'main' | 'system';
  scopes: LogicScope[];
};
