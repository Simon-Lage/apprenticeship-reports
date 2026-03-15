import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { Toaster, toast } from 'sonner';

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
        toastOptions={{
          className:
            'border border-primary-tint bg-white text-text-color shadow-lg',
          descriptionClassName: 'text-text-color/75',
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
