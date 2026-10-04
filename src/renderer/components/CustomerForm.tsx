import { useEffect, useState } from 'react';
import type { Customer } from '../../shared/domain/customer';
import { customerSchema } from '../../shared/validation/customerValidation';

interface Props {
  initial?: Customer;
  saving: boolean;
  onCancel(): void;
  onSave(customer: Customer): Promise<boolean>;
}
const emptyCustomer = (): Customer => ({
  id: crypto.randomUUID(),
  name: '',
  email: '',
  phone: '',
  address: {
    street: '',
    buildingNumber: '',
    postalCode: '',
    city: '',
    country: 'Switzerland',
  },
});

export function CustomerForm({
  initial,
  saving,
  onCancel,
  onSave,
}: Props): JSX.Element {
  const [customer, setCustomer] = useState<Customer>(
    () => initial ?? emptyCustomer(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    setCustomer(initial ?? emptyCustomer());
    setErrors({});
  }, [initial]);
  const set = (key: keyof Customer, value: string) =>
    setCustomer((current) => ({ ...current, [key]: value }));
  const setAddress = (key: keyof Customer['address'], value: string) =>
    setCustomer((current) => ({
      ...current,
      address: { ...current.address, [key]: value },
    }));
  const input = (
    label: string,
    path: string,
    value: string,
    update: (value: string) => void,
    type = 'text',
  ) => {
    const errorKey = path.startsWith('address-')
      ? `address.${path.slice('address-'.length)}`
      : path;
    return (
      <label className="field" htmlFor={`customer-${path}`}>
        {label}
        <input
          id={`customer-${path}`}
          type={type}
          value={value}
          required
          aria-invalid={Boolean(errors[errorKey])}
          aria-describedby={
            errors[errorKey] ? `customer-${path}-error` : undefined
          }
          onChange={(event) => update(event.target.value)}
        />
        {errors[errorKey] && (
          <span className="field-error" id={`customer-${path}-error`}>
            {errors[errorKey]}
          </span>
        )}
      </label>
    );
  };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = customerSchema.safeParse(customer);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues)
        next[issue.path.join('.')] = issue.message;
      setErrors(next);
      const first = Object.keys(next)[0];
      if (first)
        document.getElementById(`customer-${first.replace('.', '-')}`)?.focus();
      return;
    }
    if (await onSave(result.data)) onCancel();
  }
  return (
    <form className="panel" noValidate onSubmit={(event) => void submit(event)}>
      <h2>{initial ? 'Edit customer' : 'Add customer'}</h2>
      <div className="form-grid">
        {input('Name', 'name', customer.name, (value) => set('name', value))}
        {input(
          'Email',
          'email',
          customer.email,
          (value) => set('email', value),
          'email',
        )}
        {input(
          'Phone',
          'phone',
          customer.phone,
          (value) => set('phone', value),
          'tel',
        )}
        {input('Street', 'address-street', customer.address.street, (value) =>
          setAddress('street', value),
        )}
        {input(
          'Building number',
          'address-buildingNumber',
          customer.address.buildingNumber,
          (value) => setAddress('buildingNumber', value),
        )}
        {input(
          'Postal code',
          'address-postalCode',
          customer.address.postalCode,
          (value) => setAddress('postalCode', value),
        )}
        {input('City', 'address-city', customer.address.city, (value) =>
          setAddress('city', value),
        )}
        {input(
          'Country',
          'address-country',
          customer.address.country,
          (value) => setAddress('country', value),
        )}
      </div>
      <div className="button-row">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save customer'}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
