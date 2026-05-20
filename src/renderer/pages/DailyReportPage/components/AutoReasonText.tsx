import { cn } from '@/renderer/lib/utils';

export interface AutoReasonTextProps {
  text: string | null;
  className?: string;
}

export default function AutoReasonText({
  text,
  className,
}: AutoReasonTextProps) {
  if (!text) return null;
  return <p className={cn('text-sm text-text-color/70', className)}>{text}</p>;
}

AutoReasonText.defaultProps = {
  className: undefined,
};
