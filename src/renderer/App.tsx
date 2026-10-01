import { useEffect, useState } from 'react';
import type { Customer } from '../shared/domain/customer';
import type { Settings } from '../shared/domain/settings';
declare global {
  interface Window {
    invoicing: {
      getSettings(): Promise<{ ok: boolean; value: Settings }>;
      listCustomers(): Promise<{ ok: boolean; value: Customer[] }>;
    };
  }
}
export default function App(): JSX.Element {
  const [settings, setSettings] = useState<Settings>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  useEffect(() => {
    void window.invoicing
      .getSettings()
      .then((r) => r.ok && setSettings(r.value));
    void window.invoicing
      .listCustomers()
      .then((r) => r.ok && setCustomers(r.value));
  }, []);
  return (
    <main>
      <h1>Invoicing</h1>
      <p>
        {settings?.company.name || 'Configure your company settings to begin.'}
      </p>
      <h2>Customers</h2>
      {customers.length ? (
        <ul>
          {customers.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
      ) : (
        <p>No customers loaded.</p>
      )}
    </main>
  );
}
