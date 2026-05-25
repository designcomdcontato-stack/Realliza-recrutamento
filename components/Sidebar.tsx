'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, ClipboardPaste, 
  GitBranch, Calendar, Briefcase, 
  BarChart3, FileUp, UserCog, Settings,
  LogOut, Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { motion, AnimatePresence } from 'motion/react';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Candidatos', icon: Users, href: '/candidates' },
  { label: 'Copia e Cola', icon: ClipboardPaste, href: '/copypaste' },
  { label: 'Pipeline', icon: GitBranch, href: '/pipeline' },
  { label: 'Agenda', icon: Calendar, href: '/agenda' },
  { label: 'Vagas', icon: Briefcase, href: '/vagas' },
  { label: 'Configurações', icon: Settings, href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const { settings } = useSettings();
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Hide the entire sidebar system (including button) if not logged in or on login page
  if (pathname === '/login' || !isAuthenticated) {
    return null;
  }

  return (
    <>
      <button 
        className={cn(
          "fixed top-4 left-4 z-50 p-2.5 bg-white/80 backdrop-blur-sm text-brand-dark border border-border/50 rounded-xl shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95 group print:hidden",
          isOpen && "lg:left-[210px] bg-brand-dark text-white border-transparent shadow-none"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X size={18} className="transition-transform group-hover:rotate-90" />
        ) : (
          <Menu size={18} className="transition-transform group-hover:scale-110" />
        )}
      </button>

      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            />
            
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-40 w-64 bg-brand-dark text-white flex flex-col shadow-2xl print:hidden"
            >
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-10 mt-2">
                    {settings?.logo ? (
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2 shadow-lg shadow-black/5 overflow-hidden">
                        <img src={settings.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-brand-coral rounded-2xl flex items-center justify-center font-black text-brand-dark text-2xl shadow-lg shadow-brand-coral/20">
                        {settings?.companyName?.[0] || 'R'}
                      </div>
                    )}
                    <div>
                      <h1 className="font-black text-xl leading-tight tracking-tight">
                        {settings?.companyName?.split(' ')[0] || 'Realliza'}
                      </h1>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        {settings?.companyName?.split(' ').slice(1).join(' ') || 'Recrutamento'}
                      </p>
                    </div>
                  </div>

                  <nav className="space-y-2">
                    {menuItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            if (window.innerWidth < 1024) setIsOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative overflow-hidden",
                            isActive 
                              ? "bg-brand-coral text-brand-dark font-black shadow-lg shadow-brand-coral/20" 
                              : "text-white/50 hover:bg-white/10 hover:text-white font-bold"
                          )}
                        >
                          <item.icon size={22} className={cn(isActive ? "text-brand-dark" : "group-hover:scale-110 transition-transform")} />
                          <span className="text-sm tracking-tight">{item.label}</span>
                          {isActive && (
                            <motion.div 
                              layoutId="active-pill"
                              className="absolute left-0 w-1 h-8 bg-brand-dark rounded-r-full"
                            />
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </div>

              <div className="p-6 mt-auto border-t border-white/5">
                <button 
                  onClick={() => authService.logout()}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl text-white/40 hover:bg-rose-500/10 hover:text-rose-400 w-full transition-all group font-bold"
                >
                  <LogOut size={22} className="group-hover:rotate-12 transition-transform" />
                  <span className="text-sm">Sair</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className={cn("hidden lg:block h-screen transition-all duration-500 ease-in-out", isOpen ? "w-64" : "w-0")} />
    </>
  );
}
