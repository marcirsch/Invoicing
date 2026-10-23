import { useEffect, useRef, useState } from 'react';
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
import type { IssuedInvoice } from '../shared/domain/issuedInvoice';
import { issuedInvoiceSchema } from '../shared/validation/issuedInvoiceValidation';
import { InvoiceArchive } from './components/InvoiceArchive';
import type { IssueIssue } from '../shared/invoice/issueValidation';
import { createInvoiceNumberProposal } from '../shared/invoice/numbering';

type Page = 'customers' | 'settings' | 'invoice' | 'archive';
export default function App(): JSX.Element {
  const isPrintRoute =
    new URLSearchParams(window.location.search).get('printInvoice') === '1';
  return isPrintRoute ? <InvoicePrint /> : <MainApp />;
}

function InvoicePrint(): JSX.Element {
  const [printInvoice, setPrintInvoice] = useState<IssuedInvoice | null>(null);
  useEffect(() => {
    window.__setPrintInvoice = (serialized) => {
      try {
        const parsed = issuedInvoiceSchema.safeParse(
          JSON.parse(serialized) as unknown,
        );
        if (parsed.success) setPrintInvoice(parsed.data);
      } catch {
        setPrintInvoice(null);
      }
    };
    return () => {
      delete window.__setPrintInvoice;
    };
  }, []);
  if (!printInvoice) return <p>Preparing invoice for print…</p>;
  return (
    <InvoiceWorkspace
      draft={{
        id: printInvoice.id,
        invoiceDate: printInvoice.invoiceDate,
        dueDate: printInvoice.dueDate,
        currency: printInvoice.currency,
        suggestedNumber: printInvoice.invoiceNumber,
        customerId: printInvoice.recipient.id,
        customer: printInvoice.recipient,
        sender: {
          ...printInvoice.sender,
          logoDataUrl: printInvoice.sender.logoDataUrl ?? null,
        },
        lines: printInvoice.lines,
        template: printInvoice.template,
        notes: printInvoice.notes,
        invoiceFooter: printInvoice.invoiceFooter,
        dueDateMode: 'manual',
      }}
      customers={[printInvoice.recipient]}
      onChange={() => undefined}
      onAddLine={() => undefined}
      onResetDueDate={() => undefined}
      error={null}
      printOnly
    />
  );
}

function MainApp(): JSX.Element {
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
  const [issuing, setIssuing] = useState(false);
  const [issueMessage, setIssueMessage] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<IssueIssue[]>([]);
  const [replacesInvoiceId, setReplacesInvoiceId] = useState<string | null>(
    null,
  );
  const transactionId = useRef<string | null>(null);
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
      customerState.setErrorCode(result.error.code);
      customerState.setDialectAmbiguous(
        result.error.code === 'dialect_ambiguous',
      );
    } else if (result.value) {
      settings.setSettings({ ...settings.settings, csvPath: result.value });
      await customerState.refresh();
    }
  }
  async function chooseArchive() {
    const result = await window.invoicing.selectArchiveFolder();
    if (!result.ok) settings.setError(result.error.message);
    else if (result.value)
      settings.setSettings({ ...settings.settings, archivePath: result.value });
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
    await customerState.refresh(delimiter);
  }
  async function createCustomerCsv() {
    const result = await window.invoicing.createCustomerCsv();
    if (!result.ok) {
      customerState.setError(result.error.message);
      customerState.setErrorCode(result.error.code);
      return;
    }
    if (!result.value) return;
    customerState.setError(null);
    customerState.setErrorCode(null);
    settings.setSettings((current) => ({
      ...current,
      csvPath: result.value,
    }));
    await customerState.refresh();
  }
  async function initializeEmptyCustomerCsv() {
    const result = await window.invoicing.initializeEmptyCustomerCsv();
    if (!result.ok) {
      customerState.setError(result.error.message);
      customerState.setErrorCode(result.error.code);
      return;
    }
    if (!result.value) return;
    customerState.setError(null);
    customerState.setErrorCode(null);
    settings.setSettings((current) => ({
      ...current,
      csvPath: result.value,
    }));
    await customerState.refresh();
  }
  async function changeAppearance(appearance: 'system' | 'light' | 'dark') {
    const persisted = settings.settings.appearance;
    settings.setSettings({ ...settings.settings, appearance });
    const result = await window.invoicing.setAppearance(appearance);
    if (result.ok)
      settings.setSettings((current) => ({
        ...current,
        appearance: result.value,
      }));
    else {
      settings.setSettings((current) => ({
        ...current,
        appearance: persisted,
      }));
      settings.setError(result.error.message);
    }
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
  async function issueInvoice() {
    if (!invoice.draft || issuing) return;
    setIssuing(true);
    setServerIssues([]);
    setIssueMessage('Validating and creating the invoice…');
    transactionId.current ??= crypto.randomUUID();
    const result = await window.invoicing.issueInvoice({
      draft: invoice.draft,
      transactionId: transactionId.current,
      replacesInvoiceId,
    });
    setIssuing(false);
    if (!result.ok) {
      setIssueMessage(result.error.message);
      setServerIssues(result.error.issues ?? []);
      return;
    }
    const updatedSettings = await window.invoicing.getSettings();
    if (updatedSettings.ok) {
      settings.setSettings(updatedSettings.value);
      invoice.rotateDraft(updatedSettings.value);
    } else {
      await settings.refresh();
      invoice.rotateDraft();
    }
    transactionId.current = null;
    setReplacesInvoiceId(null);
    setIssueMessage(`Invoice ${result.value.invoiceNumber} was issued.`);
    const open = window.confirm(
      'Invoice issued successfully. Open the archived PDF now?',
    );
    if (open) await window.invoicing.openInvoicePdf(result.value.id);
  }
  async function replaceInvoice(id: string) {
    const result = await window.invoicing.readInvoice(id);
    if (!result.ok) {
      setIssueMessage(result.error.message);
      return;
    }
    const record = result.value;
    setReplacesInvoiceId(record.id);
    invoice.update({
      id: crypto.randomUUID(),
      customer: record.recipient,
      customerId: record.recipient.id,
      sender: record.sender,
      lines: structuredClone(record.lines),
      currency: record.currency,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: record.dueDate,
      suggestedNumber: createInvoiceNumberProposal(settings.settings),
      template: record.template,
      notes: record.notes,
      invoiceFooter: record.invoiceFooter,
    });
    setPage('invoice');
    setIssueMessage(`New draft prepared to replace ${record.invoiceNumber}.`);
  }

  return (
    <AppShell
      active={page}
      onNavigate={setPage}
      appearance={settings.settings.appearance}
      onAppearanceChange={changeAppearance}
    >
      {customerState.error && customerState.errorCode !== 'csv_empty' && (
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
          settings={settings.settings}
          onChange={invoice.update}
          onAddLine={invoice.addLine}
          onResetDueDate={invoice.resetDueDate}
          error={invoice.error}
          onIssue={() => void issueInvoice()}
          issuing={issuing}
          issueMessage={issueMessage}
          issueIssues={serverIssues}
          onOpenSettings={() => setPage('settings')}
        />
      ) : page === 'archive' ? (
        <InvoiceArchive onReplace={(id) => void replaceInvoice(id)} />
      ) : page === 'settings' ? (
        <SettingsForm
          settings={settings.settings}
          loading={settings.loading}
          saving={settings.saving}
          error={settings.error}
          onChange={settings.setSettings}
          onSave={saveSettings}
          onSelectCsv={() => void chooseCsv()}
          onCreateCsv={() => void createCustomerCsv()}
          canInitializeEmptyCsv={customerState.errorCode === 'csv_empty'}
          onInitializeEmptyCsv={() => void initializeEmptyCustomerCsv()}
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
          onCreateCsv={() => void createCustomerCsv()}
          canInitializeEmptyCsv={customerState.errorCode === 'csv_empty'}
          onInitializeEmptyCsv={() => void initializeEmptyCustomerCsv()}
          onReload={() => void customerState.reload()}
        />
      )}
    </AppShell>
  );
}
