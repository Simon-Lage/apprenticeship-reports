import { PropsWithChildren } from 'react';

import WindowModeToggleButton from '@/renderer/components/app/WindowModeToggleButton';

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative h-screen overflow-y-auto bg-[linear-gradient(160deg,_var(--app-auth-bg-start)_0%,_var(--app-auth-bg-middle)_52%,_var(--app-auth-bg-end)_100%)] px-6 py-6 text-text-color lg:py-8">
      <div className="absolute right-6 top-6 z-20">
        <WindowModeToggleButton className="text-text-color/80 hover:bg-primary-tint/35 hover:text-text-color" />
      </div>
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        {children}
      </div>
    </div>
  );
}
