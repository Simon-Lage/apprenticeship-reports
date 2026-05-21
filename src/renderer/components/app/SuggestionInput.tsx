import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';

type SuggestionInputProps = {
  id?: string;
  value: string;
  placeholder?: string;
  suggestions: string[];
  disabled?: boolean;
  className?: string;
  onValueChange: (value: string) => void;
  onBlurValue?: (value: string) => void;
};

export default function SuggestionInput({
  id,
  value,
  placeholder,
  suggestions,
  disabled = false,
  className,
  onValueChange,
  onBlurValue,
}: SuggestionInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isClosedAfterSelection, setIsClosedAfterSelection] = useState(false);
  const uniqueSuggestions = useMemo(
    () =>
      Array.from(
        new Set(suggestions.map((suggestion) => suggestion.trim())),
      ).filter(Boolean),
    [suggestions],
  );
  const normalizedSearchValue = value.trim().toLocaleLowerCase();
  const matchingSuggestions = normalizedSearchValue.length
    ? uniqueSuggestions.filter((suggestion) =>
        suggestion.toLocaleLowerCase().includes(normalizedSearchValue),
      )
    : uniqueSuggestions;
  const isSuggestionsOpen =
    !disabled &&
    isFocused &&
    !isClosedAfterSelection &&
    matchingSuggestions.length > 0;

  const selectSuggestion = (suggestion: string) => {
    onValueChange(suggestion);
    setIsClosedAfterSelection(true);
    inputRef.current?.focus();
  };

  return (
    <Popover open={isSuggestionsOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            id={id}
            disabled={disabled}
            value={value}
            placeholder={placeholder}
            className={className ?? 'pr-9'}
            onFocus={() => {
              setIsFocused(true);
              setIsClosedAfterSelection(false);
            }}
            onBlur={() => {
              setIsFocused(false);
              onBlurValue?.(value);
            }}
            onChange={(event) => {
              setIsClosedAfterSelection(false);
              onValueChange(event.target.value);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || !matchingSuggestions.length}
            aria-label={placeholder}
            className="absolute top-0 right-0 size-9 text-text-color/60 hover:bg-primary-tint/40 hover:text-text-color"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              inputRef.current?.focus();
              setIsClosedAfterSelection(isSuggestionsOpen);
              setIsFocused(true);
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
              className="block w-full rounded-sm px-2 py-1.5 text-left text-sm text-text-color hover:bg-primary-tint/30"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </PopoverContent>
      ) : null}
    </Popover>
  );
}

SuggestionInput.defaultProps = {
  id: undefined,
  placeholder: undefined,
  disabled: false,
  className: undefined,
  onBlurValue: undefined,
};
