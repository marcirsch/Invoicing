import type { ReactNode } from 'react';
export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  return <main>{children}</main>;
}
