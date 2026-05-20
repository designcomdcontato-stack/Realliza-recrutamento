'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, ArrowLeft, Search, 
  MapPin, Phone, Mail, 
  Calendar, Clock, UserCheck,
  ChevronRight, ExternalLink,
  MessageSquare, History,
  Sparkles
} from 'lucide-react';
import { db } from '@/database/db';
import { Job, Application, Candidate, ApplicationPhase, ApplicationStatus } from '@/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function JobCandidatesPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [candidatesData, setCandidatesData] = useState<{application: Application, candidate: Candidate}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const jobData = await db.getJob(jobId);
        if (!jobData) {
          router.push('/vagas');
          return;
        }
        setJob(jobData);

        const apps = await db.getApplicationsByJob(jobId);
        const allCandidates = await db.listCandidates();
        
        const combined = apps.map(app => ({
          application: app,
          candidate: allCandidates.find(c => c.id === app.candidateId)!
        })).filter(item => item.candidate); // Ensure candidate exists

        setCandidatesData(combined);
      } catch (error) {
        console.error("Failed to fetch job candidates", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId, router]);

  const sortedData = [...candidatesData].sort((a, b) => 
    (b.application.compatibilityScore || 0) - (a.application.compatibilityScore || 0)
  );

  const filteredData = sortedData.filter(item => 
    item.candidate.name.toLowerCase().includes(search.toLowerCase()) ||
    item.application.currentStatus.toLowerCase().includes(search.toLowerCase()) ||
    item.application.currentPhase.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Sparkles size={48} className="text-brand-coral opacity-20" />
          <p className="font-black text-brand-dark uppercase tracking-widest text-xs">Carregando Candidatos...</p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-brand-dark pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/vagas"
            className="p-3 bg-white border border-border shadow-sm rounded-2xl text-brand-dark hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{job.title}</h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
              <span className="font-bold text-brand-coral uppercase tracking-wider text-[11px]">{job.department}</span>
              • {filteredData.length} candidatos vinculados
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <Link 
            href="/candidates"
            className="px-6 py-3 bg-brand-bg text-brand-dark border border-border/50 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all shadow-sm"
           >
             <Users size={16} />
             Base Geral
           </Link>
        </div>
      </div>

      {/* Ranking Header */}
      <div className="bg-brand-dark text-white p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <Sparkles size={24} className="text-brand-coral" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase tracking-widest">Ranking de candidatos</h2>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Ordenados por compatibilidade técnica</p>
          </div>
        </div>
        <button 
          onClick={async () => {
            setLoading(true);
            const { applicationService } = await import('@/services/applicationService');
            await applicationService.recalculateAllForJob(jobId);
            window.location.reload(); 
          }}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all focus:ring-2 focus:ring-brand-coral/50 outline-none"
        >
          Recalcular Ranking
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-[28px] border border-border/50 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input 
            type="text"
            placeholder="Filtrar por nome, status ou fase..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Candidates List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredData.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[40px] border border-dashed border-border/60">
            <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-xl font-bold text-muted-foreground/60 tracking-tight">Candidatos não encontrados para este filtro.</p>
          </div>
        ) : (
          filteredData.map((item, index) => (
            <div 
              key={item.application.id}
              className="bg-white p-8 rounded-[40px] border border-border/50 shadow-sm hover:shadow-xl hover:border-brand-coral/20 transition-all group flex flex-col xl:flex-row items-center gap-8 relative overflow-hidden"
            >
              {/* Ranking Position Badge */}
              <div className="absolute top-0 left-0 bg-brand-dark text-white px-8 py-2 rounded-br-[32px] text-xs font-black tracking-widest shadow-lg">
                #{index + 1} NO RANKING
              </div>

              <div className="w-20 h-20 mt-8 xl:mt-0 bg-brand-bg rounded-[32px] flex items-center justify-center text-brand-dark font-black text-2xl group-hover:bg-brand-coral group-hover:text-white transition-all shadow-inner">
                {item.candidate.name.charAt(0)}
              </div>
              
              <div className="flex-1 text-center xl:text-left">
                <h3 className="text-2xl font-black mb-2">{item.candidate.name}</h3>
                <div className="flex flex-wrap justify-center xl:justify-start items-center gap-4 text-sm text-muted-foreground font-bold uppercase tracking-tight">
                  <span className="flex items-center gap-1.5"><MapPin size={16} className="text-brand-coral" /> {item.candidate.city}</span>
                  <span className="flex items-center gap-1.5"><Phone size={16} className="text-brand-coral" /> {item.candidate.phone}</span>
                </div>
                {/* Experiences Preview */}
                <div className="mt-4 flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Últimas experiências</span>
                  <div className="flex flex-wrap justify-center xl:justify-start gap-2">
                    {item.candidate.experiences.slice(0, 2).map((exp, i) => (
                      <span key={i} className="text-[10px] font-bold bg-brand-bg px-3 py-1 rounded-full text-brand-dark/70 border border-border/30 truncate max-w-[200px]">
                        {exp}
                      </span>
                    ))}
                    {item.candidate.experiences.length > 2 && (
                      <span className="text-[10px] font-bold text-muted-foreground">+ {item.candidate.experiences.length - 2} mais</span>
                    )}
                  </div>
                </div>
                {/* Match Breakdown Preview */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.application.compatibilityDetails?.slice(0, 3).map((detail, dIdx) => (
                    <div key={dIdx} className="flex flex-col items-start bg-brand-bg/50 px-3 py-1.5 rounded-xl border border-border/30">
                      <span className="text-[8px] font-black uppercase text-muted-foreground">{detail.keyword}</span>
                      <span className={cn(
                        "text-[9px] font-black",
                        detail.match === 'exata' || detail.match === 'forte' ? 'text-emerald-600' : 
                        detail.match === 'media' ? 'text-amber-600' : 'text-rose-600'
                      )}>
                        {detail.points} pts • {detail.match}
                      </span>
                    </div>
                  ))}
                  {(item.application.compatibilityDetails?.length || 0) > 3 && (
                    <span className="text-[9px] font-bold text-muted-foreground self-end mb-1">+ {(item.application.compatibilityDetails?.length || 0) - 3} chaves</span>
                  )}
                </div>
              </div>

              {/* Compatibility Badge */}
              <div className="flex flex-col items-center xl:items-end justify-center px-8 border-x border-dashed border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} className="text-brand-coral" />
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Compatibilidade</span>
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-4xl font-black text-brand-dark leading-none">{item.application.compatibilityScore}%</span>
                </div>
                <span className={cn(
                  "mt-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  item.application.compatibilityLevel === 'Alta' ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                  item.application.compatibilityLevel === 'Média' ? "bg-amber-50 border-amber-100 text-amber-700" :
                  "bg-rose-50 border-rose-200 text-rose-700"
                )}>
                  Nível {item.application.compatibilityLevel}
                </span>
                {item.application.experienceInArea && (
                  <span className={cn(
                    "mt-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border text-center",
                    item.application.experienceInArea === 'Sim' ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                    item.application.experienceInArea === 'Parcial' ? "bg-amber-50 border-amber-200 text-amber-700" :
                    "bg-rose-50 border-rose-200 text-rose-700"
                  )}>
                    Exp. na Área: {item.application.experienceInArea}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-6">
                <div className="flex flex-col items-center xl:items-end">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">FASE</span>
                  <span className="px-5 py-2 bg-brand-bg border border-border/50 rounded-2xl text-xs font-black text-brand-dark whitespace-nowrap shadow-sm">
                    {item.application.currentPhase}
                  </span>
                </div>
                <div className="flex flex-col items-center xl:items-end">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">STATUS</span>
                  <span className={cn(
                    "px-5 py-2 rounded-2xl text-xs font-black text-white whitespace-nowrap shadow-lg",
                    item.application.currentStatus === ApplicationStatus.REJECTED ? "bg-rose-500" :
                    item.application.currentStatus === ApplicationStatus.HIRED ? "bg-emerald-500" :
                    item.application.currentStatus === ApplicationStatus.SCARCELY_COMPATIBLE ? "bg-amber-500" : 
                    item.application.currentStatus === ApplicationStatus.APPROVED ? "bg-brand-coral" : "bg-brand-dark"
                  )}>
                    {item.application.currentStatus}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link 
                  href={`/candidates/${item.candidate.id}`}
                  className="p-5 bg-brand-bg rounded-3xl text-brand-dark hover:bg-brand-dark hover:text-white transition-all shadow-md group-hover:scale-110 active:scale-95"
                >
                  <ChevronRight size={32} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
