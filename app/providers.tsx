'use client';

import { AuthProvider } from '@/lib/AuthContext';
import { Navbar } from '@/components/Navbar';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <div className="min-h-dvh pt-14">{children}</div>
    </AuthProvider>
  );
}
