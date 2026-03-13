export type IntegrityIssueSeverity = 'low' | 'medium' | 'high';

export type IntegrityIssue = {
  id: string;
  code: string;
  severity: IntegrityIssueSeverity;
  message: string;
};

export type IntegrityReport = {
  checkedAt: string;
  issues: IntegrityIssue[];
};

