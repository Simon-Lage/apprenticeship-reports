const firstRunDialogStoragePrefix = 'apprenticeship-reports.intro-dialog';

export function hasDismissedIntroDialog(id: string): boolean {
  try {
    return (
      window.localStorage.getItem(`${firstRunDialogStoragePrefix}.${id}.v2`) ===
      'true'
    );
  } catch {
    return false;
  }
}

export function markIntroDialogDismissed(id: string): void {
  try {
    window.localStorage.setItem(
      `${firstRunDialogStoragePrefix}.${id}.v2`,
      'true',
    );
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
  }
}
