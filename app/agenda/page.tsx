'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, 
  Clock, MapPin, User, Briefcase,
  Plus, CalendarDays, MoreVertical,
  CheckCircle2, X, AlertCircle,
  Sparkles, Search, Trash2, Edit3, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/database/db';
import { Candidate, Application, Job, ApplicationPhase, Interview, ApplicationStatus } from '@/types';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, parseISO, addHours
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CandidateChart from '@/components/CandidateChart';

export default function AgendaPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [standaloneInterviews, setStandaloneInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [schedulingApp, setSchedulingApp] = useState<Application | null>(null);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    responsible: '',
    type: 'Presencial' as const,
    observations: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const [candData, appData, jobsData, interviewData] = await Promise.all([
      db.listCandidates(),
      db.listApplications(),
      db.listJobs(),
      db.listInterviews()
    ]);
    setCandidates(candData);
    setApps(appData);
    setJobs(jobsData);
    setStandaloneInterviews(interviewData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allEvents = useMemo(() => {
    const list: any[] = [];

    // 1. Add all standalone interviews first, but ONLY if the application is still in an active phase
    standaloneInterviews.forEach(i => {
      const app = apps.find(a => a.id === i.applicationId);
      const isActivePhase = app && [ApplicationPhase.SCHEDULING, ApplicationPhase.INTERVIEW].includes(app.currentPhase);
      
      if (isActivePhase) {
        const candidate = candidates.find(c => c.id === i.candidateId);
        const job = jobs.find(j => j.id === i.jobId);
        list.push({
          id: `int-${i.id}`,
          sourceId: i.id,
          sourceType: 'interview',
          candidateName: candidate?.name || 'Candidato',
          jobTitle: job?.title || 'Vaga',
          time: i.time,
          date: i.date,
          type: i.type,
          status: i.status,
          candidateId: i.candidateId,
          jobId: i.jobId
        });
      }
    });

    // 2. Add events from Applications with interviewDate ONLY if no standalone interview exists for it
    // AND the application is still in an active interviewing phase
    apps.forEach(a => {
      if (a.interviewDate) {
        const hasStandalone = standaloneInterviews.some(i => i.applicationId === a.id);
        const isActivePhase = [ApplicationPhase.SCHEDULING, ApplicationPhase.INTERVIEW].includes(a.currentPhase);
        
        if (!hasStandalone && isActivePhase) {
          const candidate = candidates.find(c => c.id === a.candidateId);
          const job = jobs.find(j => j.id === a.jobId);
          list.push({
            id: `app-${a.id}`,
            sourceId: a.id,
            sourceType: 'application',
            candidateName: candidate?.name || 'Candidato',
            jobTitle: job?.title || 'Vaga',
            time: a.interviewTime || '00:00',
            date: a.interviewDate,
            type: 'Presencial',
            status: a.currentStatus,
            candidateId: a.candidateId,
            jobId: a.jobId
          });
        }
      }
    });

    return list;
  }, [apps, candidates, jobs, standaloneInterviews]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const selectedInterviews = useMemo(() => {
    return allEvents.filter(ev => isSameDay(parseISO(ev.date), selectedDate))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [allEvents, selectedDate]);

  const handleUpdatePhase = async (appId: string, phase: ApplicationPhase, status: ApplicationStatus) => {
    try {
      await db.updateApplication(appId, {
        currentPhase: phase,
        currentStatus: status
      });
      
      // Notify history
      const app = apps.find(a => a.id === appId);
      if (app) {
        await db.addHistory({
          candidateId: app.candidateId,
          applicationId: app.id,
          type: "Fase",
          description: `Fase alterada via Agenda: ${phase}`,
          details: `Novo status: ${status}`,
          user: "Administrador"
        });
      }
      
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const monthStats = useMemo(() => {
    const monthEvents = allEvents.filter(ev => isSameMonth(parseISO(ev.date), currentDate));
    return {
      total: monthEvents.length,
      realized: monthEvents.filter(ev => ev.status === 'Realizado').length,
      canceled: monthEvents.filter(ev => ev.status === 'Cancelado').length,
      pending: monthEvents.filter(ev => ev.status !== 'Realizado' && ev.status !== 'Cancelado').length,
    };
  }, [allEvents, currentDate]);

  const chartData = useMemo(() => {
    const monthEvents = allEvents.filter(ev => isSameMonth(parseISO(ev.date), currentDate));
    
    // Group by status
    const stats: Record<string, number> = {};
    monthEvents.forEach(ev => {
      const status = ev.status || 'Pendente';
      stats[status] = (stats[status] || 0) + 1;
    });

    // Also include application statuses for candidates in this month
    // to catch things like "Reprovado" or "Não respondeu" as requested
    const relatedApps = apps.filter(a => {
      // Find if this app is connected to a standalone interview this month
      const hasInterviewThisMonth = standaloneInterviews.some(i => i.applicationId === a.id && isSameMonth(parseISO(i.date), currentDate));
      // Or if the application itself has an interview date this month
      const appInterviewThisMonth = a.interviewDate && isSameMonth(parseISO(a.interviewDate), currentDate);
      return hasInterviewThisMonth || appInterviewThisMonth;
    });

    relatedApps.forEach(a => {
      // If the app status is one of the "final" or "feedback" statuses requested
      const importantStatuses = [
        ApplicationStatus.REJECTED, 
        ApplicationStatus.NO_SHOW, 
        ApplicationStatus.NO_RESPONSE,
        ApplicationStatus.APPROVED
      ];
      
      if (importantStatuses.includes(a.currentStatus)) {
        const label = a.currentStatus.toString();
        // We only add it if it's not already accounted for by the interview status 
        // (to avoid double counting if interview status is same as app status)
        // Actually, let's just make a clean map of what the user wants:
        // "Não compareceu", "Reprovado", "Não respondeu", "Realizado", "Agendado"
      }
    });

    // Strategy: Map specific statuses to human-friendly labels
    const labelsMap: Record<string, string> = {
      [ApplicationStatus.REJECTED]: 'Reprovados',
      [ApplicationStatus.NO_SHOW]: 'Não Compareceu',
      [ApplicationStatus.NO_RESPONSE]: 'Não Respondeu',
      [ApplicationStatus.APPROVED]: 'Aprovados',
      'Realizado': 'Realizadas',
      'Agendado': 'Agendados',
      'Cancelado': 'Cancelados'
    };

    // Recalculate based on the requested categories
    const categories: Record<string, number> = {
      'Não Compareceu': 0,
      'Reprovados': 0,
      'Não Respondeu': 0,
      'Realizadas': 0,
      'Agendados': 0
    };

    monthEvents.forEach(ev => {
      if (ev.status === 'Realizado') categories['Realizadas']++;
      else if (ev.status === 'Agendado' || ev.status === 'Reagendado') categories['Agendados']++;
      else if (ev.status === 'Não Compareceu') categories['Não Compareceu']++;
    });

    relatedApps.forEach(a => {
      if (a.currentStatus === ApplicationStatus.REJECTED) categories['Reprovados']++;
      else if (a.currentStatus === ApplicationStatus.NO_RESPONSE) categories['Não Respondeu']++;
      else if (a.currentStatus === ApplicationStatus.NO_SHOW && !monthEvents.some(e => e.sourceId === a.id && e.status === 'Não Compareceu')) {
        categories['Não Compareceu']++;
      }
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [allEvents, apps, standaloneInterviews, currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingApp) return;

    try {
      // Update application
      await db.updateApplication(schedulingApp.id, {
        interviewDate: formData.date,
        interviewTime: formData.time,
        currentPhase: ApplicationPhase.INTERVIEW,
        currentStatus: ApplicationStatus.SCHEDULED
      });

      // Create separate interview record
      await db.createInterview({
        applicationId: schedulingApp.id,
        candidateId: schedulingApp.candidateId,
        jobId: schedulingApp.jobId,
        date: formData.date,
        time: formData.time,
        responsible: formData.responsible,
        type: formData.type,
        status: "Agendado",
        observations: formData.observations
      });

      // Add to history
      await db.addHistory({
        candidateId: schedulingApp.candidateId,
        applicationId: schedulingApp.id,
        type: "Entrevista",
        description: "Entrevista agendada",
        details: `Data: ${formData.date}, Hora: ${formData.time}`,
        user: "Administrador"
      });

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const getEventsForDay = (day: Date) => {
    return allEvents.filter(ev => isSameDay(parseISO(ev.date), day));
  };

  if (loading) return (
     <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-dark animate-pulse">
        <CalendarDays size={48} className="mb-4 opacity-20" />
        <p className="font-bold">Carregando agenda...</p>
     </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-brand-dark pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-brand-dark">Agenda de Entrevistas</h1>
          <p className="text-muted-foreground font-medium">Gerencie seus agendamentos e compromissos.</p>
        </div>
        <div className="flex items-center justify-center md:justify-end gap-3">
           <button 
             onClick={() => setIsModalOpen(true)}
             className="px-6 py-3 bg-brand-coral text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-brand-coral/20"
           >
             <Plus size={16} />
             Agendar
           </button>
        </div>
      </div>

      {/* Monthly Stats Report */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
        <div className="bg-white p-6 rounded-[32px] border border-border/50 shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Total no Mês</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-brand-dark">{monthStats.total}</span>
            <div className="w-10 h-10 bg-brand-bg rounded-xl flex items-center justify-center text-brand-coral">
               <CalendarDays size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-border/50 shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Realizadas</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-emerald-500">{monthStats.realized}</span>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
               <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-border/50 shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Canceladas</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-rose-500">{monthStats.canceled}</span>
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
               <X size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-border/50 shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Pendentes</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-brand-coral">{monthStats.pending}</span>
            <div className="w-10 h-10 bg-brand-bg rounded-xl flex items-center justify-center text-brand-coral">
               <Clock size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-border/50">
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-bg rounded-2xl flex items-center justify-center text-brand-coral">
                    <CalendarIcon size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight capitalize">
                      {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Calendário Mensal</p>
                  </div>
               </div>
               <div className="flex gap-2">
                 <button 
                   onClick={handlePrevMonth}
                   className="p-3 border border-border rounded-2xl hover:bg-brand-bg transition-all hover:border-brand-coral/30"
                 >
                   <ChevronLeft size={20} />
                 </button>
                 <button 
                   onClick={() => {
                     const now = new Date();
                     setCurrentDate(now);
                     setSelectedDate(now);
                   }}
                   className="px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-coral hover:bg-brand-bg rounded-xl transition-all"
                 >
                   Hoje
                 </button>
                 <button 
                   onClick={handleNextMonth}
                   className="p-3 border border-border rounded-2xl hover:bg-brand-bg transition-all hover:border-brand-coral/30"
                 >
                   <ChevronRight size={20} />
                 </button>
               </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
                <div key={d} className="text-center text-[10px] font-black uppercase text-muted-foreground py-2 tracking-widest opacity-50">{d}</div>
              ))}
              
              {monthDays.map((day, i) => {
                const dayEvents = getEventsForDay(day);
                const isSelected = isSameDay(day, selectedDate);
                const currentMonth = isSameMonth(day, currentDate);

                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "h-24 md:h-28 flex flex-col items-center justify-start py-4 rounded-3xl text-sm font-black transition-all border relative",
                      isSelected ? "bg-brand-dark text-white border-brand-dark shadow-xl" : 
                      isToday(day) ? "bg-white border-brand-coral/50 text-brand-coral" :
                      currentMonth ? "text-brand-dark bg-white border-border/30 hover:bg-brand-bg" : "text-gray-300 bg-gray-50/50 border-transparent"
                    )}
                  >
                    <span className="mb-2">{format(day, 'd')}</span>
                    
                    {dayEvents.length > 0 && (
                      <div className="mt-auto pb-2 flex flex-wrap gap-1 justify-center px-1">
                        {dayEvents.slice(0, 3).map((_, idx) => (
                          <div key={idx} className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : "bg-brand-coral")} />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className={cn("text-[8px] font-black leading-none", isSelected ? "text-white" : "text-brand-coral")}>+</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-border/50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black tracking-tight">Conversão do Mês</h3>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Distribuição de Status</p>
              </div>
              <Sparkles size={20} className="text-brand-coral opacity-30" />
            </div>
            
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <CandidateChart data={chartData} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 bg-brand-bg/20 rounded-3xl border-2 border-dashed border-border/40">
                  <Clock size={48} className="mb-4 opacity-10" />
                  <p className="font-bold text-sm uppercase tracking-widest text-center px-10">
                    Nenhum dado de conversão para este mês.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
               {chartData.map((item, idx) => (
                 <div key={idx} className="flex items-center gap-3 p-4 bg-brand-bg/50 rounded-2xl border border-border/20">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black text-muted-foreground uppercase opacity-60">{item.name}</span>
                     <span className="text-xl font-black text-brand-dark">{item.value}</span>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Selected Day View */}
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-700">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-extrabold tracking-tight">
              {isToday(selectedDate) ? "Hoje, " : ""}
              {format(selectedDate, 'dd MMMM', { locale: ptBR })}
            </h3>
            <span className="text-[10px] font-black bg-brand-bg px-3 py-1 rounded-full border border-border uppercase tracking-widest">
              {selectedInterviews.length} Eventos
            </span>
          </div>

          <div className="space-y-6 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 scroll-smooth custom-scrollbar">
            {selectedInterviews.length === 0 ? (
               <div className="bg-brand-bg/30 border-2 border-dashed border-border/50 rounded-[32px] p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
                  <Clock size={40} className="mb-4 opacity-20" />
                  <p className="font-bold text-sm">Nenhum evento para este dia.</p>
                  <button 
                    onClick={() => {
                        setFormData(prev => ({...prev, date: format(selectedDate, 'yyyy-MM-dd')}));
                        setIsModalOpen(true);
                    }}
                    className="text-[10px] font-black text-brand-coral underline mt-4 uppercase tracking-widest hover:opacity-80 transition-opacity"
                  >
                    Agendar agora
                  </button>
               </div>
            ) : (
              selectedInterviews.map((ev, i) => (
                <div key={i} className="bg-white p-8 rounded-[32px] border border-border/50 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
                  <div className={cn("absolute top-0 left-0 w-2 h-full", ev.status === 'Realizado' ? "bg-emerald-500" : "bg-brand-coral")} />
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3 px-3 py-1.5 bg-brand-bg rounded-xl border border-border/30">
                      <Clock size={16} className="text-brand-coral" />
                      <span className="text-xs font-black tracking-tight">{ev.time}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <select 
                        className="p-2 bg-brand-bg border border-border/40 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-brand-coral transition-all cursor-pointer"
                        onChange={(e) => {
                          const val = e.target.value;
                          const appSourceId = ev.sourceType === 'application' ? ev.sourceId : standaloneInterviews.find(i => i.id === ev.sourceId)?.applicationId;
                          if (!appSourceId) return;

                          if (val === 'APPROVE') handleUpdatePhase(appSourceId, ApplicationPhase.HIRING, ApplicationStatus.APPROVED);
                          else if (val === 'REJECT') handleUpdatePhase(appSourceId, ApplicationPhase.ARCHIVE, ApplicationStatus.REJECTED);
                          else if (val === 'INTERVIEW') handleUpdatePhase(appSourceId, ApplicationPhase.INTERVIEW, ApplicationStatus.SCHEDULED);
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Ação...</option>
                        <option value="INTERVIEW">✓ Entrevista</option>
                        <option value="APPROVE">★ Aprovar</option>
                        <option value="REJECT">✕ Reprovar</option>
                      </select>
                    </div>
                  </div>
                  
                  <h4 className="text-xl font-extrabold mb-1 tracking-tight">{ev.candidateName}</h4>
                  <div className="space-y-2 mb-6">
                    <p className="text-[11px] font-black text-muted-foreground uppercase flex items-center gap-2">
                        <Briefcase size={12} /> {ev.jobTitle}
                    </p>
                    <div className={cn(
                        "inline-flex text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border",
                        ev.status === 'Realizado' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                        ev.status === 'Cancelado' ? "bg-rose-50 text-rose-600 border-rose-100" :
                        "bg-orange-50 text-orange-600 border-orange-100"
                        )}>
                        {ev.status}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-border/30">
                     <div className="flex items-center gap-2 text-xs font-bold text-brand-dark">
                        <MapPin size={14} className="opacity-40" />
                        <span>Sede Mogi</span>
                     </div>
                     <span className="text-[9px] font-black uppercase text-brand-coral tracking-widest">{ev.type}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-brand-dark p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mb-16 -mr-16 transition-transform group-hover:scale-150 duration-500" />
            <h4 className="text-lg font-extrabold mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-brand-coral" />
              Lembretes do Dia
            </h4>
            <div className="space-y-4">
              <p className="text-sm text-white/70 font-medium">
                {selectedInterviews.filter(i => isToday(parseISO(i.date))).length > 0 
                  ? `Você tem ${selectedInterviews.filter(i => isToday(parseISO(i.date))).length} entrevistas agendadas para hoje.`
                  : "Não há entrevistas agendadas para hoje."}
              </p>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Dica: Confirme pelo WhatsApp com antecedência para evitar faltas.
              </p>
            </div>
            <button 
              onClick={() => setIsChecklistOpen(true)}
              className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all mt-6 shadow-inner"
            >
              Ver check-list diário
            </button>
          </div>
        </div>
      </div>

      {/* Checklist Modal */}
      {isChecklistOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" onClick={() => setIsChecklistOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-brand-dark p-8 text-white relative">
              <button 
                onClick={() => setIsChecklistOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-brand-coral rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Check-list Diário</h2>
                  <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">Rotina de Recrutamento</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-4">
              {[
                { title: "Lembrete WhatsApp", desc: "Enviar mensagens de confirmação para entrevistas de hoje.", icon: <MessageSquare size={16} /> },
                { title: "Status dos Candidatos", desc: "Verificar se candidatos de ontem compareceram e atualizar status.", icon: <User size={16} /> },
                { title: "Novos Inscritos", desc: "Triar candidatos que entraram nas últimas 24h.", icon: <Plus size={16} /> },
                { title: "Feedback Pendente", desc: "Dar retorno para candidatos reprovados na semana.", icon: <AlertCircle size={16} /> },
                { title: "Atualizar Pipeline", desc: "Mover candidatos aprovados para a etapa de Contratação.", icon: <Briefcase size={16} /> }
              ].map((item, idx) => (
                <label key={idx} className="flex items-start gap-4 p-4 rounded-2xl border border-border/50 hover:bg-brand-bg/50 transition-all cursor-pointer group">
                  <div className="mt-1">
                    <input type="checkbox" className="w-5 h-5 rounded-lg border-2 border-border text-brand-coral focus:ring-brand-coral cursor-pointer" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-brand-coral/50 group-hover:text-brand-coral transition-colors">{item.icon}</span>
                      <p className="text-sm font-black text-brand-dark">{item.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </label>
              ))}

              <button 
                onClick={() => setIsChecklistOpen(false)}
                className="w-full py-4 bg-brand-coral text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-brand-coral/20 hover:opacity-90 transition-all mt-4"
              >
                Concluir Rotina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-10 animate-in zoom-in duration-300">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-8 right-8 p-3 hover:bg-brand-bg rounded-2xl transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-brand-bg rounded-2xl text-brand-coral">
                <Plus size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Agendar Entrevista</h2>
                <p className="text-muted-foreground font-medium">Vinculado a um candidato em processo.</p>
              </div>
            </div>

            <form onSubmit={handleSchedule} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Selecionar Candidato</label>
                <select 
                  required
                  className="w-full px-5 py-4 bg-brand-bg border border-border rounded-2xl font-medium outline-none focus:ring-2 focus:ring-brand-coral/50 transition-all appearance-none"
                  onChange={(e) => {
                    const app = apps.find(a => a.id === e.target.value);
                    setSchedulingApp(app || null);
                  }}
                >
                  <option value="">Selecione um candidato em triagem...</option>
                  {apps
                    .filter(a => a.currentPhase !== ApplicationPhase.ARCHIVE && a.currentPhase !== ApplicationPhase.HIRING)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {candidates.find(c => c.id === a.candidateId)?.name} - {jobs.find(j => j.id === a.jobId)?.title}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-5 py-4 bg-brand-bg border border-border rounded-2xl font-medium outline-none focus:ring-2 focus:ring-brand-coral/50 transition-all"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Hora</label>
                  <input 
                    type="time" 
                    required
                    className="w-full px-5 py-4 bg-brand-bg border border-border rounded-2xl font-medium outline-none focus:ring-2 focus:ring-brand-coral/50 transition-all"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Modalidade</label>
                  <select 
                    className="w-full px-5 py-4 bg-brand-bg border border-border rounded-2xl font-medium outline-none focus:ring-2 focus:ring-brand-coral/50 transition-all appearance-none"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Remoto">Remoto (Google Meet)</option>
                    <option value="Telefone">Telefone</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Responsável</label>
                  <input 
                    type="text"
                    required
                    placeholder="Nome do entrevistador"
                    className="w-full px-5 py-4 bg-brand-bg border border-border rounded-2xl font-medium outline-none focus:ring-2 focus:ring-brand-coral/50 transition-all"
                    value={formData.responsible}
                    onChange={(e) => setFormData({...formData, responsible: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observações</label>
                <textarea 
                  rows={3}
                  className="w-full px-5 py-4 bg-brand-bg border border-border rounded-2xl font-medium outline-none focus:ring-2 focus:ring-brand-coral/50 transition-all"
                  value={formData.observations}
                  onChange={(e) => setFormData({...formData, observations: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-brand-dark text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-2xl hover:opacity-95 transition-all mt-4"
              >
                Confirmar Agendamento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
