import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { BarChart as BarChartIcon } from 'lucide-react';
import { Application, Candidate, ApplicationPhase, ApplicationStatus } from '@/types';
import { DashboardFilters } from '@/types/dashboard';

interface Props {
  data: (Application & { candidate?: Candidate })[];
  filters: DashboardFilters;
  onFilterClick: (key: keyof DashboardFilters, value: any) => void;
}

export const DashboardCharts: React.FC<Props> = ({ data, onFilterClick }) => {
  // 1. Canal de Captação
  const channelData = useMemo(() => {
    const groups: Record<string, number> = {};
    data.forEach(app => {
      const channel = app.channel || 'Não definido';
      groups[channel] = (groups[channel] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // 2. Fases de Atendimento
  const phaseData = useMemo(() => {
    const groups: Record<string, number> = {};
    data.forEach(app => {
      groups[app.currentPhase] = (groups[app.currentPhase] || 0) + 1;
    });
    return Object.values(ApplicationPhase).map(phase => ({
      name: phase,
      value: groups[phase] || 0
    }));
  }, [data]);

  // 3. Status
  const statusData = useMemo(() => {
    const groups: Record<string, number> = {};
    data.forEach(app => {
      groups[app.currentStatus] = (groups[app.currentStatus] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 status
  }, [data]);

  // 4. Localidade (Cidades)
  const cityData = useMemo(() => {
    const groups: Record<string, number> = {};
    data.forEach(app => {
      const city = app.candidate?.city || 'Não definido';
      groups[city] = (groups[city] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data]);

  const COLORS = ['#FF4D6D', '#2D3436', '#00B894', '#0984E3', '#6C5CE7', '#FAB1A0', '#FDCB6E'];

  if (data.length === 0) {
    return (
      <div className="col-span-full py-20 bg-brand-bg/20 rounded-[40px] border border-dashed border-border flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-muted-foreground mb-4">
           <BarChartIcon size={32} />
        </div>
        <h3 className="font-black text-brand-dark uppercase tracking-widest text-xs">Sem dados ainda</h3>
        <p className="text-xs text-muted-foreground font-medium mt-1">Não há candidatos registrados ou os filtros atuais não retornaram resultados.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = data.length;
      const value = payload[0].value;
      const percent = ((value / total) * 100).toFixed(1);
      return (
        <div className="bg-brand-dark p-3 rounded-xl border border-white/10 shadow-2xl">
          <p className="text-[10px] font-black text-white/50 uppercase mb-1">{label || payload[0].name}</p>
          <p className="text-sm font-black text-white">{value} Candidatos</p>
          <p className="text-[11px] font-bold text-brand-coral">{percent}% do total filtrado</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Canal de Captação */}
      <div className="bg-brand-dark p-8 rounded-[40px] shadow-xl shadow-brand-dark/20 h-[400px] flex flex-col">
        <h3 className="text-white font-extrabold text-sm uppercase tracking-widest mb-8 flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-coral rounded-full animate-pulse" />
          Canais de Captação
        </h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
                data={channelData} 
                layout="vertical"
                onClick={(data) => data?.activeLabel && onFilterClick('canal', data.activeLabel)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100} 
                stroke="#ffffff40" 
                fontSize={10} 
                fontWeight="bold"
                tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
              <Bar dataKey="value" fill="#FF4D6D" radius={[0, 10, 10, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fases do Fluxo */}
      <div className="bg-white p-8 rounded-[40px] border border-border/50 shadow-sm h-[400px] flex flex-col">
        <h3 className="text-brand-dark font-extrabold text-sm uppercase tracking-widest mb-8 flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-dark rounded-full" />
          Candidatos por Fase
        </h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
                data={phaseData}
                onClick={(data) => data?.activeLabel && onFilterClick('fase', data.activeLabel)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000005" />
              <XAxis dataKey="name" stroke="#00000040" fontSize={9} fontWeight="black" />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3D3D3D" radius={[10, 10, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribuição por Status */}
      <div className="bg-white p-8 rounded-[40px] border border-border/50 shadow-sm h-[400px] flex flex-col">
        <h3 className="text-brand-dark font-extrabold text-sm uppercase tracking-widest mb-8">Status Detalhado</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                onClick={(data) => data?.name && onFilterClick('status', data.name)}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="cursor-pointer hover:opacity-80 transition-opacity" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '20px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Localidade (Cidades) */}
      <div className="bg-brand-dark p-8 rounded-[40px] shadow-xl shadow-brand-dark/20 h-[400px] flex flex-col">
        <h3 className="text-white font-extrabold text-sm uppercase tracking-widest mb-8">Top Cidades</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
                data={cityData}
                layout="vertical"
                onClick={(data) => data?.activeLabel && onFilterClick('cidade', data.activeLabel)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} stroke="#ffffff40" fontSize={10} fontWeight="bold" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#FAB1A0" radius={[0, 10, 10, 0]} barSize={20} className="cursor-pointer hover:opacity-80 transition-opacity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
