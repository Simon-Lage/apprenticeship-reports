import { ReactNode } from 'react';

import { cn } from '@/renderer/lib/utils';

type EditableCollectionListProps<T> = {
  addSlot?: ReactNode;
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  renderActions?: (item: T) => ReactNode;
  emptyText?: string;
  listClassName?: string;
  itemClassName?: string;
};

export default function EditableCollectionList<T>({
  addSlot,
  items,
  getKey,
  renderItem,
  renderActions,
  emptyText,
  listClassName,
  itemClassName,
}: EditableCollectionListProps<T>) {
  let content: ReactNode = null;
  const renderListItem = (item: T) => {
    const actions = renderActions ? renderActions(item) : null;

    return (
      <li
        key={getKey(item)}
        className={cn(
          'flex items-center justify-between gap-3 rounded-md border border-primary-tint/70 px-3 py-2',
          itemClassName,
        )}
      >
        <div className="min-w-0 flex-1">{renderItem(item)}</div>
        {actions ? (
          <div className="flex items-center gap-1">{actions}</div>
        ) : null}
      </li>
    );
  };

  if (items.length) {
    content = (
      <ul className={cn('space-y-1 text-sm', listClassName)}>
        {items.map(renderListItem)}
      </ul>
    );
  } else if (emptyText) {
    content = <p className="text-sm text-text-color/70">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {addSlot}
      {content}
    </div>
  );
}

EditableCollectionList.defaultProps = {
  addSlot: undefined,
  renderActions: undefined,
  emptyText: undefined,
  listClassName: undefined,
  itemClassName: undefined,
};
