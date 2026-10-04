import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '../../shared/domain/settings';
import { defaultSettings } from '../../shared/domain/settingsDefaults';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await window.invoicing.getSettings();
    if (result.ok) setSettings(result.value);
    else setError(result.error.message);
    setLoading(false);
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const save = useCallback(async (next: Settings) => {
    setSaving(true);
    setError(null);
    const result = await window.invoicing.saveSettings(next);
    if (result.ok) setSettings(result.value);
    else setError(result.error.message);
    setSaving(false);
    return result.ok;
  }, []);
  const set = useCallback((value: Settings) => setSettings(value), []);
  return {
    settings,
    setSettings: set,
    loading,
    saving,
    error,
    setError,
    refresh,
    save,
  };
}
