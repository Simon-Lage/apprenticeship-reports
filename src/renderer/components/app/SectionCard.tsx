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
  preserveDescriptionSpace?: boolean;
  action?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  onClick?: () => void;
}>;

function SectionCard({
  title,
  description,
  preserveDescriptionSpace,
  action,
  className,
  headerClassName,
  contentClassName,
  titleClassName,
  onClick,
  children,
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || action);
  const headerDescription = description ? (
    <CardDescription className="text-text-color/70">
      {description}
    </CardDescription>
  ) : null;
  const preservedDescriptionSpace = preserveDescriptionSpace ? (
    <CardDescription className="invisible text-text-color/70">
      &nbsp;
    </CardDescription>
  ) : null;

  return (
    <Card className={cn('overflow-hidden rounded-xl shadow-sm', className)}>
      {hasHeader ? (
        <CardHeader
          className={cn(
            'border-b border-primary-tint/60 px-5 py-4',
            onClick && 'cursor-pointer select-none hover:bg-primary-tint/10',
            headerClassName,
          )}
          onClick={onClick}
        >
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
              {headerDescription || preservedDescriptionSpace}
            </div>
            {action}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn('', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

SectionCard.defaultProps = {
  title: undefined,
  description: undefined,
  preserveDescriptionSpace: false,
  action: undefined,
  className: undefined,
  headerClassName: undefined,
  contentClassName: undefined,
  titleClassName: undefined,
  onClick: undefined,
};

export { SectionCard };
export default SectionCard;
