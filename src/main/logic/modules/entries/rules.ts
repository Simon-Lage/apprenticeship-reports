import { DayType, EntryCreateInput, EntryUpdateInput } from '../../../../shared/logic';
import { fail, ok } from '../../core/operation';

const validDayTypes: DayType[] = ['school', 'work', 'leave'];

const normalizeActivities = (value: string) => value.trim();

const isValidDayType = (value: string): value is DayType =>
  validDayTypes.includes(value as DayType);

export const validateCreateEntryInput = (input: EntryCreateInput) => {
  const activities = normalizeActivities(input.activities);
  if (!activities) {
    return fail('validation_error', 'activities_empty', {
      activities: 'required',
    });
  }
  if (activities.length > 2000) {
    return fail('validation_error', 'activities_too_long', {
      activities: 'max_2000',
    });
  }
  if (!isValidDayType(input.dayType)) {
    return fail('validation_error', 'day_type_invalid', {
      dayType: 'invalid',
    });
  }
  return ok<EntryCreateInput>({
    activities,
    dayType: input.dayType,
  });
};

export const validateUpdateEntryPatch = (
  patch: EntryUpdateInput,
  current: EntryCreateInput,
) => {
  const nextActivities =
    patch.activities === undefined
      ? current.activities
      : normalizeActivities(patch.activities);
  const nextDayType = patch.dayType ?? current.dayType;
  if (!nextActivities) {
    return fail('validation_error', 'activities_empty', {
      activities: 'required',
    });
  }
  if (nextActivities.length > 2000) {
    return fail('validation_error', 'activities_too_long', {
      activities: 'max_2000',
    });
  }
  if (!isValidDayType(nextDayType)) {
    return fail('validation_error', 'day_type_invalid', {
      dayType: 'invalid',
    });
  }
  return ok<EntryCreateInput>({
    activities: nextActivities,
    dayType: nextDayType,
  });
};

