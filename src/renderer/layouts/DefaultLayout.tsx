import { PropsWithChildren } from 'react';

export default function DefaultLayout({ children }: PropsWithChildren) {
  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_var(--app-default-bg-overlay),_transparent_40%),linear-gradient(180deg,_var(--app-auth-bg-start)_0%,_var(--app-default-bg-end)_100%)] text-text-color">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-6 py-5 lg:px-10 lg:py-6">
        {children}
      </div>
    </div>
  );
}
