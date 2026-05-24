
import { supabase } from '@/lib/supabaseClient';

export const authService = {
  isConfigured: (): boolean => {
    if (typeof window === 'undefined') return false;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    return !!(url && key);
  },

  isLocalMode: (): boolean => {
    if (typeof window === 'undefined') return false;
    const override = localStorage.getItem('database_provider_override');
    if (override === 'local') return true;
    if (override === 'supabase') return false;
    const prov = process.env.NEXT_PUBLIC_DATABASE_PROVIDER || process.env.VITE_DATABASE_PROVIDER || 'local';
    return prov === 'local';
  },

  login: async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // Se estiver rodando em Modo Local (localStorage) ou se o Supabase não estiver configurado, rodamos o fluxo offline
    if (authService.isLocalMode() || !authService.isConfigured()) {
      let localUsers: any[] = [];
      const storedUsers = localStorage.getItem('realliza_users');
      if (storedUsers) {
        try {
          localUsers = JSON.parse(storedUsers);
        } catch (e) {
          console.error("Erro ao analisar realliza_users:", e);
        }
      }

      // Garante semeação automática do usuário david.lapa@meraki.com para facilidade de testes em modo local
      const hasDavid = localUsers.some(u => u.email.trim().toLowerCase() === 'david.lapa@meraki.com');
      if (!hasDavid) {
        localUsers.push({
          id: 'david-lapa',
          name: 'David Lapa',
          email: 'david.lapa@meraki.com',
          role: 'RH',
          position: 'Gerente de Planos e Atendimento',
          status: 'Ativo',
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('realliza_users', JSON.stringify(localUsers));
      }

      const dbUser = localUsers.find(u => u.email.trim().toLowerCase() === trimmedEmail);

      if (!dbUser) {
        return { success: false, message: "E-mail ou senha inválidos." };
      }

      if (dbUser.status === 'Inativo' || dbUser.status === 'inactive') {
        return { 
          success: false, 
          message: "Usuário inativo. Peça ao administrador para ativar seu acesso." 
        };
      }

      if (trimmedPassword.length < 4) {
        return { success: false, message: "A senha deve ter no mínimo 4 caracteres." };
      }

      const session = {
        id: dbUser.id,
        name: dbUser.name || "Usuário",
        email: dbUser.email,
        role: dbUser.role || "RH",
        position: dbUser.position || "",
        status: dbUser.status || "Ativo",
        isAuthenticated: true,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('realliza_session', JSON.stringify(session));
      window.dispatchEvent(new Event('realliza_auth_change'));

      return { success: true };
    }

    try {
      // 1. Tentar fazer login no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword
      });

      if (authError) {
        // Se falhou no login, verificamos se o e-mail existe em app_users
        const { data: dbUser } = await supabase
          .from('app_users')
          .select('id, name, status')
          .eq('email', trimmedEmail)
          .maybeSingle();

        if (dbUser) {
          // O usuário existe em app_users, então a senha está errada
          return { success: false, message: "E-mail ou senha inválidos." };
        } else {
          // O usuário não existe em app_users
          return { success: false, message: "Usuário não autorizado." };
        }
      }

      // 2. Se logou com sucesso no Auth, busca as informações do usuário em app_users
      const { data: dbUser, error: dbError } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (dbError || !dbUser) {
        // Se não houver registro correspondente na tabela app_users, desloga e bloqueia
        await supabase.auth.signOut();
        return { 
          success: false, 
          message: "Usuário sem permissão no sistema. Peça ao administrador para liberar seu acesso." 
        };
      }

      // 3. Verificar o status em app_users
      if (dbUser.status === 'Inativo' || dbUser.status === 'inactive') {
        await supabase.auth.signOut();
        return { 
          success: false, 
          message: "Usuário inativo. Peça ao administrador para ativar seu acesso." 
        };
      }

      // 4. Se chegou aqui, usuário é válido e está Ativo! Salva a sessão no localStorage
      const session = {
        id: dbUser.id,
        name: dbUser.name || "Usuário",
        email: dbUser.email,
        role: dbUser.role || "RH",
        position: dbUser.position || "",
        status: dbUser.status || "Ativo",
        isAuthenticated: true,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('realliza_session', JSON.stringify(session));
      window.dispatchEvent(new Event('realliza_auth_change'));

      return { success: true };
    } catch (err) {
      console.error("Erro no authService.login:", err);
      return { success: false, message: "Erro ao tentar realizar login." };
    }
  },

  logout: async () => {
    localStorage.removeItem('realliza_session');
    try {
      if (authService.isConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error("Erro ao deslogar do Supabase:", e);
    }
    // O evento notificará useAuth() / AuthGuard para redirecionar de forma limpa usando o router do Next.js
    window.dispatchEvent(new Event('realliza_auth_change'));
  },

  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const sessionStr = localStorage.getItem('realliza_session');
      if (!sessionStr || sessionStr === "undefined" || sessionStr === "null") return false;
      
      const session = JSON.parse(sessionStr);
      return session && session.isAuthenticated === true;
    } catch (e) {
      console.error("AuthService: Error parsing session:", e);
      return false;
    }
  },

  getUser: () => {
    if (typeof window === 'undefined') return null;
    try {
      const sessionStr = localStorage.getItem('realliza_session');
      if (!sessionStr || sessionStr === "undefined" || sessionStr === "null") return null;
      
      return JSON.parse(sessionStr);
    } catch (e) {
      console.error("AuthService: Error parsing user session:", e);
      return null;
    }
  },

  checkActiveSession: async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    if (authService.isLocalMode() || !authService.isConfigured()) {
      const localSession = localStorage.getItem('realliza_session');
      if (localSession) {
        try {
          const parsed = JSON.parse(localSession);
          if (parsed && parsed.isAuthenticated === true) {
            return true;
          }
        } catch (e) {
          console.error("Erro ao analisar sessão no checkActiveSession:", e);
        }
      }
      return false;
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn("Supabase auth session error (expected if token expired or invalid):", error.message);
        if (localStorage.getItem('realliza_session')) {
          localStorage.removeItem('realliza_session');
          window.dispatchEvent(new Event('realliza_auth_change'));
        }
        return false;
      }

      const supabaseSession = data?.session;
      
      if (!supabaseSession) {
        if (localStorage.getItem('realliza_session')) {
          localStorage.removeItem('realliza_session');
          window.dispatchEvent(new Event('realliza_auth_change'));
        }
        return false;
      }

      const email = supabaseSession.user?.email;
      if (email) {
        const { data: dbUser } = await supabase
          .from('app_users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (dbUser && dbUser.status === 'Ativo') {
          const session = {
            id: dbUser.id,
            name: dbUser.name || "Usuário",
            email: dbUser.email,
            role: dbUser.role || "RH",
            position: dbUser.position || "",
            status: dbUser.status || "Ativo",
            isAuthenticated: true,
            loginTime: new Date().toISOString()
          };
          localStorage.setItem('realliza_session', JSON.stringify(session));
          return true;
        }
      }

      await supabase.auth.signOut();
      localStorage.removeItem('realliza_session');
      window.dispatchEvent(new Event('realliza_auth_change'));
      return false;
    } catch (e) {
      console.error("Erro em checkActiveSession:", e);
      return false;
    }
  }
};
