import React from 'react';
import { 
  Calendar, Briefcase, Filter, Search, X, 
  MapPin, User, Layers, Clock, ShieldCheck, TrendingUp 
} from 'lucide-react';
import { DashboardFilters as IFilters } from '@/types/dashboard';
import { Job, ApplicationPhase, ApplicationStatus, Leader } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  filters: IFilters;
  jobs: Job[];
  leaders?: Leader[];
  onApply: (key: keyof IFilters, value: any) => void;
  onClear: () => void;
}

export const DashboardFilters: React.FC<Props> = ({ filters, jobs, leaders = [], onApply, onClear }) => {
  return (
    <div className="bg-brand-dark p-6 rounded-[32px] text-white shadow-xl shadow-brand-dark/20 space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Filter size={20} className="text-brand-coral" />
            <h2 className="font-extrabold uppercase text-xs tracking-widest">Filtros Inteligentes</h2>
          </div>
          
          <div className="hidden md:flex items-center gap-2 border-l border-white/10 pl-6">
            <User size={14} className="text-white/30" />
            <select 
              className="bg-transparent text-[10px] font-black uppercase text-white/70 outline-none cursor-pointer focus:text-brand-coral transition-colors"
              value={filters.responsavelId || ''}
              onChange={e => onApply('responsavelId', e.target.value)}
            >
              <option value="" className="bg-brand-dark">Filtrar por Líder</option>
              {leaders.map(l => (
                <option key={l.id} value={l.id} className="bg-brand-dark">{l.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button 
          onClick={onClear}
          className="text-[10px] uppercase font-black text-brand-coral hover:text-white transition-colors"
        >
          Limpar Tudo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* Busca por Candidato */}
        <div className="relative group">
          <label className="text-[9px] font-black uppercase text-white/50 ml-1 mb-1 block tracking-wider">Candidato</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={14} />
            <input 
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-2xl outline-none focus:border-brand-coral text-xs font-bold transition-all"
              placeholder="Buscar por nome..."
              value={filters.candidato || ''}
              onChange={e => onApply('candidato', e.target.value)}
            />
          </div>
        </div>

        {/* Vaga */}
        <div>
          <label className="text-[9px] font-black uppercase text-white/50 ml-1 mb-1 block tracking-wider">Vaga / Perfil</label>
          <select 
            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl outline-none focus:border-brand-coral text-xs font-bold appearance-none cursor-pointer"
            value={filters.vagaId || ''}
            onChange={e => onApply('vagaId', e.target.value)}
          >
            <option value="" className="bg-brand-dark">Todas as Vagas</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id} className="bg-brand-dark">{job.title}</option>
            ))}
          </select>
        </div>

        {/* Fase */}
        <div>
          <label className="text-[9px] font-black uppercase text-white/50 ml-1 mb-1 block tracking-wider">Etapa do Fluxo</label>
          <select 
            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl outline-none focus:border-brand-coral text-xs font-bold appearance-none cursor-pointer"
            value={filters.fase || ''}
            onChange={e => onApply('fase', e.target.value)}
          >
            <option value="" className="bg-brand-dark">Todas as Fases</option>
            {Object.values(ApplicationPhase).map(p => (
              <option key={p} value={p} className="bg-brand-dark">{p}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="text-[9px] font-black uppercase text-white/50 ml-1 mb-1 block tracking-wider">Status Atual</label>
          <select 
            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl outline-none focus:border-brand-coral text-xs font-bold appearance-none cursor-pointer"
            value={filters.status || ''}
            onChange={e => onApply('status', e.target.value)}
          >
            <option value="" className="bg-brand-dark">Todos os Status</option>
            {Object.values(ApplicationStatus).map(s => (
              <option key={s} value={s} className="bg-brand-dark">{s}</option>
            ))}
          </select>
        </div>

        {/* Data Inicial */}
        <div>
          <label className="text-[9px] font-black uppercase text-white/50 ml-1 mb-1 block tracking-wider">De (Entrada)</label>
          <input 
            type="date"
            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl outline-none focus:border-brand-coral text-xs font-bold"
            value={filters.dateStart || ''}
            onChange={e => onApply('dateStart', e.target.value)}
          />
        </div>

        {/* Data Final */}
        <div>
          <label className="text-[9px] font-black uppercase text-white/50 ml-1 mb-1 block tracking-wider">Até (Entrada)</label>
          <input 
            type="date"
            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl outline-none focus:border-brand-coral text-xs font-bold"
            value={filters.dateEnd || ''}
            onChange={e => onApply('dateEnd', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
