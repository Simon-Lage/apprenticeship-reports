let activeCount = 0;

export const startCriticalOperation = () => {
  activeCount += 1;
  let ended = false;
  return () => {
    if (ended) {
      return;
    }
    ended = true;
    activeCount = Math.max(0, activeCount - 1);
  };
};

export const isCriticalOperationActive = () => activeCount > 0;
