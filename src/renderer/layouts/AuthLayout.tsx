import { PropsWithChildren } from 'react';

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,_white_0%,_var(--primary-tint)_52%,_color-mix(in_oklch,var(--primary-tint)_80%,white)_100%)] px-6 py-10 text-text-color">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        {children}
      </div>
    </div>
  );
}
