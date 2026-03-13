import { AuditEventInput } from '../../../shared/logic';
import { LogicClient } from './client';

export class AuditLogic {
  constructor(private readonly client: LogicClient) {}

  async listAuditEvents() {
    return this.client.call('audit', 'listAuditEvents');
  }

  async appendAuditEvent(payload: AuditEventInput) {
    return this.client.call('audit', 'appendAuditEvent', payload);
  }

  async clearAuditEvents() {
    return this.client.call('audit', 'clearAuditEvents');
  }
}

