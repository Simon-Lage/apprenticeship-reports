import {
  LogicActionPayload,
  LogicDispatchRequest,
  LogicDispatchResponse,
  LogicDispatchRequestOf,
  LogicServiceActionName,
  LogicServiceCatalog,
  LogicServiceName,
} from '../../../shared/logic';

export class LogicClient {
  private catalog: LogicServiceCatalog | null = null;

  async call<
    S extends LogicServiceName,
    A extends LogicServiceActionName<S>,
  >(
    service: S,
    action: A,
    ...args: undefined extends LogicActionPayload<S, A>
      ? [payload?: LogicActionPayload<S, A>]
      : [payload: LogicActionPayload<S, A>]
  ): Promise<LogicDispatchResponse<S, A>> {
    const payload = args[0] as LogicActionPayload<S, A>;
    const request = {
      service,
      action,
      payload,
    } as LogicDispatchRequestOf<S, A>;
    return (await window.electron.logic.dispatch(
      request as unknown as LogicDispatchRequest,
    )) as LogicDispatchResponse<
      S,
      A
    >;
  }

  async getCatalog() {
    const catalog = (await window.electron.logic.getCatalog()) as LogicServiceCatalog;
    this.catalog = catalog;
    return catalog;
  }

  getCachedCatalog() {
    return this.catalog;
  }
}
