import { ChangeEventHandler, FocusEventHandler, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

import { Input } from '@/components/ui/input';
import { cn } from '@/renderer/lib/utils';

type PasswordInputProps = {
  id: string;
  value: string;
  autoComplete?: string;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  className?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  showLabel: string;
  hideLabel: string;
};

export default function PasswordInput({
  id,
  value,
  autoComplete,
  disabled,
  placeholder,
  name,
  onChange,
  onBlur,
  className,
  showLabel,
  hideLabel,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
        name={name}
        onChange={onChange}
        onBlur={onBlur}
        type={isVisible ? 'text' : 'password'}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        aria-label={isVisible ? hideLabel : showLabel}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-text-color/80 transition-colors hover:bg-primary-tint/50 hover:text-primary-shade"
        onClick={() => setIsVisible((current) => !current)}
      >
        {isVisible ? (
          <FiEyeOff className="size-4" />
        ) : (
          <FiEye className="size-4" />
        )}
      </button>
    </div>
  );
}
