import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@resale_scanner_settings';

export interface Settings {
  platformFeePercent: number;
  shippingCost: number;
}

const DEFAULT_SETTINGS: Settings = {
  platformFeePercent: 15,
  shippingCost: 5,
};

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
  isLoaded: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<Settings>;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch {
          // ignore parse errors, use defaults
        }
      }
      setIsLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
