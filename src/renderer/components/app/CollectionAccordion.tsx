import { PropsWithChildren } from 'react';

import { cn } from '@/renderer/lib/utils';

type CollectionAccordionProps = PropsWithChildren<{
  summary: string;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
}>;

export default function CollectionAccordion({
  summary,
  defaultOpen,
  className,
  contentClassName,
  children,
}: CollectionAccordionProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'group rounded-md border border-primary-tint/80 p-3',
        className,
      )}
    >
      <summary className="cursor-pointer text-sm font-medium text-text-color">
        {summary}
      </summary>
      <div className={cn('mt-4 grid gap-4 md:grid-cols-2', contentClassName)}>
        {children}
      </div>
    </details>
  );
}

CollectionAccordion.defaultProps = {
  defaultOpen: false,
  className: undefined,
  contentClassName: undefined,
};
