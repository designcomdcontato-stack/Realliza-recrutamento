import { useState, useEffect, useCallback } from 'react';
import { db } from '@/database/db';
import { AppSettings } from '@/types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getSettings();
      setSettings(data);
      applyTheme(data);
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyTheme = (s: AppSettings) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', s.primaryColor);
    root.style.setProperty('--brand-secondary', s.secondaryColor);
    root.style.setProperty('--brand-accent', s.accentColor);
    root.style.setProperty('--brand-bg', s.bgColor);
  };

  useEffect(() => {
    fetchSettings();
    
    const handleSync = (e: StorageEvent) => {
      if (e.key === 'realliza_settings') {
        fetchSettings();
      }
    };

    const handleCustom = () => {
      fetchSettings();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('settings-updated', handleCustom);
    
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('settings-updated', handleCustom);
    };
  }, [fetchSettings]);

  const updateSettings = async (data: Partial<AppSettings>) => {
    const updated = await db.updateSettings(data);
    setSettings(updated);
    applyTheme(updated);
    // Notify other hook instances in the same tab
    window.dispatchEvent(new Event('settings-updated'));
    return updated;
  };

  return {
    settings,
    loading,
    refresh: fetchSettings,
    updateSettings
  };
}
