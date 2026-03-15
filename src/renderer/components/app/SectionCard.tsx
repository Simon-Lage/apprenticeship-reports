import { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/renderer/lib/utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type SectionCardProps = PropsWithChildren<{
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
}>;

function SectionCard({
  title,
  description,
  action,
  className,
  contentClassName,
  titleClassName,
  children,
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || action);

  return (
    <Card className={cn('overflow-hidden rounded-xl shadow-sm', className)}>
      {hasHeader ? (
        <CardHeader className="border-b border-primary-tint/60 px-5 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              {title ? (
                <CardTitle
                  className={cn(
                    'text-base text-text-color md:text-lg',
                    titleClassName,
                  )}
                >
                  {title}
                </CardTitle>
              ) : null}
              {description ? (
                <CardDescription className="text-text-color/70">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {action}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn('px-5 py-4', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

SectionCard.defaultProps = {
  title: undefined,
  description: undefined,
  action: undefined,
  className: undefined,
  contentClassName: undefined,
  titleClassName: undefined,
};

export { SectionCard };
export default SectionCard;
