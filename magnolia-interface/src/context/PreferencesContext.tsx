import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface PreferencesState {
  reducedMotion: boolean;
  blockCamera: boolean;
  blockMicrophone: boolean;
  blockUSB: boolean;
  volume: number;       // 0-100
  brightness: number;   // 0-100
  powerSavingMode: boolean;
  autoPerformanceMode: boolean;
  unitSystem: 'metric' | 'imperial';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  tempUnit: 'C' | 'F';
  firstDayOfWeek: 0 | 1; // 0=Sun, 1=Mon
  fontScale: number; // 0.5 to 2.0
  autoUpdateApps: boolean;
  matchIconsToTheme: boolean;
  indexingEnabled: boolean;
}

interface PreferencesContextType extends PreferencesState {
  setReducedMotion: (val: boolean) => void;
  setBlockCamera: (val: boolean) => void;
  setBlockMicrophone: (val: boolean) => void;
  setBlockUSB: (val: boolean) => void;
  setVolume: (val: number) => void;
  setBrightness: (val: number) => void;
  setPowerSavingMode: (val: boolean) => void;
  setAutoPerformanceMode: (val: boolean) => void;
  setUnitSystem: (val: 'metric' | 'imperial') => void;
  setDateFormat: (val: 'DD/MM/YYYY' | 'MM/DD/YYYY') => void;
  setTempUnit: (val: 'C' | 'F') => void;
  setFirstDayOfWeek: (val: 0 | 1) => void;
  setFontScale: (val: number) => void;
  setAutoUpdateApps: (val: boolean) => void;
  setMatchIconsToTheme: (val: boolean) => void;
  setIndexingEnabled: (val: boolean) => void;
}

const defaultState: PreferencesState = {
  reducedMotion: false,
  blockCamera: false,
  blockMicrophone: false,
  blockUSB: false,
  brightness: 100,
  volume: 50,
  powerSavingMode: false,
  autoPerformanceMode: false,
  unitSystem: 'metric',
  dateFormat: 'DD/MM/YYYY',
  tempUnit: 'C',
  firstDayOfWeek: 1,
  fontScale: 1.0,
  autoUpdateApps: false,
  matchIconsToTheme: false,
  indexingEnabled: false
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<PreferencesState>(() => {
    const saved = localStorage.getItem('magnolia-system-preferences');
    return saved ? JSON.parse(saved) : defaultState;
  });

  useEffect(() => {
    localStorage.setItem('magnolia-system-preferences', JSON.stringify(prefs));
    // Provide a global CSS variable marker for motion reduction dynamically
    if (prefs.reducedMotion) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }

    // Apply Accessibility Font Scaling to root
    const baseline = 16; // Baseline for rem conversions
    document.documentElement.style.fontSize = `${prefs.fontScale * baseline}px`;
  }, [prefs]);

  const setReducedMotion = (val: boolean) => setPrefs(s => ({ ...s, reducedMotion: val }));
  
  const setBlockCamera = (val: boolean) => {
    setPrefs(s => ({ ...s, blockCamera: val }));
    invoke('set_hardware_killswitch', { device: 'camera', block: val }).catch(console.error);
  };
  
  const setBlockMicrophone = (val: boolean) => {
    setPrefs(s => ({ ...s, blockMicrophone: val }));
    invoke('set_hardware_killswitch', { device: 'microphone', block: val }).catch(console.error);
  };
  
  const setBlockUSB = (val: boolean) => {
    setPrefs(s => ({ ...s, blockUSB: val }));
    invoke('set_hardware_killswitch', { device: 'usb', block: val }).catch(console.error);
  };
  
  const setVolume = (val: number) => {
    setPrefs(s => ({ ...s, volume: val }));
    invoke('set_system_volume', { volume: val }).catch(console.error);
  };
  
  const setBrightness = (val: number) => {
    setPrefs(s => ({ ...s, brightness: val }));
    // Depending on backend structure, we can throttle this
    invoke('set_system_brightness', { brightness: val }).catch(console.error);
  };
  
  const setAutoPerformanceMode = (val: boolean) => setPrefs(s => ({ ...s, autoPerformanceMode: val }));

  const setUnitSystem = (val: 'metric' | 'imperial') => setPrefs(s => ({ ...s, unitSystem: val }));
  const setDateFormat = (val: 'DD/MM/YYYY' | 'MM/DD/YYYY') => setPrefs(s => ({ ...s, dateFormat: val }));
  const setTempUnit = (val: 'C' | 'F') => setPrefs(s => ({ ...s, tempUnit: val }));
  const setFirstDayOfWeek = (val: 0 | 1) => setPrefs(s => ({ ...s, firstDayOfWeek: val }));
  const setFontScale = (val: number) => setPrefs(s => ({ ...s, fontScale: val }));
  const setAutoUpdateApps = (val: boolean) => setPrefs(s => ({ ...s, autoUpdateApps: val }));
  const setMatchIconsToTheme = (val: boolean) => setPrefs(s => ({ ...s, matchIconsToTheme: val }));
  const setIndexingEnabled = (val: boolean) => setPrefs(s => ({ ...s, indexingEnabled: val }));

  const setPowerSavingMode = (val: boolean) => {
    setPrefs(s => ({ ...s, powerSavingMode: val }));
    invoke('set_power_saving_mode', { enabled: val }).catch(console.error);
  };

  return (
    <PreferencesContext.Provider value={{
      ...prefs,
      setReducedMotion, setBlockCamera, setBlockMicrophone, setBlockUSB, setVolume, setBrightness, 
      setPowerSavingMode, setAutoPerformanceMode, setUnitSystem, setDateFormat, setTempUnit, 
      setFirstDayOfWeek, setFontScale, setAutoUpdateApps, setMatchIconsToTheme, setIndexingEnabled
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

/* eslint-disable react-refresh/only-export-components */
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
