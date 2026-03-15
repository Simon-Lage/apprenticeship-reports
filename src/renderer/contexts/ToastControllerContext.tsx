import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiX,
} from 'react-icons/fi';

type ToastController = {
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
};

const ToastControllerContext = createContext<ToastController | null>(null);

export function ToastControllerProvider({ children }: PropsWithChildren) {
  const value = useMemo<ToastController>(
    () => ({
      success: (message, description) =>
        toast.success(message, { description }),
      error: (message, description) => toast.error(message, { description }),
      info: (message, description) => toast(message, { description }),
    }),
    [],
  );

  return (
    <ToastControllerContext.Provider value={value}>
      {children}
      <Toaster
        richColors
        closeButton
        position="top-right"
        expand
        offset={20}
        visibleToasts={4}
        duration={4800}
        icons={{
          success: <FiCheckCircle className="size-4" />,
          error: <FiAlertCircle className="size-4" />,
          info: <FiInfo className="size-4" />,
          warning: <FiAlertTriangle className="size-4" />,
          close: <FiX className="size-3.5" />,
        }}
        toastOptions={{
          classNames: {
            toast:
              'app-toast border border-primary-tint/80 bg-white/95 text-text-color shadow-xl backdrop-blur-sm',
            title: 'app-toast-title text-sm font-semibold tracking-tight',
            description: 'app-toast-description text-xs text-text-color/75',
            closeButton: 'app-toast-close',
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
