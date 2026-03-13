import {
  LogicAccessContext,
  LogicDispatchRequest,
  LogicServiceName,
  LogicScope,
  LogicStubResult,
} from '../../shared/logic';
import { getAuthSessionState } from '../auth/runtime';
import { getRequiredScopeForAction } from './core/policy';
import {
  buildLogicServiceCatalog,
  createLogicServices,
  LogicServices,
} from './services/index';

type ServiceValue = LogicServices[LogicServiceName];
type ServiceMethod = (payload?: unknown) => Promise<LogicStubResult<unknown>>;

export class LogicDispatcher {
  private readonly services: LogicServices;

  constructor() {
    this.services = createLogicServices();
  }

  async dispatch(
    request: LogicDispatchRequest,
  ): Promise<LogicStubResult<unknown>> {
    const service = this.services[request.service] as ServiceValue | undefined;
    if (!service) {
      throw new Error(`logic_service_not_found:${request.service}`);
    }
    const actionCandidate = (service as unknown as Record<string, unknown>)[
      request.action
    ];
    if (typeof actionCandidate !== 'function') {
      throw new Error(
        `logic_action_not_found:${request.service}.${request.action}`,
      );
    }
    const action = actionCandidate as ServiceMethod;
    const result = await action.call(
      service,
      this.buildSecuredPayload(request),
    );
    await this.appendAuditEvent(request, result);
    return result;
  }

  getCatalog() {
    return buildLogicServiceCatalog(this.services);
  }

  private buildAccessContext(scope: LogicScope): LogicAccessContext {
    const session = getAuthSessionState();
    return {
      actor: session.user?.id ?? session.method ?? 'local',
      source: 'main',
      scopes: [scope],
    };
  }

  private buildSecuredPayload(request: LogicDispatchRequest) {
    const requiredScope = getRequiredScopeForAction(
      request.service,
      request.action,
    );
    if (!requiredScope) {
      throw new Error(
        `logic_action_scope_not_defined:${request.service}.${request.action}`,
      );
    }
    if (request.service !== 'entries' && request.service !== 'absences') {
      return request.payload;
    }
    const access = this.buildAccessContext(requiredScope);
    if (request.payload === undefined) {
      return { access };
    }
    if (
      typeof request.payload === 'object' &&
      request.payload !== null &&
      !Array.isArray(request.payload)
    ) {
      return {
        ...(request.payload as Record<string, unknown>),
        access,
      };
    }
    throw new Error(
      `logic_payload_invalid:${request.service}.${request.action}`,
    );
  }

  private async appendAuditEvent(
    request: LogicDispatchRequest,
    result: LogicStubResult<unknown>,
  ) {
    if (request.service === 'audit') {
      return;
    }
    const session = getAuthSessionState();
    const actor = session.user?.id ?? session.method ?? 'local';
    const auditResult = await this.services.audit.appendAuditEvent({
      type: `logic.${request.service}.${request.action}`,
      actor,
      payload: {
        implemented: result.implemented,
      },
    });
    if (!auditResult.data.ok) {
      /* noop */
    }
  }
}
