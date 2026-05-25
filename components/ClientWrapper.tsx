'use client';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { seedDatabase } from '@/lib/mockData';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedDatabase().catch(console.error);

    const handleSessionError = (message: string, event: Event) => {
      const lowerMessage = message.toLowerCase();
      if (
        lowerMessage.includes('refresh token') ||
        lowerMessage.includes('refresh_token') ||
        lowerMessage.includes('invalid refresh token') ||
        lowerMessage.includes('not found') && lowerMessage.includes('token')
      ) {
        console.warn("[ClientWrapper] Interceptado erro de Refresh Token nível global, limpando credenciais expiradas:", message);
        event.preventDefault();

        if (typeof window !== 'undefined') {
          localStorage.removeItem('realliza_session');
          // Limpa chaves do Supabase manualmente para evitar loops
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
              localStorage.removeItem(key);
            }
          }
          // Notificar hooks de autenticação para reavaliarem o status e redirecionarem
          window.dispatchEvent(new Event('realliza_auth_change'));
          // Forçar redirecionamento para login
          window.location.href = '/login';
        }
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason || '');
      handleSessionError(message, event);
    };

    const handleWindowError = (event: ErrorEvent) => {
      const message = event.error?.message || event.message || '';
      handleSessionError(message, event);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
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
