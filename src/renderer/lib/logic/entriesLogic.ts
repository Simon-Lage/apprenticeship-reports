import {
  DayType,
  EntryCreateInput,
  EntryUpdateInput,
} from '../../../shared/logic';
import { LogicClient } from './client';

export class EntriesLogic {
  constructor(private readonly client: LogicClient) {}

  async listEntries() {
    return this.client.call('entries', 'listEntries');
  }

  async listEntriesByDayType(payload: { dayType: DayType }) {
    return this.client.call('entries', 'listEntriesByDayType', payload);
  }

  async createEntry(payload: EntryCreateInput) {
    return this.client.call('entries', 'createEntry', payload);
  }

  async updateEntry(payload: { id: number; patch: EntryUpdateInput }) {
    return this.client.call('entries', 'updateEntry', payload);
  }

  async deleteEntry(payload: { id: number }) {
    return this.client.call('entries', 'deleteEntry', payload);
  }
}
