import {
  LogicAccessContext,
  AbsenceCreateInput,
  AbsenceRecord,
  AbsenceType,
  AbsenceUpdateInput,
} from '../../../shared/logic';
import { AbsencesRepositoryAdapter } from '../adapters';
import { requireScope } from '../core/access';
import { fail, isFailure, ok } from '../core/operation';
import {
  validateCreateAbsenceInput,
  validateUpdateAbsencePatch,
} from '../modules/absences/rules';
import { createImplemented } from './utils';

export class AbsencesService {
  constructor(private readonly repository: AbsencesRepositoryAdapter) {}

  private absences: AbsenceRecord[] = [];

  private ensureReadAccess(access: LogicAccessContext) {
    return requireScope(access, 'absences:read');
  }

  private ensureWriteAccess(access: LogicAccessContext) {
    return requireScope(access, 'absences:write');
  }

  private async readAbsences() {
    const persisted = await this.repository.getAbsences();
    this.absences = [...persisted];
    return this.absences;
  }

  async listAbsences(payload: { access: LogicAccessContext }) {
    const denied = this.ensureReadAccess(payload.access);
    if (denied) {
      return createImplemented(denied);
    }
    const absences = await this.readAbsences();
    return createImplemented(ok(absences));
  }

  async listAbsencesByType(payload: {
    access: LogicAccessContext;
    type: AbsenceType;
  }) {
    const denied = this.ensureReadAccess(payload.access);
    if (denied) {
      return createImplemented(denied);
    }
    const absences = await this.readAbsences();
    return createImplemented(
      ok(absences.filter((absence) => absence.type === payload.type)),
    );
  }

  async createAbsence(payload: AbsenceCreateInput & { access: LogicAccessContext }) {
    const denied = this.ensureWriteAccess(payload.access);
    if (denied) {
      return createImplemented(denied);
    }
    await this.readAbsences();
    const validated = validateCreateAbsenceInput(payload);
    if (isFailure(validated)) {
      return createImplemented(validated);
    }
    const duplicate = this.absences.some((absence) => absence.id === validated.value.id);
    if (duplicate) {
      return createImplemented(
        fail('conflict', 'absence_id_already_exists', {
          id: 'duplicate',
        }),
      );
    }
    const next: AbsenceRecord = {
      id: validated.value.id,
      type: validated.value.type,
      fromDate: validated.value.fromDate,
      toDate: validated.value.toDate,
      note: validated.value.note ?? null,
    };
    this.absences.push(next);
    await this.repository.setAbsence(validated.value);
    return createImplemented(ok(next));
  }

  async updateAbsence(payload: {
    access: LogicAccessContext;
    id: string;
    patch: AbsenceUpdateInput;
  }) {
    const denied = this.ensureWriteAccess(payload.access);
    if (denied) {
      return createImplemented(denied);
    }
    await this.readAbsences();
    const index = this.absences.findIndex((absence) => absence.id === payload.id);
    if (index < 0) {
      return createImplemented(
        fail('not_found', 'absence_not_found', {
          id: 'not_found',
        }),
      );
    }
    const current = this.absences[index];
    const validated = validateUpdateAbsencePatch(payload.patch, {
      id: current.id,
      type: current.type,
      fromDate: current.fromDate,
      toDate: current.toDate,
      note: current.note,
    });
    if (isFailure(validated)) {
      return createImplemented(validated);
    }
    const next: AbsenceRecord = {
      id: current.id,
      type: validated.value.type,
      fromDate: validated.value.fromDate,
      toDate: validated.value.toDate,
      note: validated.value.note ?? null,
    };
    this.absences[index] = next;
    await this.repository.updateAbsence({
      id: payload.id,
      patch: {
        type: validated.value.type,
        fromDate: validated.value.fromDate,
        toDate: validated.value.toDate,
        note: validated.value.note ?? null,
      },
    });
    return createImplemented(ok(next));
  }

  async deleteAbsence(payload: { access: LogicAccessContext; id: string }) {
    const denied = this.ensureWriteAccess(payload.access);
    if (denied) {
      return createImplemented(denied);
    }
    await this.readAbsences();
    const exists = this.absences.some((absence) => absence.id === payload.id);
    if (!exists) {
      return createImplemented(
        fail('not_found', 'absence_not_found', {
          id: 'not_found',
        }),
      );
    }
    this.absences = this.absences.filter((absence) => absence.id !== payload.id);
    await this.repository.deleteAbsence({ id: payload.id });
    return createImplemented(ok({ deleted: true, id: payload.id }));
  }

  async importHolidays(payload: {
    access: LogicAccessContext;
    holidays: AbsenceRecord[];
  }) {
    const denied = this.ensureWriteAccess(payload.access);
    if (denied) {
      return createImplemented(denied);
    }
    await this.readAbsences();
    let imported = 0;
    for (const holiday of payload.holidays) {
      const validated = validateCreateAbsenceInput({
        id: holiday.id,
        type: holiday.type,
        fromDate: holiday.fromDate,
        toDate: holiday.toDate,
        note: holiday.note,
      });
      if (isFailure(validated)) {
        continue;
      }
      const duplicate = this.absences.some((absence) => absence.id === holiday.id);
      if (duplicate) {
        continue;
      }
      this.absences.push({
        id: validated.value.id,
        type: validated.value.type,
        fromDate: validated.value.fromDate,
        toDate: validated.value.toDate,
        note: validated.value.note ?? null,
      });
      await this.repository.setAbsence(validated.value);
      imported += 1;
    }
    return createImplemented(ok({ imported }));
  }
}
