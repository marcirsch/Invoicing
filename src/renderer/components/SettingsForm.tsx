import { useMemo } from 'react';
import type { Settings } from '../../shared/domain/settings';
import { settingsSchema } from '../../shared/validation/settingsValidation';

interface Props {
  settings: Settings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onChange(settings: Settings): void;
  onSave(): Promise<boolean>;
  onSelectCsv(): void;
  onSelectArchive(): void;
  onSelectLogo(): void;
}
export function SettingsForm({
  settings,
  loading,
  saving,
  error,
  onChange,
  onSave,
  onSelectCsv,
  onSelectArchive,
  onSelectLogo,
}: Props): JSX.Element {
  const errors = useMemo(() => {
    const result: Record<string, string> = {};
    const ids: Record<string, string> = {
      'company.name': 'company-name',
      'company.address.street': 'company-street',
      'company.address.postalCode': 'company-postal',
      'company.address.city': 'company-city',
      'company.address.country': 'company-country',
      'company.address.buildingNumber': 'company-building',
      'company.email': 'company-email',
      paymentTermDays: 'payment-days',
      invoicePrefix: 'invoice-prefix',
      invoiceYear: 'invoice-year',
      nextSequence: 'invoice-sequence',
    };
    const parsed = settingsSchema.safeParse(settings);
    if (!parsed.success)
      for (const issue of parsed.error.issues) {
        const id = ids[issue.path.join('.')];
        if (id && !result[id]) result[id] = issue.message;
      }
    if (!settings.company.iban.trim())
      result['company-iban'] = 'IBAN is required to issue a QR-bill.';
    return result;
  }, [settings]);
  const field = (
    label: string,
    id: string,
    value: string | number,
    change: (value: string) => void,
    type = 'text',
  ) => (
    <label className="field" htmlFor={id}>
      {label}
      {[
        'company-name',
        'company-street',
        'company-postal',
        'company-city',
        'company-country',
        'company-iban',
      ].includes(id)
        ? ' *'
        : ''}
      <input
        id={id}
        type={type}
        {...(id === 'payment-days' ? { min: 0, max: 3650, step: 1 } : {})}
        value={value}
        aria-invalid={Boolean(errors[id])}
        aria-describedby={errors[id] ? `${id}-error` : undefined}
        onChange={(event) => change(event.target.value)}
      />
      {errors[id] && (
        <span className="field-error" id={`${id}-error`}>
          {errors[id]}
        </span>
      )}
    </label>
  );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstError = Object.keys(errors).find((id) => id !== 'company-iban');
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }
    await onSave();
  }
  const company = (key: keyof Settings['company'], value: string) =>
    onChange({ ...settings, company: { ...settings.company, [key]: value } });
  const address = (key: keyof Settings['company']['address'], value: string) =>
    onChange({
      ...settings,
      company: {
        ...settings.company,
        address: { ...settings.company.address, [key]: value },
      },
    });
  return (
    <form
      className="panel"
      aria-busy={loading}
      onSubmit={(event) => void submit(event)}
    >
      <h2>Company and invoice settings</h2>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <fieldset disabled={loading || saving}>
        <legend>Company details</legend>
        <div className="form-grid">
          {field(
            'Company name',
            'company-name',
            settings.company.name,
            (value) => company('name', value),
          )}
          {field(
            'Street',
            'company-street',
            settings.company.address.street,
            (value) => address('street', value),
          )}
          {field(
            'Building number',
            'company-building',
            settings.company.address.buildingNumber,
            (value) => address('buildingNumber', value),
          )}
          {field(
            'Postal code',
            'company-postal',
            settings.company.address.postalCode,
            (value) => address('postalCode', value),
          )}
          {field(
            'City',
            'company-city',
            settings.company.address.city,
            (value) => address('city', value),
          )}
          {field(
            'Country',
            'company-country',
            settings.company.address.country,
            (value) => address('country', value),
          )}
          {field(
            'Phone',
            'company-phone',
            settings.company.phone,
            (value) => company('phone', value),
            'tel',
          )}
          {field(
            'Email',
            'company-email',
            settings.company.email,
            (value) => company('email', value),
            'email',
          )}
          {field(
            'Website',
            'company-website',
            settings.company.website,
            (value) => company('website', value),
            'url',
          )}
          {field('IBAN', 'company-iban', settings.company.iban, (value) =>
            company('iban', value),
          )}
          {field(
            'Bank name',
            'company-bank-name',
            settings.company.bankName,
            (value) => company('bankName', value),
          )}
        </div>
      </fieldset>
      <fieldset disabled={loading || saving}>
        <legend>Invoice defaults</legend>
        <div className="form-grid">
          <label className="field" htmlFor="currency">
            Default currency
            <select
              id="currency"
              value={settings.currency}
              onChange={(event) =>
                onChange({
                  ...settings,
                  currency: event.target.value as Settings['currency'],
                })
              }
            >
              <option value="CHF">CHF</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          {field(
            'Payment term (days)',
            'payment-days',
            settings.paymentTermDays,
            (value) =>
              onChange({ ...settings, paymentTermDays: Number(value) }),
            'number',
          )}
          {field(
            'Invoice prefix',
            'invoice-prefix',
            settings.invoicePrefix,
            (value) => onChange({ ...settings, invoicePrefix: value }),
          )}
          {field(
            'Invoice year',
            'invoice-year',
            settings.invoiceYear,
            (value) => onChange({ ...settings, invoiceYear: value }),
          )}
          {field(
            'Next sequence number',
            'invoice-sequence',
            settings.nextSequence,
            (value) => onChange({ ...settings, nextSequence: Number(value) }),
            'number',
          )}
          {field('Template', 'invoice-template', settings.template, (value) =>
            onChange({ ...settings, template: value }),
          )}
        </div>
        <label className="field settings-footer" htmlFor="invoice-footer">
          Invoice footer text
          <textarea
            id="invoice-footer"
            value={settings.invoiceFooter}
            onChange={(event) =>
              onChange({ ...settings, invoiceFooter: event.target.value })
            }
          />
        </label>
      </fieldset>
      <fieldset disabled={loading || saving}>
        <legend>Invoice logo</legend>
        <div className="path-setting">
          {settings.company.logoDataUrl ? (
            <img
              className="settings-logo"
              src={settings.company.logoDataUrl}
              alt="Selected invoice logo"
            />
          ) : (
            <span>No logo selected</span>
          )}
          <button type="button" className="secondary" onClick={onSelectLogo}>
            Choose logo…
          </button>
        </div>
      </fieldset>
      <fieldset disabled={loading || saving}>
        <legend>Local data folders</legend>
        <div className="path-setting">
          <span>Customer CSV: {settings.csvPath ?? 'Not selected'}</span>
          <button type="button" className="secondary" onClick={onSelectCsv}>
            Choose CSV…
          </button>
        </div>
        <div className="path-setting">
          <span>Archive folder: {settings.archivePath ?? 'Not selected'}</span>
          <button type="button" className="secondary" onClick={onSelectArchive}>
            Choose folder…
          </button>
        </div>
      </fieldset>
      <button type="submit" disabled={loading || saving}>
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
