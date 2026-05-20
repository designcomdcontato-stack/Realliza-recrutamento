import React from 'react';
import { Application, Candidate, Job } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink, Download } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props {
  apps: (Application & { candidate?: Candidate; job?: Job })[];
  onExport: () => void;
}

export const DashboardTable: React.FC<Props> = ({ apps, onExport }) => {
  return (
    <div className="bg-white rounded-[40px] border border-border/50 shadow-sm overflow-hidden flex flex-col">
      <div className="p-8 border-b border-border/30 flex items-center justify-between bg-brand-bg/20">
        <div>
          <h3 className="text-brand-dark font-extrabold text-sm uppercase tracking-widest">Base de Candidatos Filtrada</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{apps.length} registros encontrados</p>
        </div>
        <button 
          onClick={onExport}
          className="flex items-center gap-2 px-6 py-3 bg-brand-dark text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-brand-dark/20"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-[9px] font-black uppercase text-muted-foreground tracking-widest">Fase / Status</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase text-muted-foreground tracking-widest">Candidato</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase text-muted-foreground tracking-widest">Vaga</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase text-muted-foreground tracking-widest">Canal</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase text-muted-foreground tracking-widest">Cidade</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase text-muted-foreground tracking-widest">Líder</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase text-muted-foreground tracking-widest">Data Entrada</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase text-muted-foreground tracking-widest">Comp.</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase text-muted-foreground tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {apps.slice(0, 50).map((app, index) => (
              <tr 
                key={app.id} 
                className={cn(
                  "hover:bg-brand-coral/10 transition-colors group",
                  index % 2 === 0 ? "bg-white" : "bg-brand-coral/[0.02]"
                )}
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-brand-dark uppercase tracking-tighter">{app.currentPhase}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{app.currentStatus}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-dark flex items-center justify-center text-white text-[10px] font-black">
                      {app.candidate?.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-black text-brand-dark leading-none">{app.candidate?.name}</p>
                      <p className="text-[9px] font-bold text-muted-foreground mt-1">{app.candidate?.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black uppercase text-brand-dark/70 tracking-tighter">{app.job?.title || 'Vaga não def.'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-md bg-gray-100 text-[9px] font-black text-gray-600 uppercase">{app.channel || '-'}</span>
                </td>
                <td className="px-6 py-4 text-[10px] font-bold text-brand-dark/60">{app.candidate?.city || '-'}</td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black uppercase text-brand-dark/70 tracking-tighter">{app.responsible || app.leaderId || '-'}</span>
                </td>
                <td className="px-6 py-4 text-[10px] font-bold text-brand-dark/60">
                    {app.entryDate ? format(new Date(app.entryDate), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-coral" 
                        style={{ width: `${app.compatibilityScore}%` }} 
                      />
                    </div>
                    <span className="text-[10px] font-black text-brand-coral">{app.compatibilityScore}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Link 
                    href={`/candidates?id=${app.candidateId}`}
                    className="p-2 hover:bg-brand-dark hover:text-white rounded-lg transition-all inline-flex items-center justify-center text-brand-dark/40"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </td>
              </tr>
            ))}
            {apps.length === 0 && (
                <tr>
                    <td colSpan={9} className="px-6 py-20 text-center text-muted-foreground font-bold uppercase text-xs">
                        Nenhum candidato encontrado com os filtros selecionados
                    </td>
                </tr>
            )}
          </tbody>
        </table>
        {apps.length > 50 && (
            <div className="p-4 text-center border-t border-border/30 bg-gray-50/30">
                <p className="text-[10px] font-black text-muted-foreground uppercase">Exibindo os últimos 50 de {apps.length} registros. Use os filtros para refinar sua busca.</p>
            </div>
        )}
      </div>
    </div>
  );
};
