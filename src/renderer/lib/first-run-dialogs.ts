const firstRunDialogStoragePrefix =
  'apprenticeship-reports.first-run-dialog';

export function hasSeenFirstRunDialog(id: string): boolean {
  try {
    return (
      window.localStorage.getItem(`${firstRunDialogStoragePrefix}.${id}.v1`) ===
      'true'
    );
  } catch {
    return false;
  }
}

export function markFirstRunDialogSeen(id: string): void {
  try {
    window.localStorage.setItem(
      `${firstRunDialogStoragePrefix}.${id}.v1`,
      'true',
    );
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
  }
}
