import type { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { ToastContainer } from '../messages/ToastContainer';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg-base">
      <TopNav />
      <main className="pt-14">{children}</main>
      <ToastContainer />
    </div>
  );
}
