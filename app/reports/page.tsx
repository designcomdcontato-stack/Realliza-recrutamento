'use client';
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Download, Calendar, 
  Users, Target, FileText, PieChart as PieIcon,
  ChevronDown, Filter, Printer, Share2, Sparkles
} from 'lucide-react';
import { db } from '@/database/db';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const data = await db.getDashboardMetrics();
      setMetrics(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return (
     <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-dark animate-pulse">
        <PieIcon size={48} className="mb-4 opacity-20" />
        <p className="font-bold">Gerando relatórios...</p>
     </div>
  );

  const phaseData = Object.entries(metrics.byPhase).map(([name, value]) => ({ name, value }));
  const compatibilityData = Object.entries(metrics.compatibilityLevels).map(([name, value]) => ({ name, value }));
  const COLORS = ['#073F3A', '#F49A9D', '#0B4540', '#D1DEDC', '#EAB308', '#22C55E'];
  const COMPATIBILITY_COLORS: Record<string, string> = {
    Alta: '#22C55E',
    Média: '#EAB308',
    Baixa: '#EF4444'
  };

  const sourceData = [
    { name: 'Mogiconecta', value: 45, color: '#073F3A' },
    { name: 'WhatsApp', value: 30, color: '#22C55E' },
    { name: 'Indicação', value: 15, color: '#F49A9D' },
    { name: 'LinkedIn', value: 10, color: '#0B4540' },
  ];

  const conversionData = [
    { name: 'Triagem', value: 100 },
    { name: 'Agendamento', value: 65 },
    { name: 'Entrevista', value: 40 },
    { name: 'Hiring', value: 12 },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-sans text-brand-dark pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 mb-12">
        <div className="hidden md:block"></div>
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-brand-dark whitespace-nowrap">Painel Analítico</h1>
        </div>
        <div className="flex items-center justify-center md:justify-end gap-3">
           <button 
            onClick={() => window.print()}
            className="px-6 py-3 bg-white border border-border/50 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-brand-bg transition-all shadow-sm"
           >
             <Printer size={16} />
             PDF
           </button>
           <button 
            onClick={() => alert('Função disponível na versão Pro com integração Supabase.')}
            className="px-6 py-3 bg-brand-dark text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-brand-dark/20"
           >
             <Download size={16} />
             Exportar Excel
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Candidatos', value: metrics.totalCandidates, sub: 'Total na base', icon: Users, color: 'text-brand-dark' },
          { label: 'Conversão', value: '12%', sub: 'Hiring rate', icon: Target, color: 'text-brand-coral' },
          { label: 'Vagas Ativas', value: '8', sub: 'Processos abertos', icon: Target, color: 'text-brand-secondary' },
          { label: 'Entrevistas/Mês', value: '54', sub: 'Volume mensal', icon: Calendar, color: 'text-emerald-500' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] border border-border/50 shadow-sm group hover:shadow-2xl transition-all">
             <div className="flex items-center justify-between mb-4">
                <item.icon size={20} className={item.color} />
                <TrendingUp size={16} className="text-emerald-500" />
             </div>
             <p className="text-4xl font-black mb-1">{item.value}</p>
             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
             <p className="text-xs text-muted-foreground mt-4 font-medium opacity-60 italic">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm">
           <div className="flex items-center justify-between mb-10">
              <div>
                 <h3 className="text-2xl font-extrabold tracking-tight">Qualidade da Base</h3>
                 <p className="text-muted-foreground font-medium">Distribuição por níveis de compatibilidade.</p>
              </div>
              <Sparkles size={24} className="text-brand-coral" />
           </div>

           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={compatibilityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} 
                    />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                       {compatibilityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COMPATIBILITY_COLORS[entry.name] || '#94A3B8'} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-10">
             <div>
                <h3 className="text-2xl font-extrabold tracking-tight">Origem dos Candidatos</h3>
                <p className="text-muted-foreground font-medium">Quais canais trazem mais talentos?</p>
             </div>
             <PieIcon size={24} className="text-brand-coral" />
          </div>

          <div className="h-[350px] w-full flex flex-col md:flex-row items-center">
             <div className="h-full w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={10}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="w-full md:w-1/2 space-y-4 px-8">
                {sourceData.map(s => (
                  <div key={s.name} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-sm font-bold">{s.name}</span>
                     </div>
                     <span className="text-sm font-black italic">{s.value}%</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm">
           <div className="flex items-center justify-between mb-10">
              <div>
                 <h3 className="text-2xl font-extrabold tracking-tight">Funil de Conversão</h3>
                 <p className="text-muted-foreground font-medium">Eficiência de cada etapa do processo.</p>
              </div>
              <Target size={24} className="text-brand-secondary" />
           </div>

           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={conversionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F49A9D" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F49A9D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '16px'}} 
                  />
                  <Area type="monotone" dataKey="value" stroke="#F49A9D" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800}} />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="bg-brand-dark p-12 rounded-[50px] shadow-2xl text-white relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-brand-coral opacity-5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-150 duration-1000" />
         
         <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
            <div className="p-8 bg-white/5 rounded-[40px] border border-white/10 flex-shrink-0 animate-pulse">
               <Sparkles size={64} className="text-brand-coral" />
            </div>
            <div>
               <h3 className="text-3xl font-extrabold tracking-tight mb-4">IA COMPATIVEL</h3>
               <p className="text-white/70 text-lg leading-relaxed max-w-2xl mb-8 font-medium">
                 O canal <span className="text-brand-coral font-black">MogiConecta</span> aumentou sua performance em 22% esta semana. Recomendamos priorizar a triagem de currículos deste canal para fechar as vagas de vendas.
               </p>
               <button className="px-8 py-4 bg-brand-coral text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-coral/20 hover:-translate-y-1 transition-all">
                  Otimizar Triagem
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
