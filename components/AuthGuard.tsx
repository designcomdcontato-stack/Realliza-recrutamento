'use client';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  // Se for a página de login, sempre permite o acesso
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Enquanto verifica o status de autenticação (isAuthenticated é null)
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-coral"></div>
      </div>
    );
  }

  // Se não estiver autenticado, o hook useAuth já redireciona para /login
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
