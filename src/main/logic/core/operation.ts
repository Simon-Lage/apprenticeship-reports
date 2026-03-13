import {
  LogicOperationErrorCode,
  LogicOperationFailure,
  LogicOperationResult,
  LogicOperationSuccess,
} from '../../../shared/logic';

const nowIso = () => new Date().toISOString();

export const ok = <T>(value: T): LogicOperationSuccess<T> => ({
  ok: true,
  value,
  at: nowIso(),
});

export const fail = (
  code: LogicOperationErrorCode,
  message: string,
  fields?: Record<string, string>,
): LogicOperationFailure => ({
  ok: false,
  at: nowIso(),
  error: {
    code,
    message,
    fields,
  },
});

export const isFailure = <T>(
  result: LogicOperationResult<T>,
): result is LogicOperationFailure => !result.ok;

