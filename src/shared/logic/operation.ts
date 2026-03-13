export type LogicOperationErrorCode =
  | 'access_denied'
  | 'validation_error'
  | 'not_found'
  | 'conflict'
  | 'not_supported'
  | 'unexpected';

export type LogicOperationError = {
  code: LogicOperationErrorCode;
  message: string;
  fields?: Record<string, string>;
};

export type LogicOperationSuccess<T> = {
  ok: true;
  value: T;
  at: string;
};

export type LogicOperationFailure = {
  ok: false;
  error: LogicOperationError;
  at: string;
};

export type LogicOperationResult<T> =
  | LogicOperationSuccess<T>
  | LogicOperationFailure;
