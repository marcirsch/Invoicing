import type { Customer } from '../../shared/domain/customer';
export function CustomerList({
  customers,
}: {
  customers: Customer[];
}): JSX.Element {
  return (
    <ul>
      {customers.map((customer) => (
        <li key={customer.id}>{customer.name}</li>
      ))}
    </ul>
  );
}
