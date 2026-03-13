import { TimetableRecord } from '../../../shared/logic';
import { TimetableRepositoryAdapter } from '../adapters';
import { fail, ok } from '../core/operation';
import { createImplemented, nowIso } from './utils';

export class TimetableService {
  constructor(private readonly repository: TimetableRepositoryAdapter) {}

  private entries: TimetableRecord[] = [];

  private lastGeneratedFromTemplateAt: string | null = null;

  async listTimetable() {
    this.entries = await this.repository.getTimetable();
    return createImplemented(ok(this.entries));
  }

  async replaceTimetable(payload: TimetableRecord[]) {
    const invalid = payload.find(
      (entry) =>
        !entry.id.trim() ||
        !entry.teacher.trim() ||
        !entry.subject.trim() ||
        entry.weekday < 1 ||
        entry.weekday > 7 ||
        entry.order < 1,
    );
    if (invalid) {
      return createImplemented(
        fail('validation_error', 'timetable_entry_invalid'),
      );
    }
    this.entries = [...payload];
    await this.repository.replaceTimetable(this.entries);
    return createImplemented(ok(this.entries));
  }

  async upsertTimetableEntry(payload: TimetableRecord) {
    this.entries = await this.repository.getTimetable();
    if (
      !payload.id.trim() ||
      !payload.teacher.trim() ||
      !payload.subject.trim() ||
      payload.weekday < 1 ||
      payload.weekday > 7 ||
      payload.order < 1
    ) {
      return createImplemented(
        fail('validation_error', 'timetable_entry_invalid'),
      );
    }
    const existingIndex = this.entries.findIndex(
      (entry) => entry.id === payload.id,
    );
    if (existingIndex >= 0) {
      this.entries[existingIndex] = payload;
    } else {
      this.entries.push(payload);
    }
    await this.repository.replaceTimetable(this.entries);
    return createImplemented(ok(payload));
  }

  async removeTimetableEntry(payload: { id: string }) {
    this.entries = await this.repository.getTimetable();
    const exists = this.entries.some((entry) => entry.id === payload.id);
    if (!exists) {
      return createImplemented(
        fail('not_found', 'timetable_entry_not_found', {
          id: 'not_found',
        }),
      );
    }
    this.entries = this.entries.filter((entry) => entry.id !== payload.id);
    await this.repository.replaceTimetable(this.entries);
    return createImplemented(ok({ deleted: true, id: payload.id }));
  }

  async validateTimetable() {
    this.entries = await this.repository.getTimetable();
    const duplicateSlots = new Set<string>();
    const duplicateIds = new Set<string>();
    const seenSlots = new Set<string>();
    const seenIds = new Set<string>();
    this.entries.forEach((entry) => {
      const slot = `${entry.weekday}:${entry.order}`;
      if (seenSlots.has(slot)) {
        duplicateSlots.add(slot);
      } else {
        seenSlots.add(slot);
      }
      if (seenIds.has(entry.id)) {
        duplicateIds.add(entry.id);
      } else {
        seenIds.add(entry.id);
      }
    });
    const issues: string[] = [];
    duplicateSlots.forEach((slot) => issues.push(`duplicate_slot:${slot}`));
    duplicateIds.forEach((id) => issues.push(`duplicate_id:${id}`));
    return createImplemented(ok({
      valid: issues.length === 0,
      issues,
    }));
  }

  async generateDayTemplate(payload: { weekday: number }) {
    this.entries = await this.repository.getTimetable();
    this.lastGeneratedFromTemplateAt = nowIso();
    const template = this.entries.filter((entry) => entry.weekday === payload.weekday);
    return createImplemented(ok({
      generatedAt: this.lastGeneratedFromTemplateAt,
      template,
    }));
  }
}
