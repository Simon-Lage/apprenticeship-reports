import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';

import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type WindowModeToggleButtonProps = {
  className?: string;
};

export default function WindowModeToggleButton({
  className,
}: WindowModeToggleButtonProps) {
  const { t } = useTranslation();
  const runtime = useAppRuntime();
  const [isFullscreen, setIsFullscreen] = useState(true);

  useEffect(() => {
    if (!runtime.api?.getWindowFullscreen) {
      return;
    }

    runtime.api
      .getWindowFullscreen()
      .then((fullscreen) => {
        setIsFullscreen(fullscreen);
        return fullscreen;
      })
      .catch(() => undefined);
  }, [runtime.api]);

  if (!runtime.api?.toggleWindowFullscreen) {
    return null;
  }

  const label = isFullscreen
    ? t('windowMode.switchToWindowed')
    : t('windowMode.switchToFullscreen');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={className}
          aria-label={label}
          title={label}
          onClick={() => {
            runtime.api
              ?.toggleWindowFullscreen()
              .then((fullscreen) => {
                setIsFullscreen(fullscreen);
                return fullscreen;
              })
              .catch(() => undefined);
          }}
        >
          {isFullscreen ? (
            <FiMinimize2 className="size-4" />
          ) : (
            <FiMaximize2 className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

WindowModeToggleButton.defaultProps = {
  className: undefined,
};


