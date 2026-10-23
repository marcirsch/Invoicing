import type { ReactNode } from 'react';
export function AppShell({
  children,
  active,
  onNavigate,
  appearance,
  onAppearanceChange,
}: {
  children: ReactNode;
  active: 'customers' | 'settings' | 'invoice' | 'archive';
  onNavigate(page: 'customers' | 'settings' | 'invoice' | 'archive'): void;
  appearance: 'system' | 'light' | 'dark';
  onAppearanceChange(appearance: 'system' | 'light' | 'dark'): void;
}): JSX.Element {
  return (
    <>
      <header className="app-header">
        <div>
          <p className="eyebrow">LOCAL INVOICING</p>
          <h1>Invoicing</h1>
        </div>
        <nav aria-label="Main navigation">
          <button
            type="button"
            className={
              active === 'archive' ? 'nav-button active' : 'nav-button'
            }
            aria-current={active === 'archive' ? 'page' : undefined}
            onClick={() => onNavigate('archive')}
          >
            Archive
          </button>
          <button
            type="button"
            className={
              active === 'invoice' ? 'nav-button active' : 'nav-button'
            }
            aria-current={active === 'invoice' ? 'page' : undefined}
            onClick={() => onNavigate('invoice')}
          >
            Invoice
          </button>
          <button
            type="button"
            className={
              active === 'customers' ? 'nav-button active' : 'nav-button'
            }
            aria-current={active === 'customers' ? 'page' : undefined}
            onClick={() => onNavigate('customers')}
          >
            Customers
          </button>
          <button
            type="button"
            className={
              active === 'settings' ? 'nav-button active' : 'nav-button'
            }
            aria-current={active === 'settings' ? 'page' : undefined}
            onClick={() => onNavigate('settings')}
          >
            Settings
          </button>
        </nav>
        <label className="header-appearance" htmlFor="appearance">
          Appearance
          <select
            id="appearance"
            value={appearance}
            onChange={(event) =>
              onAppearanceChange(event.target.value as typeof appearance)
            }
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </header>
      <main>{children}</main>
    </>
  );
}
