import { PropsWithChildren } from 'react';

export function DefaultLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_var(--primary-tint),_transparent_40%),linear-gradient(180deg,_white_0%,_var(--primary-tint)_100%)] text-text-color">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        {children}
      </div>
    </div>
  );
}
