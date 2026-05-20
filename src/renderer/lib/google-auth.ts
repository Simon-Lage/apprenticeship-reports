export function isGoogleAuthorizationCanceled(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Google OAuth wurde abgebrochen')
  );
}
