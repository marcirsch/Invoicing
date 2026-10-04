import { useMemo, useState } from 'react';
import type { Customer } from '../../shared/domain/customer';
interface Props {
  customers: Customer[];
  csvPath: string | null;
  loading: boolean;
  onAdd(): void;
  onEdit(customer: Customer): void;
  onDelete(customer: Customer): void;
  onSelectCsv(): void;
  onReload(): void;
}
export function CustomerList({
  customers,
  csvPath,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onSelectCsv,
  onReload,
}: Props): JSX.Element {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const q = query.toLocaleLowerCase();
    return customers.filter((customer) =>
      [
        customer.name,
        customer.email,
        customer.phone,
        customer.address.city,
      ].some((value) => value.toLocaleLowerCase().includes(q)),
    );
  }, [customers, query]);
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Customers</h2>
          <p>{csvPath ?? 'Choose a CSV file to manage customers.'}</p>
        </div>
        <div className="button-row">
          <button type="button" className="secondary" onClick={onSelectCsv}>
            Choose CSV…
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!csvPath || loading}
            onClick={onReload}
          >
            Reload
          </button>
          <button type="button" disabled={!csvPath} onClick={onAdd}>
            Add customer
          </button>
        </div>
      </div>
      {csvPath && (
        <label className="search-field" htmlFor="customer-search">
          Search customers
          <input
            id="customer-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, email, phone, or city"
          />
        </label>
      )}
      {loading ? (
        <p role="status">Loading customers…</p>
      ) : !csvPath ? (
        <div className="empty-state">
          <p>No customer CSV selected yet.</p>
          <button type="button" onClick={onSelectCsv}>
            Choose customer CSV
          </button>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <p>This CSV has no customers yet.</p>
          <button type="button" onClick={onAdd}>
            Add the first customer
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p>No customers match “{query}”.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">City</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.email}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.address.city}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onEdit(customer)}
                        aria-label={`Edit ${customer.name}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => onDelete(customer)}
                        aria-label={`Delete ${customer.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
