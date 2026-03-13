import {
  JsonObject,
  JsonValue,
  isJsonObject,
  stableStringifyJson,
} from '@/shared/common/json';

export type SettingsDifferenceKind =
  | 'added'
  | 'removed'
  | 'changed'
  | 'type-changed';

export type SettingsDifference = {
  path: string;
  kind: SettingsDifferenceKind;
  currentValue?: JsonValue;
  incomingValue?: JsonValue;
};

function buildPath(basePath: string, segment: string | number): string {
  if (typeof segment === 'number') {
    return `${basePath}[${segment}]`;
  }

  return basePath ? `${basePath}.${segment}` : segment;
}

function hasSameType(left: JsonValue, right: JsonValue): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right);
  }

  if (isJsonObject(left) || isJsonObject(right)) {
    return isJsonObject(left) && isJsonObject(right);
  }

  return typeof left === typeof right;
}

function diffArrays(
  currentValues: JsonValue[],
  incomingValues: JsonValue[],
  basePath: string,
): SettingsDifference[] {
  const maxLength = Math.max(currentValues.length, incomingValues.length);
  const differences: SettingsDifference[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const currentValue = currentValues[index];
    const incomingValue = incomingValues[index];
    const path = buildPath(basePath, index);

    if (typeof currentValue === 'undefined') {
      differences.push({
        path,
        kind: 'added',
        incomingValue,
      });
      continue;
    }

    if (typeof incomingValue === 'undefined') {
      differences.push({
        path,
        kind: 'removed',
        currentValue,
      });
      continue;
    }

    differences.push(...diffJsonValues(currentValue, incomingValue, path));
  }

  return differences;
}

function diffObjects(
  currentValues: JsonObject,
  incomingValues: JsonObject,
  basePath: string,
): SettingsDifference[] {
  const allKeys = Array.from(
    new Set([...Object.keys(currentValues), ...Object.keys(incomingValues)]),
  ).sort((left, right) => left.localeCompare(right));

  const differences: SettingsDifference[] = [];

  allKeys.forEach((key) => {
    const currentValue = currentValues[key];
    const incomingValue = incomingValues[key];
    const path = buildPath(basePath, key);

    if (typeof currentValue === 'undefined') {
      differences.push({
        path,
        kind: 'added',
        incomingValue,
      });
      return;
    }

    if (typeof incomingValue === 'undefined') {
      differences.push({
        path,
        kind: 'removed',
        currentValue,
      });
      return;
    }

    differences.push(...diffJsonValues(currentValue, incomingValue, path));
  });

  return differences;
}

export function diffJsonValues(
  currentValue: JsonValue,
  incomingValue: JsonValue,
  basePath = '',
): SettingsDifference[] {
  if (!hasSameType(currentValue, incomingValue)) {
    return [
      {
        path: basePath,
        kind: 'type-changed',
        currentValue,
        incomingValue,
      },
    ];
  }

  if (Array.isArray(currentValue) && Array.isArray(incomingValue)) {
    return diffArrays(currentValue, incomingValue, basePath);
  }

  if (isJsonObject(currentValue) && isJsonObject(incomingValue)) {
    return diffObjects(currentValue, incomingValue, basePath);
  }

  if (stableStringifyJson(currentValue) === stableStringifyJson(incomingValue)) {
    return [];
  }

  return [
    {
      path: basePath,
      kind: 'changed',
      currentValue,
      incomingValue,
    },
  ];
}

export function createSettingsDifferenceMap(
  differences: SettingsDifference[],
): Map<string, SettingsDifference> {
  return new Map(differences.map((difference) => [difference.path, difference]));
}
