import type { ReactNode } from 'react';
export function AppShell({
  children,
  active,
  onNavigate,
}: {
  children: ReactNode;
  active: 'customers' | 'settings';
  onNavigate(page: 'customers' | 'settings'): void;
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
      </header>
      <main>{children}</main>
    </>
  );
}
