import React from 'react';

function useEventListener(
  eventName: string,
  handler: (e: any) => void,
  element = document,
) {
  const savedHandler = React.useRef<(e: any) => void>(handler);

  React.useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  React.useEffect(() => {
    const isSupported = element && element.addEventListener;

    if (!isSupported) return;

    function eventListener(e: any) {
      savedHandler.current(e);
    }

    element.addEventListener(eventName, eventListener);

    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}

export default useEventListener;
