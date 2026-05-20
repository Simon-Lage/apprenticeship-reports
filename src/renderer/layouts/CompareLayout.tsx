import { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSyncedScroll } from '@/hooks/useSyncedScroll';

type CompareLayoutProps = {
  leftTitle: string;
  rightTitle: string;
  left: ReactNode;
  right: ReactNode;
};

export function CompareLayout({
  leftTitle,
  rightTitle,
  left,
  right,
}: CompareLayoutProps) {
  const { leftRef, rightRef } = useSyncedScroll();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="overflow-hidden border-primary-tint/80 bg-white/90 shadow-lg shadow-primary-tint/25 backdrop-blur">
        <CardHeader className="border-b border-primary-tint/70 bg-primary-tint/20">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-text-color/70">
            {leftTitle}
          </CardTitle>
        </CardHeader>
        <CardContent ref={leftRef} className="h-[70vh] overflow-auto p-0">
          <div data-compare-mode="true" className="min-h-full p-6">
            {left}
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-primary-tint/80 bg-white/90 shadow-lg shadow-primary-tint/25 backdrop-blur">
        <CardHeader className="border-b border-primary-tint/70 bg-primary-tint/20">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-text-color/70">
            {rightTitle}
          </CardTitle>
        </CardHeader>
        <CardContent ref={rightRef} className="h-[70vh] overflow-auto p-0">
          <div data-compare-mode="true" className="min-h-full p-6">
            {right}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
