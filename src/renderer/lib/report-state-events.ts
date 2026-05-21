export const reportsStateChangedEventName =
  'apprenticeship-reports:reports-state-changed';

export function notifyReportsStateChanged(): void {
  window.dispatchEvent(new Event(reportsStateChangedEventName));
}
