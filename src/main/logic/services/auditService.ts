import { AuditEventInput, AuditEventRecord } from '../../../shared/logic';
import { fail, ok } from '../core/operation';
import { attachAuditHash, normalizeAuditChain } from '../modules/audit/hash';
import { readAuditEvents, writeAuditEvents } from '../modules/audit/store';
import { createImplemented, nowIso, randomId } from './utils';

export class AuditService {
  private normalizeEventInput(payload: AuditEventInput) {
    const type = payload.type.trim();
    const actor = payload.actor.trim();
    if (!type) {
      return fail('validation_error', 'audit_type_required', {
        type: 'required',
      });
    }
    if (!actor) {
      return fail('validation_error', 'audit_actor_required', {
        actor: 'required',
      });
    }
    return ok({
      id: payload.id?.trim() || randomId('audit'),
      createdAt: payload.createdAt?.trim() || nowIso(),
      type,
      actor,
      payload: payload.payload ?? {},
    });
  }

  private async readNormalizedEvents() {
    const events = await readAuditEvents();
    const normalized = normalizeAuditChain(events);
    const changed =
      normalized.length !== events.length ||
      normalized.some(
        (event, index) =>
          event.hash !== events[index]?.hash ||
          event.previousHash !== events[index]?.previousHash,
      );
    if (changed) {
      await writeAuditEvents(normalized);
    }
    return normalized;
  }

  async listAuditEvents() {
    try {
      const events = await this.readNormalizedEvents();
      return createImplemented(ok(events));
    } catch {
      return createImplemented(
        fail('unexpected', 'audit_events_read_failed'),
      );
    }
  }

  async appendAuditEvent(payload: AuditEventInput) {
    const normalized = this.normalizeEventInput(payload);
    if (!normalized.ok) {
      return createImplemented(normalized);
    }
    const next = normalized.value;
    try {
      const current = await this.readNormalizedEvents();
      const previousHash = current.length > 0 ? current[current.length - 1].hash : null;
      const nextWithHash = attachAuditHash({
        ...next,
        previousHash,
      });
      current.push(nextWithHash);
      await writeAuditEvents(current);
      return createImplemented(ok(nextWithHash));
    } catch {
      return createImplemented(
        fail('unexpected', 'audit_event_write_failed'),
      );
    }
  }

  async clearAuditEvents() {
    try {
      await writeAuditEvents([]);
      return createImplemented(ok({ cleared: true }));
    } catch {
      return createImplemented(
        fail('unexpected', 'audit_events_clear_failed'),
      );
    }
  }
}
