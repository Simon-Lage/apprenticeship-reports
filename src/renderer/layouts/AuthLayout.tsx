import { PropsWithChildren } from 'react';

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,_var(--app-auth-bg-start)_0%,_var(--app-auth-bg-middle)_52%,_var(--app-auth-bg-end)_100%)] px-6 py-10 text-text-color">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        {children}
      </div>
    </div>
  );
}
