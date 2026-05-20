import { KeyboardEvent } from 'react';

export default function handleEnterAction(
  event: KeyboardEvent<HTMLElement>,
  action: () => void,
) {
  if (
    event.key !== 'Enter' ||
    event.shiftKey ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.nativeEvent.isComposing
  ) {
    return;
  }

  event.preventDefault();
  action();
}
