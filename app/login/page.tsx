'use client';
import React, { useState } from 'react';
import { authService } from '@/services/authService';
import { TrendingUp, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useSettings } from '@/hooks/useSettings';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { settings } = useSettings();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!authService.isConfigured() && !authService.isLocalMode()) {
      setError('Supabase Auth não configurado.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await authService.login(email, password);
      if (result.success) {
        router.replace('/dashboard');
      } else {
        setError(result.message || 'E-mail ou senha inválidos.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Erro no login:", err);
      setError('Ocorreu um erro ao tentar acessar o sistema.');
      setIsLoading(false);
    }
  };

  const isConfigured = authService.isConfigured();

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-[100px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand-coral/5 rounded-full translate-x-1/2 translate-y-1/2 blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="bg-white rounded-[40px] p-10 shadow-2xl shadow-brand-dark/10 border border-border/50">
          <div className="flex flex-col items-center mb-10">
            {settings?.logo ? (
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center p-4 mb-6 shadow-xl border border-border/30 overflow-hidden">
                <img src={settings.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-brand-dark rounded-3xl flex items-center justify-center text-brand-coral mb-6 shadow-xl shadow-brand-dark/20">
                <TrendingUp size={40} strokeWidth={2.5} />
              </div>
            )}
            <h1 className="text-3xl font-black tracking-tight text-brand-dark text-center leading-none mb-2">
              {settings?.companyName || 'Realliza Control'}
            </h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Gestão Estratégica de Talentos</p>
          </div>

          {!isConfigured && !authService.isLocalMode() && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold text-center">
              ⚠️ Supabase Auth não configurado. Por favor, configure as variáveis de ambiente no arquivo .env.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-brand-dark/60 tracking-widest ml-1">E-mail</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand-coral transition-colors" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 rounded-[22px] bg-brand-bg/50 border border-border focus:ring-4 focus:ring-brand-coral/10 focus:border-brand-coral outline-none text-sm font-bold transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-brand-dark/60 tracking-widest ml-1">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand-coral transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-14 py-5 rounded-[22px] bg-brand-bg/50 border border-border focus:ring-4 focus:ring-brand-coral/10 focus:border-brand-coral outline-none text-sm font-bold transition-all"
                  placeholder="Sua senha"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-brand-dark transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[11px] font-bold text-rose-500 text-center bg-rose-50 p-3 rounded-xl border border-rose-100"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-5 rounded-[22px] bg-brand-dark text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-dark/20 hover:shadow-brand-dark/30 hover:bg-brand-dark/95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processando...
                </>
              ) : (
                'Acessar Sistema'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            © 2024 Realliza • Sistema de Controle Interno
          </p>
        </div>
      </motion.div>
    </div>
  );
}
