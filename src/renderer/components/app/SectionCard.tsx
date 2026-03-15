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
  title: string;
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
  return (
    <Card className={cn('overflow-hidden rounded-xl shadow-sm', className)}>
      <CardHeader className="border-b border-primary-tint/60 px-5 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle
              className={cn(
                'text-base text-text-color md:text-lg',
                titleClassName,
              )}
            >
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="text-text-color/70">
                {description}
              </CardDescription>
            ) : null}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className={cn('px-5 py-4', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

SectionCard.defaultProps = {
  description: undefined,
  action: undefined,
  className: undefined,
  contentClassName: undefined,
  titleClassName: undefined,
};

export { SectionCard };
export default SectionCard;
