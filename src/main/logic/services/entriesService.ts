import {
  LogicAccessContext,
  LogicOperationResult,
  EntryCreateInput,
  EntryRecord,
  EntryUpdateInput,
} from '../../../shared/logic';
import { EntriesRepositoryAdapter } from '../adapters';
import { requireScope } from '../core/access';
import { isFailure, ok, fail } from '../core/operation';
import {
  validateCreateEntryInput,
  validateUpdateEntryPatch,
} from '../modules/entries/rules';
import { createImplemented } from './utils';

export class EntriesService {
  constructor(private readonly repository: EntriesRepositoryAdapter) {}

  private entries: EntryRecord[] = [];

  private lastId = 0;

  private ensureReadAccess(access: LogicAccessContext) {
    return requireScope(access, 'entries:read');
  }

  private ensureWriteAccess(access: LogicAccessContext) {
    return requireScope(access, 'entries:write');
  }

  private syncLastId() {
    this.lastId =
      this.entries.length > 0
        ? Math.max(...this.entries.map((entry) => entry.id))
        : 0;
  }

  private async readEntries() {
    const persisted = await this.repository.getEntries();
    this.entries = [...persisted];
    this.syncLastId();
    return this.entries;
  }

  async listEntries(payload: { access: LogicAccessContext }) {
    const denied = this.ensureReadAccess(payload.access);
    if (denied) {
      return createImplemented(denied);
    }
    const entries = await this.readEntries();
    return createImplemented(ok(entries));
  }

  async listEntriesByDayType(payload: {
    access: LogicAccessContext;
    dayType: EntryRecord['dayType'];
  }) {
    const denied = this.ensureReadAccess(payload.access);
    if (denied) {
      return createImplemented(denied);
    }
    const entries = await this.readEntries();
    return createImplemented(
      ok(entries.filter((entry) => entry.dayType === payload.dayType)),
    );
  }

  async createEntry(payload: EntryCreateInput & { access: LogicAccessContext }) {
    const denied = this.ensureWriteAccess(payload.access);
    if (denied) {
      return createImplemented(denied);
    }
    await this.readEntries();
    const validated = validateCreateEntryInput(payload);
    if (isFailure(validated)) {
      return createImplemented(validated);
    }
    const created = await this.repository.setEntry(validated.value);
    this.entries.push(created);
    this.syncLastId();
    return createImplemented(ok(created));
  }

  async updateEntry(payload: {
    access: LogicAccessContext;
    id: number;
    patch: EntryUpdateInput;
  }) {
    const denied = this.ensureWriteAccess(payload.access);
    if (denied) {
      return createImplemented(denied);
    }
    await this.readEntries();
    const index = this.entries.findIndex((entry) => entry.id === payload.id);
    if (index < 0) {
      return createImplemented(
        fail('not_found', 'entry_not_found', {
          id: 'not_found',
        }),
      );
    }
    const current = this.entries[index];
    const validated = validateUpdateEntryPatch(payload.patch, {
      activities: current.activities,
      dayType: current.dayType,
    });
    if (isFailure(validated)) {
      return createImplemented(validated);
    }
    const next: EntryRecord = {
      ...current,
      activities: validated.value.activities,
      dayType: validated.value.dayType,
    };
    this.entries[index] = next;
    await this.repository.updateEntry({
      id: payload.id,
      patch: {
        activities: validated.value.activities,
        dayType: validated.value.dayType,
      },
    });
    return createImplemented(ok(next));
  }

  async deleteEntry(payload: { access: LogicAccessContext; id: number }) {
    const denied = this.ensureWriteAccess(payload.access);
    if (denied) {
      return createImplemented(denied);
    }
    await this.readEntries();
    const exists = this.entries.some((entry) => entry.id === payload.id);
    if (!exists) {
      return createImplemented(
        fail('not_found', 'entry_not_found', {
          id: 'not_found',
        }),
      );
    }
    this.entries = this.entries.filter((entry) => entry.id !== payload.id);
    await this.repository.deleteEntry({ id: payload.id });
    return createImplemented(ok({ deleted: true, id: payload.id }));
  }
}
