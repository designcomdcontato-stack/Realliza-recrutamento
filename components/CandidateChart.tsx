'use client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

interface CandidateChartProps {
  data: { name: string; value: number }[];
}

export default function CandidateChart({ data }: CandidateChartProps) {
  const COLORS = ['#073F3A', '#F49A9D', '#0B4540', '#D1DEDC', '#BFDBFE'];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#E5E7EB" opacity={0.5} />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{fill: '#4B5563', fontSize: 10, fontWeight: 800}} 
        />
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#4B5563', fontSize: 12, fontWeight: 700}} />
        <Tooltip 
          cursor={{fill: '#F9FAFB'}} 
          contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '16px'}} 
        />
        <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={40}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
