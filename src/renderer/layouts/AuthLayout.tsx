import { PropsWithChildren } from 'react';

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,_#f8f5ee_0%,_#ebe4d7_52%,_#d6d9cf_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        {children}
      </div>
    </div>
  );
}
