import { LoaderCircle } from 'lucide-react';

import { cn } from '@/renderer/lib/utils';

type LoadingSpinnerProps = {
  className?: string;
};

export default function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <LoaderCircle
      aria-hidden="true"
      className={cn('size-5 animate-spin text-primary', className)}
    />
  );
}

LoadingSpinner.defaultProps = {
  className: undefined,
};
