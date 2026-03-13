import { AbsenceCreateInput, AbsenceType, AbsenceUpdateInput } from '../../../../shared/logic';
import { fail, ok } from '../../core/operation';

const validAbsenceTypes: AbsenceType[] = [
  'vacation',
  'sick',
  'weekend',
  'holiday',
  'school_break',
  'other',
];

const normalizeOptional = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const normalizeRequired = (value: string) => value.trim();

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const isValidType = (value: string): value is AbsenceType =>
  validAbsenceTypes.includes(value as AbsenceType);

export const validateCreateAbsenceInput = (input: AbsenceCreateInput) => {
  const id = normalizeRequired(input.id);
  const fromDate = normalizeRequired(input.fromDate);
  const toDate = normalizeRequired(input.toDate);
  const note = normalizeOptional(input.note);
  if (!id) {
    return fail('validation_error', 'id_empty', { id: 'required' });
  }
  if (!isValidType(input.type)) {
    return fail('validation_error', 'type_invalid', { type: 'invalid' });
  }
  if (!isIsoDate(fromDate)) {
    return fail('validation_error', 'from_date_invalid', {
      fromDate: 'iso_date_required',
    });
  }
  if (!isIsoDate(toDate)) {
    return fail('validation_error', 'to_date_invalid', {
      toDate: 'iso_date_required',
    });
  }
  if (toDate < fromDate) {
    return fail('validation_error', 'date_range_invalid', {
      fromDate: 'must_be_before_or_equal_to_toDate',
      toDate: 'must_be_after_or_equal_to_fromDate',
    });
  }
  return ok<AbsenceCreateInput>({
    id,
    type: input.type,
    fromDate,
    toDate,
    note,
  });
};

export const validateUpdateAbsencePatch = (
  patch: AbsenceUpdateInput,
  current: AbsenceCreateInput,
) => {
  const nextType = patch.type ?? current.type;
  const nextFromDate =
    patch.fromDate === undefined
      ? current.fromDate
      : normalizeRequired(patch.fromDate);
  const nextToDate =
    patch.toDate === undefined ? current.toDate : normalizeRequired(patch.toDate);
  const nextNote =
    patch.note === undefined ? current.note ?? null : normalizeOptional(patch.note);
  if (!isValidType(nextType)) {
    return fail('validation_error', 'type_invalid', { type: 'invalid' });
  }
  if (!isIsoDate(nextFromDate)) {
    return fail('validation_error', 'from_date_invalid', {
      fromDate: 'iso_date_required',
    });
  }
  if (!isIsoDate(nextToDate)) {
    return fail('validation_error', 'to_date_invalid', {
      toDate: 'iso_date_required',
    });
  }
  if (nextToDate < nextFromDate) {
    return fail('validation_error', 'date_range_invalid', {
      fromDate: 'must_be_before_or_equal_to_toDate',
      toDate: 'must_be_after_or_equal_to_fromDate',
    });
  }
  return ok<AbsenceCreateInput>({
    id: current.id,
    type: nextType,
    fromDate: nextFromDate,
    toDate: nextToDate,
    note: nextNote,
  });
};

