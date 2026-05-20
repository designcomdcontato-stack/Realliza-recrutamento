'use client';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { seedDatabase } from '@/lib/mockData';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedDatabase().catch(console.error);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
