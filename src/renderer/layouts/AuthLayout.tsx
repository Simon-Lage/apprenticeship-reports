import { PropsWithChildren } from 'react';

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="h-screen overflow-y-auto bg-[linear-gradient(160deg,_var(--app-auth-bg-start)_0%,_var(--app-auth-bg-middle)_52%,_var(--app-auth-bg-end)_100%)] px-6 py-6 text-text-color lg:py-8">
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        {children}
      </div>
    </div>
  );
}
