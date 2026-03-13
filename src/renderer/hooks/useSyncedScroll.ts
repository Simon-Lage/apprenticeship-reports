import { RefObject, useEffect, useRef } from 'react';

function bindScrollSync(
  source: HTMLElement,
  target: HTMLElement,
  activeRef: RefObject<HTMLElement | null>,
): () => void {
  function handleScroll() {
    if (activeRef.current === target) {
      return;
    }

    activeRef.current = source;
    target.scrollTop = source.scrollTop;
    target.scrollLeft = source.scrollLeft;
    requestAnimationFrame(() => {
      if (activeRef.current === source) {
        activeRef.current = null;
      }
    });
  }

  source.addEventListener('scroll', handleScroll, { passive: true });
  return () => source.removeEventListener('scroll', handleScroll);
}

export function useSyncedScroll() {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const leftElement = leftRef.current;
    const rightElement = rightRef.current;

    if (!leftElement || !rightElement) {
      return undefined;
    }

    const unbindLeft = bindScrollSync(leftElement, rightElement, activeRef);
    const unbindRight = bindScrollSync(rightElement, leftElement, activeRef);

    return () => {
      unbindLeft();
      unbindRight();
    };
  }, []);

  return {
    leftRef,
    rightRef,
  };
}
