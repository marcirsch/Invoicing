import { useCallback, useEffect, useState } from 'react';
import type { Customer } from '../../shared/domain/customer';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [dialectAmbiguous, setDialectAmbiguous] = useState(false);
  const refresh = useCallback(async (delimiter?: ',' | ';' | '\t') => {
    setLoading(true);
    setError(null);
    setConflict(false);
    setDialectAmbiguous(false);
    const result = await window.invoicing.loadCustomers(delimiter);
    if (result.ok) setCustomers(result.value);
    else {
      setError(result.error.message);
      setDialectAmbiguous(result.error.code === 'dialect_ambiguous');
    }
    setLoading(false);
    return result.ok;
  }, []);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConflict(false);
    const result = await window.invoicing.reloadCustomers();
    if (result.ok) setCustomers(result.value);
    else setError(result.error.message);
    setLoading(false);
    return result.ok;
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const save = useCallback(async (customer: Customer) => {
    setSaving(true);
    setError(null);
    const result = await window.invoicing.saveCustomer(customer);
    if (result.ok) setCustomers(result.value);
    else {
      setError(result.error.message);
      setConflict(result.error.code === 'conflict');
    }
    setSaving(false);
    return result.ok;
  }, []);
  const remove = useCallback(async (id: string) => {
    setError(null);
    const result = await window.invoicing.deleteCustomer(id);
    if (result.ok) setCustomers(result.value);
    else {
      setError(result.error.message);
      setConflict(result.error.code === 'conflict');
    }
    return result.ok;
  }, []);
  return {
    customers,
    loading,
    saving,
    error,
    setError,
    conflict,
    dialectAmbiguous,
    setDialectAmbiguous,
    refresh,
    reload,
    save,
    remove,
  };
}
