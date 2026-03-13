import { ConfigRecord } from '../../../shared/logic';
import { LogicClient } from './client';

export class ConfigLogic {
  constructor(private readonly client: LogicClient) {}

  async getConfig() {
    return this.client.call('config', 'getConfig');
  }

  async initializeConfig(payload: ConfigRecord) {
    return this.client.call('config', 'initializeConfig', payload);
  }

  async updateConfig(payload: Partial<ConfigRecord>) {
    return this.client.call('config', 'updateConfig', payload);
  }

  async resetConfig() {
    return this.client.call('config', 'resetConfig');
  }

  async getStatus() {
    return this.client.call('config', 'getStatus');
  }
}
