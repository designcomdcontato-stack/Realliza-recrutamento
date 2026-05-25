'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authService } from '@/services/authService';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const checkAuth = useCallback(() => {
    const authStatus = authService.isAuthenticated();
    
    // Only update state if it actually changed to avoid unnecessary re-renders
    setIsAuthenticated(prev => {
      if (prev === authStatus) return prev;
      return authStatus;
    });
    
    if (!authStatus && pathname !== '/login') {
      router.replace('/login');
    } else if (authStatus && pathname === '/login') {
      router.replace('/dashboard');
    }
  }, [pathname, router]);

  useEffect(() => {
    // Check local session state on client mount for instant render
    const localStatus = authService.isAuthenticated();
    setIsAuthenticated(localStatus);

    if (!localStatus && pathname !== '/login') {
      router.replace('/login');
    } else if (localStatus && pathname === '/login') {
      router.replace('/dashboard');
    }

    let active = true;

    // Sincronizar assincronamente com a sessão ativa do Supabase Auth no carregamento inicial
    const syncSession = async () => {
      try {
        if (authService.isConfigured()) {
          await authService.checkActiveSession();
        }
      } catch (err) {
        console.error("Erro ao sincronizar sessão inicial:", err);
      } finally {
        if (active) {
          checkAuth();
        }
      }
    };

    syncSession();
    
    // Suporte para múltiplas abas
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'realliza_session') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('realliza_auth_change', checkAuth);

    return () => {
      active = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('realliza_auth_change', checkAuth);
    };
  }, [checkAuth, pathname, router]);

  return {
    isAuthenticated,
    user: authService.getUser(),
    login: authService.login,
    logout: authService.logout,
    refresh: checkAuth
  };
}
