export type AuditEventRecord = {
  id: string;
  createdAt: string;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
  previousHash: string | null;
  hash: string;
};

export type AuditEventInput = Omit<
  AuditEventRecord,
  'id' | 'createdAt' | 'previousHash' | 'hash'
> & {
  id?: string;
  createdAt?: string;
};
