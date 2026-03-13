import { PropsWithChildren } from 'react';

export function DefaultLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.12),_transparent_28%),linear-gradient(180deg,_#f7f4ed_0%,_#f0ece4_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        {children}
      </div>
    </div>
  );
}
