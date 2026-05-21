import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { cn } from '@/renderer/lib/utils';

type EditableTextEntryListProps = {
  items: string[];
  placeholder: string;
  suggestions: string[];
  addLabel: string;
  removeLabel: string;
  onChange: (items: string[]) => void;
  editSuggestionLabel?: string;
  deleteSuggestionLabel?: string;
  onEditSuggestion?: (value: string) => void;
  onDeleteSuggestion?: (value: string) => void;
  className?: string;
};

export default function EditableTextEntryList({
  items,
  placeholder,
  suggestions,
  addLabel,
  removeLabel,
  onChange,
  editSuggestionLabel,
  deleteSuggestionLabel,
  onEditSuggestion,
  onDeleteSuggestion,
  className,
}: EditableTextEntryListProps) {
  const rowKeys = useRef<string[]>([]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingFocusIndex = useRef<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [closedIndex, setClosedIndex] = useState<number | null>(null);
  const visibleItems = items.length ? items : [''];
  const canRemove = visibleItems.length > 1;
  const uniqueSuggestions = useMemo(
    () =>
      Array.from(
        new Set(suggestions.map((suggestion) => suggestion.trim())),
      ).filter(Boolean),
    [suggestions],
  );

  if (rowKeys.current.length > visibleItems.length) {
    rowKeys.current = rowKeys.current.slice(0, visibleItems.length);
  }

  while (rowKeys.current.length < visibleItems.length) {
    rowKeys.current.push(
      `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  }

  useEffect(() => {
    if (pendingFocusIndex.current === null) return;
    inputRefs.current[pendingFocusIndex.current]?.focus();
    pendingFocusIndex.current = null;
  }, [visibleItems.length]);

  function updateItem(index: number, value: string) {
    const nextItems = [...visibleItems];
    nextItems[index] = value;
    setClosedIndex(null);
    onChange(nextItems);
  }

  function addItemAfter(index: number) {
    if (!visibleItems[index].trim()) return;
    const nextItems = [...visibleItems];
    const nextIndex = index + 1;
    nextItems.splice(nextIndex, 0, '');
    rowKeys.current.splice(
      nextIndex,
      0,
      `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    pendingFocusIndex.current = nextIndex;
    setClosedIndex(null);
    onChange(nextItems);
  }

  function removeItem(index: number) {
    if (!canRemove) return;
    rowKeys.current.splice(index, 1);
    onChange(visibleItems.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addItemAfter(index);
  }

  function selectSuggestion(index: number, value: string) {
    const nextItems = [...visibleItems];
    nextItems[index] = value;
    setClosedIndex(index);
    onChange(nextItems);
    inputRefs.current[index]?.focus();
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {visibleItems.map((item, index) => {
        const isFocused = focusedIndex === index;
        const normalizedSearchValue = item.trim().toLocaleLowerCase();
        const matchingSuggestions = normalizedSearchValue.length
          ? uniqueSuggestions.filter((suggestion) =>
              suggestion.toLocaleLowerCase().includes(normalizedSearchValue),
            )
          : uniqueSuggestions;
        const isSuggestionsOpen =
          isFocused && closedIndex !== index && matchingSuggestions.length > 0;

        return (
          <div
            key={rowKeys.current[index]}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2"
          >
            <Popover open={isSuggestionsOpen}>
              <PopoverAnchor asChild>
                <div className="relative">
                  <Input
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    value={item}
                    placeholder={placeholder}
                    className="pr-9"
                    onFocus={() => {
                      setFocusedIndex(index);
                      setClosedIndex(null);
                    }}
                    onBlur={() => {
                      setFocusedIndex((current) =>
                        current === index ? null : current,
                      );
                    }}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    onChange={(event) => updateItem(index, event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={isSuggestionsOpen ? addLabel : placeholder}
                    className="absolute top-0 right-0 size-9 text-text-color/60 hover:bg-primary-tint/40 hover:text-text-color"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      inputRefs.current[index]?.focus();
                      setClosedIndex(isSuggestionsOpen ? index : null);
                      setFocusedIndex(index);
                    }}
                  >
                    {isSuggestionsOpen ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </div>
              </PopoverAnchor>
              {isSuggestionsOpen ? (
                <PopoverContent
                  align="start"
                  className="max-h-48 w-(--radix-popover-trigger-width) overflow-auto border-primary-tint bg-background p-1"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  onCloseAutoFocus={(event) => event.preventDefault()}
                >
                  {matchingSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="group flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-text-color hover:bg-primary-tint/30"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectSuggestion(index, suggestion)}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {suggestion}
                      </span>
                      {onEditSuggestion ? (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={editSuggestionLabel}
                          className="inline-flex size-7 items-center justify-center rounded-sm opacity-0 hover:bg-background group-hover:opacity-100"
                          onMouseDown={(event) => event.preventDefault()}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onEditSuggestion(suggestion);
                            }
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditSuggestion(suggestion);
                          }}
                        >
                          <Pencil className="size-4" />
                        </span>
                      ) : null}
                      {onDeleteSuggestion ? (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={deleteSuggestionLabel}
                          className="inline-flex size-7 items-center justify-center rounded-sm text-destructive opacity-0 hover:bg-destructive/10 group-hover:opacity-100"
                          onMouseDown={(event) => event.preventDefault()}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onDeleteSuggestion(suggestion);
                            }
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteSuggestion(suggestion);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </span>
                      ) : null}
                    </button>
                  ))}
                </PopoverContent>
              ) : null}
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canRemove}
              aria-label={removeLabel}
              className="text-text-color/70 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => removeItem(index)}
            >
              <Trash2 />
            </Button>
          </div>
        );
      })}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={addLabel}
          className="size-8 text-text-color/70 hover:bg-primary-tint/40 hover:text-text-color"
          onClick={() => {
            rowKeys.current.push(
              `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            );
            pendingFocusIndex.current = visibleItems.length;
            onChange([...visibleItems, '']);
          }}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

EditableTextEntryList.defaultProps = {
  className: undefined,
  editSuggestionLabel: undefined,
  deleteSuggestionLabel: undefined,
  onEditSuggestion: undefined,
  onDeleteSuggestion: undefined,
};
