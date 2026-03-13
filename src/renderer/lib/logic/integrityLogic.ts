import { LogicClient } from './client';

export class IntegrityLogic {
  constructor(private readonly client: LogicClient) {}

  async runIntegrityCheck() {
    return this.client.call('integrity', 'runIntegrityCheck');
  }

  async trimAllTextFields() {
    return this.client.call('integrity', 'trimAllTextFields');
  }

  async verifySchemaCompatibility(payload?: { version?: number }) {
    return this.client.call('integrity', 'verifySchemaCompatibility', payload);
  }

  async buildRevisionSnapshot() {
    return this.client.call('integrity', 'buildRevisionSnapshot');
  }
}

