import { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-primary-tint/70 pb-5 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-text-color md:text-3xl">{title}</h1>
        <p className="text-sm text-text-color/75 md:text-base">{description}</p>
      </div>
      {action ? <div className="md:pt-1">{action}</div> : null}
    </header>
  );
}
