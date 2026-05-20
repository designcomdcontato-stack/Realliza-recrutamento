import type { Metadata } from 'next';
import './globals.css';
import { ClientWrapper } from '@/components/ClientWrapper';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Realliza Recrutamento',
  description: 'Sistema de Gestão de Recrutamento e Seleção',
};

import { AuthGuard } from '@/components/AuthGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning className="bg-brand-bg text-brand-dark min-h-screen">
        <ErrorBoundary>
          <AuthGuard>
            <ClientWrapper>
              {children}
            </ClientWrapper>
          </AuthGuard>
        </ErrorBoundary>
      </body>
    </html>
  );
}
