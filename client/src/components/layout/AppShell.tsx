import type { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { ToastContainer } from '../messages/ToastContainer';
import { AlertHistoryDrawer } from '../messages/AlertHistoryDrawer';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="pt-16">{children}</main>
      <ToastContainer />
      <AlertHistoryDrawer />
    </div>
  );
}
