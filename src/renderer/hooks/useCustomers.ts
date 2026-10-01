import { useEffect, useState } from 'react';
import type { Customer } from '../../shared/domain/customer';
export function useCustomers(): Customer[] {
  const [value, setValue] = useState<Customer[]>([]);
  useEffect(() => {
    void window.invoicing
      .listCustomers()
      .then((r) => r.ok && setValue(r.value));
  }, []);
  return value;
}
