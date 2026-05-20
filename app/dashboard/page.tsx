'use client';
import React from 'react';

export const dynamic = 'force-dynamic';

import { useDashboard } from '@/hooks/useDashboard';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { DashboardCards } from '@/components/dashboard/DashboardCards';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { DashboardTable } from '@/components/dashboard/DashboardTable';
import { ActiveFiltersChips } from '@/components/dashboard/ActiveFiltersChips';
import { exportService } from '@/services/exportService';
import { Sparkles, MessageSquare, Briefcase, Download, RotateCcw, Filter, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { 
    raw, 
    filteredApps, 
    metrics, 
    filters, 
    loading, 
    refresh,
    error,
    applyFilter, 
    toggleFilter, 
    removeFilter, 
    clearFilters 
  } = useDashboard();

  const handleExport = () => {
    const exportData = filteredApps.map(app => {
      const leader = raw.settings?.leaders?.find((l: any) => l.id === app.leaderId);
      return {
        Nome: app.candidate?.name,
        Vaga: app.job?.title,
        Canal: app.channel,
        Fase: app.currentPhase,
        Status: app.currentStatus,
        Cidade: app.candidate?.city,
        Data_Entrada: app.entryDate,
        Responsável: leader ? leader.name : app.responsible,
        Compatibilidade: `${app.compatibilityScore}%`
      };
    });
    exportService.downloadCSV('dashboard_realliza', exportData);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/10 animate-bounce">
          <AlertCircle size={40} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-brand-dark tracking-tight">{error.message}</h2>
          {error.details && (
             <div className="p-4 bg-brand-bg rounded-2xl border border-border/50 text-[10px] font-mono text-muted-foreground max-w-lg mx-auto">
                <p className="font-bold uppercase mb-1">Motivo Real:</p>
                {error.details}
                {error.code && <p className="mt-1">Código: {error.code}</p>}
                {error.hint && <p className="mt-1 italic text-brand-dark">Dica: {error.hint}</p>}
             </div>
          )}
        </div>
        <button 
          onClick={refresh}
          className="px-10 py-4 bg-brand-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 shadow-xl shadow-brand-dark/20"
        >
          <RotateCcw size={18} />
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (loading && raw.applications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Sparkles size={48} className="text-brand-coral opacity-20" />
          <p className="font-black text-brand-dark uppercase tracking-widest text-xs">Carregando Painel Analítico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-sans text-brand-dark pb-20">
      {/* Topo Looker Style */}
      <div className="bg-brand-dark -mx-8 px-8 py-10 mb-10 text-white rounded-b-[60px] shadow-2xl shadow-brand-dark/20 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-brand-coral opacity-5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-125 transition-transform duration-1000" />
         
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-brand-coral rounded-3xl flex items-center justify-center text-white shadow-xl shadow-brand-coral/20">
                <TrendingUp size={32} strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none mb-2">{raw.settings?.companyName || 'Controle Recrutamento'}</h1>
                <div className="text-white/50 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                   Painel em Tempo Real • {raw.settings?.companyName || 'Realliza Consórcios'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
               <button 
                onClick={refresh}
                className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group"
               >
                 <RotateCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
               </button>
               <Link href="/copypaste" className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all">
                 <MessageSquare size={16} className="text-brand-coral" />
                 Entrada Rápida
               </Link>
               <button 
                onClick={handleExport}
                className="px-6 py-4 bg-brand-coral text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-brand-coral/20"
               >
                 <Download size={16} />
                 Relatório Geral
               </button>
            </div>
         </div>
      </div>

      <div className="space-y-8 px-2">
        {/* Bloco de Filtros */}
        <DashboardFilters 
          filters={filters} 
          jobs={raw.jobs} 
          leaders={raw.settings?.leaders}
          onApply={applyFilter} 
          onClear={clearFilters} 
        />

        {/* Chips de Filtros Ativos */}
        <ActiveFiltersChips 
          filters={filters} 
          leaders={raw.settings?.leaders}
          onRemove={removeFilter} 
          onClear={clearFilters} 
        />

        {/* Cards de Métricas */}
        <DashboardCards 
          metrics={metrics} 
          onCardClick={({key, value}) => toggleFilter(key as any, value)} 
        />

        {/* Gráficos Interativos */}
        <DashboardCharts 
          data={filteredApps} 
          filters={filters} 
          onFilterClick={toggleFilter} 
        />

        {/* Tabela de Detalhes */}
        <DashboardTable 
          apps={filteredApps} 
          onExport={handleExport} 
        />
      </div>
    </div>
  );
}

