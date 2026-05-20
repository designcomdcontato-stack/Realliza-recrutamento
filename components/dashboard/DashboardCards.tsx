import React from 'react';
import { 
  Users, UserPlus, CalendarCheck, CheckCircle2, 
  XCircle, UserCheck, Star, Zap, History, Target
} from 'lucide-react';
import { DashboardMetrics } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface Props {
  metrics: DashboardMetrics;
  onCardClick: (filter: { key: string, value: any }) => void;
}

export const DashboardCards: React.FC<Props> = ({ metrics, onCardClick }) => {
  const cards = [
    { 
      label: 'Total Candidatos', 
      value: metrics.totalCandidates, 
      icon: Users, 
      color: 'bg-indigo-50 text-indigo-600',
      key: null 
    },
    { 
      label: 'Candidatos Novos', 
      value: metrics.newCandidates, 
      icon: UserPlus, 
      color: 'bg-emerald-50 text-emerald-600',
      key: 'fase',
      val: 'Novo'
    },
    { 
      label: 'Agendados', 
      value: metrics.scheduledInterviews, 
      icon: CalendarCheck, 
      color: 'bg-amber-50 text-amber-600',
      key: 'status',
      val: 'Agendado'
    },
    { 
      label: 'Contratados', 
      value: metrics.hired, 
      icon: UserCheck, 
      color: 'bg-brand-coral/10 text-brand-coral',
      key: 'status',
      val: 'Contratado'
    },
    { 
      label: 'Comparecimento', 
      value: `${metrics.attendanceRate.toFixed(1)}%`, 
      icon: Zap, 
      color: 'bg-violet-50 text-violet-600',
      key: null 
    },
    { 
      label: 'Taxa Aprovação', 
      value: `${metrics.approvalRate.toFixed(1)}%`, 
      icon: Target, 
      color: 'bg-sky-50 text-sky-600',
      key: null 
    },
    { 
      label: 'Compatibilidade', 
      value: `${metrics.averageCompatibility.toFixed(0)}%`, 
      icon: Star, 
      color: 'bg-brand-coral text-white',
      key: 'compatibilityLevel',
      val: 'Alta'
    },
    { 
      label: 'Não Compareceu', 
      value: metrics.noShows, 
      icon: XCircle, 
      color: 'bg-rose-50 text-rose-600',
      key: 'status',
      val: 'Não compareceu'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {cards.map((card, i) => (
        <button 
          key={i}
          onClick={() => card.key && onCardClick({ key: card.key, value: card.val })}
          className={cn(
            "p-5 rounded-3xl border border-border/50 text-left transition-all hover:scale-105 hover:shadow-xl",
            card.key ? "cursor-pointer hover:border-brand-coral" : "cursor-default",
            "bg-white"
          )}
        >
          <div className={cn("p-2 rounded-xl w-fit mb-3", card.color)}>
            <card.icon size={18} />
          </div>
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter mb-1 leading-tight">{card.label}</p>
          <p className="text-xl font-black text-brand-dark tracking-tight">{card.value}</p>
        </button>
      ))}
    </div>
  );
};
