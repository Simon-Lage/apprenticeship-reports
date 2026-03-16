import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';

import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';

type UseUnsavedChangesGuardInput = {
  isDirty: boolean;
  onSave: () => Promise<boolean>;
};

export default function useUnsavedChangesGuard(
  input: UseUnsavedChangesGuardInput,
) {
  const blocker = useBlocker(input.isDirty);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const runtime = useAppRuntime();

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setIsOpen(true);
    }
  }, [blocker.state]);

  useEffect(() => {
    if (!input.isDirty) {
      setIsOpen(false);
    }
    
    if (runtime.api) {
      runtime.api.setAppDirtyState(input.isDirty).catch(() => undefined);
    }
  }, [input.isDirty, runtime.api]);

  function cancel() {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    setIsOpen(false);
  }

  function discard() {
    setIsOpen(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }

  async function saveAndProceed() {
    setIsPending(true);

    try {
      const saved = await input.onSave();

      if (!saved) {
        return;
      }

      setIsOpen(false);
      if (blocker.state === 'blocked') {
        blocker.proceed();
      }
    } finally {
      setIsPending(false);
    }
  }

  return {
    isOpen,
    isPending,
    cancel,
    discard,
    saveAndProceed,
  };
}

