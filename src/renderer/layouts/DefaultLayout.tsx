import { PropsWithChildren } from 'react';

export function DefaultLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_var(--app-default-bg-overlay),_transparent_40%),linear-gradient(180deg,_var(--app-auth-bg-start)_0%,_var(--app-default-bg-end)_100%)] text-text-color">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        {children}
      </div>
    </div>
  );
}
