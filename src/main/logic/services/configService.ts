import { ConfigRecord } from '../../../shared/logic';
import { ConfigRepositoryAdapter } from '../adapters';
import { fail, ok } from '../core/operation';
import { createImplemented } from './utils';

export class ConfigService {
  constructor(private readonly repository: ConfigRepositoryAdapter) {}

  private config: ConfigRecord | null = null;

  private initialized = false;

  async getConfig() {
    const config = await this.repository.getConfig();
    this.config = config;
    this.initialized = !!config;
    return createImplemented(ok(config));
  }

  async initializeConfig(payload: ConfigRecord) {
    const existing = await this.repository.getConfig();
    if (existing) {
      return createImplemented(
        fail('conflict', 'config_already_initialized'),
      );
    }
    if (!payload.id.trim() || !payload.name.trim() || !payload.surname.trim()) {
      return createImplemented(
        fail('validation_error', 'config_required_fields_missing', {
          id: payload.id.trim() ? '' : 'required',
          name: payload.name.trim() ? '' : 'required',
          surname: payload.surname.trim() ? '' : 'required',
        }),
      );
    }
    this.config = await this.repository.initializeConfig({
      ...payload,
      id: payload.id.trim(),
      name: payload.name.trim(),
      surname: payload.surname.trim(),
    });
    this.initialized = true;
    return createImplemented(ok(this.config));
  }

  async updateConfig(payload: Partial<ConfigRecord>) {
    const current = await this.repository.getConfig();
    if (!current && !payload.id) {
      return createImplemented(
        fail('validation_error', 'config_id_required_for_first_update', {
          id: 'required',
        }),
      );
    }
    this.config = await this.repository.updateConfig(payload);
    this.initialized = true;
    return createImplemented(ok(this.config));
  }

  async resetConfig() {
    const reset = await this.repository.resetConfig();
    this.config = null;
    this.initialized = false;
    return createImplemented(ok({ reset }));
  }

  async getStatus() {
    if (!this.config) {
      this.config = await this.repository.getConfig();
      this.initialized = !!this.config;
    }
    return createImplemented(ok({
      initialized: this.initialized,
    }));
  }
}
