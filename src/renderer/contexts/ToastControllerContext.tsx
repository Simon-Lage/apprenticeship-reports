import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { Toaster, toast, useSonner } from 'sonner';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
} from 'react-icons/fi';

type ToastController = {
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
};

const ToastControllerContext = createContext<ToastController | null>(null);
const appToastPosition = 'top-left';

function ToastClickDismissController() {
  const { toasts } = useSonner();

  useEffect(() => {
    const dismissToastOnLeftClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.defaultPrevented) {
        return;
      }

      const { target } = event;

      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest('button, a, input, textarea, select, [role="button"]')
      ) {
        return;
      }

      const toastElement = target.closest<HTMLElement>('[data-sonner-toast]');

      if (!toastElement || toastElement.dataset.dismissible === 'false') {
        return;
      }

      const index = Number(toastElement.dataset.index);

      if (!Number.isInteger(index)) {
        return;
      }

      const toasterElement = toastElement.closest<HTMLElement>(
        '[data-sonner-toaster]',
      );
      const position =
        toasterElement?.dataset.yPosition && toasterElement.dataset.xPosition
          ? `${toasterElement.dataset.yPosition}-${toasterElement.dataset.xPosition}`
          : appToastPosition;
      const positionToasts = toasts.filter((currentToast) => {
        const currentPosition = currentToast.position ?? appToastPosition;

        return currentPosition === position;
      });
      const { [index]: targetToast } = positionToasts;

      if (targetToast) {
        toast.dismiss(targetToast.id);
      }
    };

    document.addEventListener('click', dismissToastOnLeftClick);

    return () => {
      document.removeEventListener('click', dismissToastOnLeftClick);
    };
  }, [toasts]);

  return null;
}

export function ToastControllerProvider({ children }: PropsWithChildren) {
  const showDismissableToast = (
    presenter: (
      message: string,
      options: {
        description?: string;
      },
    ) => string | number,
    message: string,
    description?: string,
  ) => {
    presenter(message, {
      description,
    });
  };

  const value = useMemo<ToastController>(
    () => ({
      success: (message, description) =>
        showDismissableToast(toast.success, message, description),
      error: (message, description) =>
        showDismissableToast(toast.error, message, description),
      info: (message, description) =>
        showDismissableToast(toast, message, description),
    }),
    [],
  );

  return (
    <ToastControllerContext.Provider value={value}>
      {children}
      <ToastClickDismissController />
      <Toaster
        richColors
        closeButton={false}
        position={appToastPosition}
        expand
        offset={{ top: '4.25rem', left: '1rem' }}
        mobileOffset={{ top: '4.25rem', left: '0.75rem', right: '0.75rem' }}
        visibleToasts={4}
        duration={4800}
        icons={{
          success: <FiCheckCircle className="size-4" />,
          error: <FiAlertCircle className="size-4" />,
          info: <FiInfo className="size-4" />,
          warning: <FiAlertTriangle className="size-4" />,
        }}
        toastOptions={{
          classNames: {
            toast:
              'app-toast cursor-pointer border border-primary-tint/80 bg-white/95 text-text-color shadow-xl backdrop-blur-sm',
            title: 'app-toast-title text-sm font-semibold tracking-tight',
            description: 'app-toast-description text-xs text-text-color/75',
            success: 'app-toast-success',
            error: 'app-toast-error',
            info: 'app-toast-info',
            warning: 'app-toast-warning',
            icon: 'app-toast-icon',
            content: 'app-toast-content',
          },
        }}
      />
    </ToastControllerContext.Provider>
  );
}

export function useToastController(): ToastController {
  const context = useContext(ToastControllerContext);

  if (!context) {
    throw new Error('ToastControllerContext is not available.');
  }

  return context;
}
