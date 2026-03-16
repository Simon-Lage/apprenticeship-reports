import { PropsWithChildren } from 'react';

import WindowModeToggleButton from '@/renderer/components/app/WindowModeToggleButton';

export default function DefaultLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_var(--app-default-bg-overlay),_transparent_40%),linear-gradient(180deg,_var(--app-auth-bg-start)_0%,_var(--app-default-bg-end)_100%)] text-text-color">
      <div className="absolute right-6 top-6 z-20">
        <WindowModeToggleButton className="text-text-color/80 hover:bg-primary-tint/35 hover:text-text-color" />
      </div>
      <div className="flex h-full w-full flex-col">{children}</div>
    </div>
  );
}
