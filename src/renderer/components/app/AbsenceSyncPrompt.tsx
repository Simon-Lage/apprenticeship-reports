import { useAppRuntime } from '@/renderer/contexts/AppRuntimeContext';
import AbsenceSyncDialog from '@/renderer/components/absence/AbsenceSyncDialog';

export default function AbsenceSyncPrompt() {
  const runtime = useAppRuntime();

  return (
    <AbsenceSyncDialog
      mode="automatic"
      open={runtime.isBridgeAvailable && runtime.state.absence.syncPending}
      onOpenChange={() => undefined}
    />
  );
}
