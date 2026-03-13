import { useDeferredValue } from 'react';

import { JsonObject } from '@/shared/common/json';
import {
  createSettingsDifferenceMap,
  diffJsonValues,
} from '@/shared/settings/diff';

export function useSettingsComparison(
  currentValues: JsonObject,
  incomingValues: JsonObject,
) {
  const deferredCurrentValues = useDeferredValue(currentValues);
  const deferredIncomingValues = useDeferredValue(incomingValues);
  const differences = diffJsonValues(deferredCurrentValues, deferredIncomingValues);
  const differenceMap = createSettingsDifferenceMap(differences);

  return {
    differences,
    differenceMap,
    hasDifferences: differences.length > 0,
    isDifferent: (path: string) => differenceMap.has(path),
  };
}
