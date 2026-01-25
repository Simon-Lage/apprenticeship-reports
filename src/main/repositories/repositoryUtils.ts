export const trimText = (value: string) => value.trim();

export const trimOptionalText = (value: string | null | undefined) =>
  value === null || value === undefined ? null : value.trim();
