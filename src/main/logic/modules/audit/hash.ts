import crypto from 'crypto';
import { AuditEventRecord } from '../../../../shared/logic';

type HashableAuditEvent = Omit<AuditEventRecord, 'hash'>;

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
    return `{${pairs.join(',')}}`;
  }
  return JSON.stringify(String(value));
};

const hashString = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');

const toHashPayload = (event: HashableAuditEvent) =>
  stableStringify({
    id: event.id,
    createdAt: event.createdAt,
    type: event.type,
    actor: event.actor,
    payload: event.payload,
    previousHash: event.previousHash,
  });

export const computeAuditHash = (event: HashableAuditEvent) =>
  hashString(toHashPayload(event));

export const attachAuditHash = (
  event: Omit<AuditEventRecord, 'hash'>,
): AuditEventRecord => ({
  ...event,
  hash: computeAuditHash(event),
});

export const normalizeAuditChain = (events: AuditEventRecord[]) => {
  const normalized: AuditEventRecord[] = [];
  let previousHash: string | null = null;
  for (const event of events) {
    const next = attachAuditHash({
      id: event.id,
      createdAt: event.createdAt,
      type: event.type,
      actor: event.actor,
      payload: event.payload,
      previousHash,
    });
    normalized.push(next);
    previousHash = next.hash;
  }
  return normalized;
};

export type AuditChainIssue = {
  id: string;
  code: 'audit_previous_hash_mismatch' | 'audit_hash_mismatch';
  message: string;
};

export const verifyAuditChain = (events: AuditEventRecord[]): AuditChainIssue[] => {
  const issues: AuditChainIssue[] = [];
  let previousHash: string | null = null;
  for (const event of events) {
    if (event.previousHash !== previousHash) {
      issues.push({
        id: event.id,
        code: 'audit_previous_hash_mismatch',
        message: 'Audit event previous hash does not match expected chain value',
      });
    }
    const expectedHash = computeAuditHash({
      id: event.id,
      createdAt: event.createdAt,
      type: event.type,
      actor: event.actor,
      payload: event.payload,
      previousHash: event.previousHash,
    });
    if (event.hash !== expectedHash) {
      issues.push({
        id: event.id,
        code: 'audit_hash_mismatch',
        message: 'Audit event hash does not match computed value',
      });
    }
    previousHash = event.hash;
  }
  return issues;
};
