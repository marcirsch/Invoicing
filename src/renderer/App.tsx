import { useEffect, useState } from 'react';
import type { Customer } from '../shared/domain/customer';
import { AppShell } from './components/AppShell';
import { CustomerForm } from './components/CustomerForm';
import { CustomerList } from './components/CustomerList';
import { ErrorMessage } from './components/ErrorMessage';
import { SettingsForm } from './components/SettingsForm';
import { useCustomers } from './hooks/useCustomers';
import { useSettings } from './hooks/useSettings';
import { useInvoiceDraft } from './hooks/useInvoiceDraft';
import { InvoiceWorkspace } from './components/InvoiceWorkspace';

type Page = 'customers' | 'settings' | 'invoice';
export default function App(): JSX.Element {
  const [page, setPage] = useState<Page>('customers');
  const [editing, setEditing] = useState<Customer | null | undefined>(
    undefined,
  );
  const settings = useSettings();
  const customerState = useCustomers();
  const invoice = useInvoiceDraft(
    settings.settings,
    customerState.customers,
    !settings.loading && !customerState.loading,
  );
  useEffect(() => {
    if (settings.loading) return;
    if (settings.settings.appearance === 'system')
      delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = settings.settings.appearance;
  }, [settings.loading, settings.settings.appearance]);

  async function chooseCsv() {
    customerState.setError(null);
    const result = await window.invoicing.selectCsv();
    if (!result.ok) {
      customerState.setError(result.error.message);
      customerState.setDialectAmbiguous(
        result.error.code === 'dialect_ambiguous',
      );
    } else if (result.value) {
      await settings.refresh();
      await customerState.refresh();
    }
  }
  async function chooseArchive() {
    const result = await window.invoicing.selectArchiveFolder();
    if (!result.ok) settings.setError(result.error.message);
    else if (result.value) await settings.refresh();
  }
  async function chooseLogo() {
    const result = await window.invoicing.selectInvoiceLogo();
    if (!result.ok) settings.setError(result.error.message);
    else if (result.value)
      settings.setSettings({
        ...settings.settings,
        company: { ...settings.settings.company, logoDataUrl: result.value },
      });
  }
  async function chooseDelimiter(delimiter: ',' | ';' | '\t') {
    if (await customerState.refresh(delimiter)) await settings.refresh();
  }
  async function saveSettings(): Promise<boolean> {
    const saved = await settings.save(settings.settings);
    if (saved && settings.settings.csvPath) await customerState.refresh();
    return saved;
  }
  async function saveCustomer(customer: Customer) {
    return customerState.save(customer);
  }
  async function deleteCustomer(customer: Customer) {
    if (
      window.confirm(
        `Delete ${customer.name} from the selected CSV? This cannot be undone from the app.`,
      )
    )
      await customerState.remove(customer.id);
  }

  return (
    <AppShell active={page} onNavigate={setPage}>
      {customerState.error && (
        <ErrorMessage
          message={customerState.error}
          onReload={
            customerState.conflict
              ? () => void customerState.reload()
              : undefined
          }
        />
      )}
      {customerState.dialectAmbiguous && (
        <section className="dialect-choice" aria-labelledby="dialect-heading">
          <h2 id="dialect-heading">Choose the CSV delimiter</h2>
          <p>
            Choose the character that separates columns in your customer file.
          </p>
          <div className="button-row">
            {(
              [
                ['Comma', ','],
                ['Semicolon', ';'],
                ['Tab', '\t'],
              ] as const
            ).map(([label, delimiter]) => (
              <button
                key={label}
                type="button"
                className="secondary"
                onClick={() => void chooseDelimiter(delimiter)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}
      {page === 'invoice' ? (
        <InvoiceWorkspace
          draft={invoice.draft}
          customers={customerState.customers}
          onChange={invoice.update}
          onAddLine={invoice.addLine}
          onResetDueDate={invoice.resetDueDate}
          error={invoice.error}
        />
      ) : page === 'settings' ? (
        <SettingsForm
          settings={settings.settings}
          loading={settings.loading}
          saving={settings.saving}
          error={settings.error}
          onChange={settings.setSettings}
          onSave={saveSettings}
          onSelectCsv={() => void chooseCsv()}
          onSelectArchive={() => void chooseArchive()}
          onSelectLogo={() => void chooseLogo()}
        />
      ) : editing !== undefined ? (
        <CustomerForm
          initial={editing ?? undefined}
          saving={customerState.saving}
          onCancel={() => setEditing(undefined)}
          onSave={saveCustomer}
        />
      ) : (
        <CustomerList
          customers={customerState.customers}
          csvPath={settings.settings.csvPath}
          loading={customerState.loading}
          onAdd={() => setEditing(null)}
          onEdit={setEditing}
          onDelete={(customer) => void deleteCustomer(customer)}
          onSelectCsv={() => void chooseCsv()}
          onReload={() => void customerState.reload()}
        />
      )}
    </AppShell>
  );
}
