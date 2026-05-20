import React from 'react';
import { X, Filter } from 'lucide-react';
import { DashboardFilters } from '@/types/dashboard';
import { Leader } from '@/types';

interface Props {
  filters: DashboardFilters;
  leaders?: Leader[];
  onRemove: (key: keyof DashboardFilters) => void;
  onClear: () => void;
}

export const ActiveFiltersChips: React.FC<Props> = ({ filters, leaders = [], onRemove, onClear }) => {
  const activeEntries = Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '');

  if (activeEntries.length === 0) return null;

  const getLabel = (key: string, value: any) => {
    switch(key) {
      case 'vagaId': return `Vaga: selecionada`;
      case 'canal': return `Canal: ${value}`;
      case 'fase': return `Fase: ${value}`;
      case 'status': return `Status: ${value}`;
      case 'cidade': return `Cidade: ${value}`;
      case 'dateStart': return `Início: ${value}`;
      case 'dateEnd': return `Fim: ${value}`;
      case 'candidato': return `Busca: "${value}"`;
      case 'compatibilityLevel': return `Comp.: ${value}`;
      case 'responsavelId': 
        const leader = leaders.find(l => l.id === value);
        return `Líder: ${leader ? leader.name : value}`;
      default: return `${key}: ${value}`;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-brand-dark/50 mr-2">
        <Filter size={12} />
        <span>Filtros Ativos:</span>
      </div>
      
      {activeEntries.map(([key, value]) => (
        <div 
          key={key}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-dark text-white rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm animate-in fade-in zoom-in-95 duration-200"
        >
          <span>{getLabel(key, value)}</span>
          <button 
            onClick={() => onRemove(key as keyof DashboardFilters)}
            className="hover:text-brand-coral transition-colors"
          >
            <X size={12} strokeWidth={3} />
          </button>
        </div>
      ))}

      <button 
        onClick={onClear}
        className="text-[10px] font-black uppercase text-brand-coral hover:underline ml-2"
      >
        Limpar Tudo
      </button>
    </div>
  );
};
