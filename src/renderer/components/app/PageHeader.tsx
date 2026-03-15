import { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

function PageHeader({ title, description, action }: PageHeaderProps) {
  if (!action) {
    return null;
  }

  return (
    <header
      className="flex justify-end"
      aria-label={`${title} ${description}`.trim()}
    >
      {action}
    </header>
  );
}

PageHeader.defaultProps = {
  action: undefined,
};

export { PageHeader };
export default PageHeader;
