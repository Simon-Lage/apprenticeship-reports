import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

import { Button } from '@/components/ui/button';

type DateNavigationTitleProps = {
  title: string;
  previousLabel: string;
  nextLabel: string;
  previousDisabled: boolean;
  nextDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export default function DateNavigationTitle({
  title,
  previousLabel,
  nextLabel,
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext,
}: DateNavigationTitleProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-text-color/70 hover:bg-primary-tint/40 hover:text-text-color"
        aria-label={previousLabel}
        disabled={previousDisabled}
        onClick={onPrevious}
      >
        <FiChevronLeft className="size-4" />
      </Button>
      <span className="min-w-0 truncate">{title}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-text-color/70 hover:bg-primary-tint/40 hover:text-text-color"
        aria-label={nextLabel}
        disabled={nextDisabled}
        onClick={onNext}
      >
        <FiChevronRight className="size-4" />
      </Button>
    </span>
  );
}
