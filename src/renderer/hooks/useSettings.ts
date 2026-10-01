import { useEffect, useState } from 'react';
import type { Settings } from '../../shared/domain/settings';
export function useSettings(): Settings | undefined {
  const [value, setValue] = useState<Settings>();
  useEffect(() => {
    void window.invoicing.getSettings().then((r) => r.ok && setValue(r.value));
  }, []);
  return value;
}
