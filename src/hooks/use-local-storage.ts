import React from 'react';
import { ColorNeutrality } from '../data/types';

const LOCAL_STORAGE_PREFIX = '@cubing-tools/';

interface Settings {
  colorNeutrality: ColorNeutrality;
  crossLevel: number;
}

const defaultSettings: Settings = {
  colorNeutrality: ColorNeutrality.NON_CN,
  crossLevel: 1,
};

function useLocalStorage<T>(
  key: string,
  value: T | (() => T),
): [T, (v: React.SetStateAction<T>) => void] {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    try {
      const item = window.localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
      if (item) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.log(error);
    }
    const initialValue = value instanceof Function ? value() : value;
    window.localStorage.setItem(
      LOCAL_STORAGE_PREFIX + key,
      JSON.stringify(initialValue),
    );
    return initialValue;
  });

  const setValue = React.useCallback(
    (value: React.SetStateAction<T>) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        window.localStorage.setItem(
          LOCAL_STORAGE_PREFIX + key,
          JSON.stringify(valueToStore),
        );
      } catch (error) {
        console.log(error);
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue];
}

function useSettings(): [Settings, (s: Partial<Settings>) => void] {
  const [settings, setSettings] = useLocalStorage<Settings>(
    'settings',
    defaultSettings,
  );

  function updateSettings(s: Partial<Settings>) {
    const newSettings = { ...settings, ...s };
    setSettings(newSettings);
  }

  return [settings, updateSettings];
}

export default useLocalStorage;
export { useSettings };
