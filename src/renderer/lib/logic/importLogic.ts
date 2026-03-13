import { AbsenceRecord, TimetableRecord } from '../../../shared/logic';
import { LogicClient } from './client';

export class ImportLogic {
  constructor(private readonly client: LogicClient) {}

  async previewImportArchive(payload: { sourcePath: string }) {
    return this.client.call('import', 'previewImportArchive', payload);
  }

  async importDataArchive(payload: { sourcePath: string; mode: 'replace' | 'merge' }) {
    return this.client.call('import', 'importDataArchive', payload);
  }

  async importTimetable(payload: { entries: TimetableRecord[] }) {
    return this.client.call('import', 'importTimetable', payload);
  }

  async importAbsences(payload: { absences: AbsenceRecord[] }) {
    return this.client.call('import', 'importAbsences', payload);
  }
}

