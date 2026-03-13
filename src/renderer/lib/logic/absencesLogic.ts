import {
  AbsenceCreateInput,
  AbsenceRecord,
  AbsenceType,
  AbsenceUpdateInput,
} from '../../../shared/logic';
import { LogicClient } from './client';

export class AbsencesLogic {
  constructor(private readonly client: LogicClient) {}

  async listAbsences() {
    return this.client.call('absences', 'listAbsences');
  }

  async listAbsencesByType(payload: { type: AbsenceType }) {
    return this.client.call('absences', 'listAbsencesByType', payload);
  }

  async createAbsence(payload: AbsenceCreateInput) {
    return this.client.call('absences', 'createAbsence', payload);
  }

  async updateAbsence(payload: { id: string; patch: AbsenceUpdateInput }) {
    return this.client.call('absences', 'updateAbsence', payload);
  }

  async deleteAbsence(payload: { id: string }) {
    return this.client.call('absences', 'deleteAbsence', payload);
  }

  async importHolidays(payload: { holidays: AbsenceRecord[] }) {
    return this.client.call('absences', 'importHolidays', payload);
  }
}
