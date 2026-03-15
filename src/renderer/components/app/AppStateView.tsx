import { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type AppStateViewProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

export function AppStateView({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: AppStateViewProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-6">
      <Card className="w-full border-primary-tint bg-white">
        <CardHeader>
          <CardTitle className="text-xl text-text-color">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-color/80">{description}</p>
          {children}
          {actionLabel && onAction ? (
            <Button onClick={onAction} className="bg-primary text-primary-contrast hover:bg-primary-shade">
              {actionLabel}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
