import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { AuditEventRecord } from '../../../../shared/logic';

type AuditStore = {
  events: AuditEventRecord[];
};

const getAuditStorePath = () =>
  path.join(app.getPath('userData'), 'logic', 'audit', 'events.json');

const ensureStoreDir = async () => {
  await fs.mkdir(path.dirname(getAuditStorePath()), { recursive: true });
};

const isMissingError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'ENOENT';

export const readAuditEvents = async (): Promise<AuditEventRecord[]> => {
  try {
    const raw = await fs.readFile(getAuditStorePath(), 'utf-8');
    const parsed = JSON.parse(raw) as AuditStore;
    if (!parsed || !Array.isArray(parsed.events)) {
      return [];
    }
    return parsed.events
      .map((event) => {
        if (
          typeof event !== 'object' ||
          event === null ||
          typeof event.id !== 'string' ||
          typeof event.createdAt !== 'string' ||
          typeof event.type !== 'string' ||
          typeof event.actor !== 'string' ||
          typeof event.payload !== 'object' ||
          event.payload === null
        ) {
          return null;
        }
        const previousHash =
          event.previousHash === null || typeof event.previousHash === 'string'
            ? event.previousHash
            : null;
        const hash = typeof event.hash === 'string' ? event.hash : '';
        return {
          id: event.id,
          createdAt: event.createdAt,
          type: event.type,
          actor: event.actor,
          payload: event.payload as Record<string, unknown>,
          previousHash,
          hash,
        } satisfies AuditEventRecord;
      })
      .filter((event): event is AuditEventRecord => event !== null);
  } catch (error) {
    if (isMissingError(error)) {
      return [];
    }
    throw error;
  }
};

export const writeAuditEvents = async (events: AuditEventRecord[]) => {
  await ensureStoreDir();
  const payload: AuditStore = { events };
  await fs.writeFile(getAuditStorePath(), JSON.stringify(payload, null, 2), 'utf-8');
};
