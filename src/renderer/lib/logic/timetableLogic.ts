import { TimetableRecord } from '../../../shared/logic';
import { LogicClient } from './client';

export class TimetableLogic {
  constructor(private readonly client: LogicClient) {}

  async listTimetable() {
    return this.client.call('timetable', 'listTimetable');
  }

  async replaceTimetable(payload: TimetableRecord[]) {
    return this.client.call('timetable', 'replaceTimetable', payload);
  }

  async upsertTimetableEntry(payload: TimetableRecord) {
    return this.client.call('timetable', 'upsertTimetableEntry', payload);
  }

  async removeTimetableEntry(payload: { id: string }) {
    return this.client.call('timetable', 'removeTimetableEntry', payload);
  }

  async validateTimetable() {
    return this.client.call('timetable', 'validateTimetable');
  }

  async generateDayTemplate(payload: { weekday: number }) {
    return this.client.call('timetable', 'generateDayTemplate', payload);
  }
}
