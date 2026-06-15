import React from 'react';

function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (e: DocumentEventMap[K]) => void,
  element: Document = document,
) {
  const savedHandler = React.useRef(handler);

  React.useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  React.useEffect(() => {
    const isSupported = element && element.addEventListener;

    if (!isSupported) return;

    const eventListener = (e: DocumentEventMap[K]) => {
      savedHandler.current(e);
    };

    element.addEventListener(eventName, eventListener);

    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}

export default useEventListener;
