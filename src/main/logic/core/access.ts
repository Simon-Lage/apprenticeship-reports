import { LogicAccessContext, LogicScope } from '../../../shared/logic';
import { fail } from './operation';

const hasScope = (access: LogicAccessContext, scope: LogicScope) =>
  access.scopes.includes('*') || access.scopes.includes(scope);

export const requireScope = (access: LogicAccessContext, scope: LogicScope) => {
  if (hasScope(access, scope)) {
    return null;
  }
  return fail(
    'access_denied',
    `missing scope: ${scope}`,
  );
};

