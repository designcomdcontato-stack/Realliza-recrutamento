'use client';
import React, { useState, useEffect } from 'react';
import { db } from '@/database/db';
import { Application, ApplicationPhase, ApplicationStatus, Candidate, Job, Gender } from '@/types';
import { 
  Search, Filter, Plus, 
  MoreHorizontal, Phone, MessageSquare, 
  ArrowRight, User, Briefcase, Calendar, CheckCircle2,
  X, HelpCircle, LayoutGrid, Trash2, Edit2, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApplications } from '@/hooks/useApplications';
import { useCandidates } from '@/hooks/useCandidates';
import { useJobs } from '@/hooks/useJobs';
import { useSettings } from '@/hooks/useSettings';
import { historyService } from '@/services/historyService';
import { compatibilityService } from '@/services/compatibilityService';
import Link from 'next/link';

export default function PipelinePage() {
  const { 
    candidates, 
    deleteCandidate,
    addCandidate,
    refresh: refreshCandidates
  } = useCandidates();
  
  const { 
    applications, 
    updateApplication, 
    deleteApplication, 
    addApplication,
    loading: loadingApps,
    refresh: refreshApplications
  } = useApplications();
  
  const { jobs } = useJobs();
  const { settings } = useSettings();
  
  const [search, setSearch] = useState('');
  const [moveModal, setMoveModal] = useState<{ app: any, targetPhase: ApplicationPhase } | null>(null);
  const [phaseSelectorApp, setPhaseSelectorApp] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPhaseForAdd, setSelectedPhaseForAdd] = useState<ApplicationPhase>(ApplicationPhase.NEW);
  const [deleteConfirmApp, setDeleteConfirmApp] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Hiring Form State
  const [isHiringFormOpen, setIsHiringFormOpen] = useState(false);
  const [hiringData, setHiringData] = useState({
    hiringDate: new Date().toISOString().split('T')[0],
    leaderId: '',
    sectorId: '',
    isEmployeeActive: true
  });

  // Automatically resolve names to settings IDs to prefill leader and sector dropdowns
  const getResolvedHiringFields = (app: any) => {
    let resolvedLeaderId = app.leaderId || '';
    if (!resolvedLeaderId && app.responsible) {
      const match = settings?.leaders?.find(l => l.name.toLowerCase().trim() === app.responsible.toLowerCase().trim());
      if (match) resolvedLeaderId = match.id;
    }

    let resolvedSectorId = app.sectorId || '';
    if (!resolvedSectorId && app.sectorName) {
      const match = settings?.sectors?.find(s => s.name.toLowerCase().trim() === app.sectorName.toLowerCase().trim());
      if (match) resolvedSectorId = match.id;
    }

    return {
      hiringDate: app.hiringDate || new Date().toISOString().split('T')[0],
      leaderId: resolvedLeaderId,
      sectorId: resolvedSectorId,
      isEmployeeActive: app.isEmployeeActive ?? true
    };
  };

  useEffect(() => {
    if (moveModal) {
      const { app, targetPhase } = moveModal;
      if (targetPhase === ApplicationPhase.HIRING || targetPhase === ApplicationPhase.ONBOARDING) {
        setHiringData(getResolvedHiringFields(app));
        setIsHiringFormOpen(true);
      } else {
        setIsHiringFormOpen(false);
      }
    } else {
      setIsHiringFormOpen(false);
    }
  }, [moveModal, settings]);

  const openHiringForm = (app: any) => {
    setHiringData(getResolvedHiringFields(app));
    setMoveModal({ app, targetPhase: app.currentPhase });
    setIsHiringFormOpen(true);
  };

  const handleQuickAdd = async (data: { name: string, phone: string, jobId: string }) => {
    try {
      const candidate = await addCandidate({
        name: data.name,
        normalizedName: data.name.toUpperCase(),
        phone: data.phone,
        city: 'Mogi Guaçu',
        whatsapp: data.phone,
        email: '',
        gender: Gender.UNKNOWN,
        origin: 'Manual',
        experiences: [],
        observations: 'Adicionado via Fluxo de Triagem'
      });

      // The useApplications.addApplication hook now automatically triggers applicationService.recalculateAndSaveCompatibility
      await addApplication({
        candidateId: candidate.id,
        jobId: data.jobId,
        currentPhase: selectedPhaseForAdd,
        currentStatus: ApplicationStatus.NEW,
        compatibilityScore: 0,
        compatibilityLevel: 'Baixa',
        compatibilityReasons: 'Aguardando cálculo...',
        matchedKeywords: [],
        missingKeywords: [],
        partialMatches: [],
        compatibilityExplanation: "",
        compatibilityCalculatedAt: new Date().toISOString(),
        channel: 'Manual',
        observations: 'Adicionado via Fluxo de Triagem',
        responsible: 'Administrador',
        entryDate: new Date().toISOString(),
        origin: 'Manual'
      });

      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Erro ao adicionar:", error);
      alert("Ocorreu um erro ao adicionar o candidato.");
    }
  };

  const handleDeleteCandidate = (e: React.MouseEvent, app: any) => {
    e.stopPropagation();
    setDeleteConfirmApp(app);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmApp) return;
    
    setIsDeleting(true);
    try {
      console.log("Iniciando exclusão do app:", deleteConfirmApp.id);
      await deleteApplication(deleteConfirmApp.id);
      
      if (deleteConfirmApp.candidateId) {
        console.log("Iniciando exclusão do candidato:", deleteConfirmApp.candidateId);
        await deleteCandidate(deleteConfirmApp.candidateId);
      }
      
      await refreshApplications();
      await refreshCandidates();
      setDeleteConfirmApp(null);
    } catch (error) {
      console.error("Erro ao excluir candidato:", error);
      alert("Ocorreu um erro ao excluir o candidato.");
    } finally {
      setIsDeleting(false);
    }
  };

  const enrichedApps = React.useMemo(() => {
    return applications.map(app => ({
      ...app,
      candidate: candidates.find(c => c.id === app.candidateId),
      job: jobs.find(j => j.id === app.jobId)
    })).filter(app => {
      if (!app.candidate) return false;
      const searchLower = search.toLowerCase();
      const nameMatches = app.candidate.name?.toLowerCase()?.includes(searchLower) || false;
      const jobMatches = app.job?.title?.toLowerCase()?.includes(searchLower) || false;
      return nameMatches || jobMatches;
    });
  }, [applications, candidates, jobs, search]);

  const phases = [
    ApplicationPhase.NEW,
    ApplicationPhase.SCHEDULING,
    ApplicationPhase.INTERVIEW,
    ApplicationPhase.HIRING,
    ApplicationPhase.ONBOARDING,
    ApplicationPhase.ARCHIVE,
  ];

  const canMoveToPhase = (current: ApplicationPhase, target: ApplicationPhase) => {
    if (target === ApplicationPhase.ARCHIVE) return true;
    
    const sequence = [
      ApplicationPhase.NEW,
      ApplicationPhase.SCHEDULING,
      ApplicationPhase.INTERVIEW,
      ApplicationPhase.HIRING,
      ApplicationPhase.ONBOARDING
    ];
    
    const currentIndex = sequence.indexOf(current);
    const targetIndex = sequence.indexOf(target);
    
    // Se estiver avançando (índice alvo maior que atual)
    if (targetIndex > currentIndex) {
      return targetIndex === currentIndex + 1;
    }
    
    // Se estiver voltando ou o atual não estar na sequência principal (ex: vindo de ARCHIVE), permitimos volta para qualquer fase anterior ou reinício
    return true;
  };

  const handleMove = async (status: ApplicationStatus) => {
    if (!moveModal) return;
    const { app, targetPhase } = moveModal;
    
    if ((targetPhase === ApplicationPhase.HIRING || targetPhase === ApplicationPhase.ONBOARDING) && !isHiringFormOpen) {
      setIsHiringFormOpen(true);
      return;
    }

    const updateData: Partial<Application> = {
      currentPhase: targetPhase,
      currentStatus: status
    };

    if (isHiringFormOpen) {
      Object.assign(updateData, hiringData);
      
      // Keep name strings synchronized with the selected IDs
      if (hiringData.leaderId) {
        const leader = settings?.leaders?.find(l => l.id === hiringData.leaderId);
        if (leader) {
          updateData.responsible = leader.name;
        }
      } else {
        updateData.responsible = "";
      }

      if (hiringData.sectorId) {
        const sector = settings?.sectors?.find(s => s.id === hiringData.sectorId);
        if (sector) {
          updateData.sectorName = sector.name;
        }
      } else {
        updateData.sectorName = undefined;
      }
    }
    
    await updateApplication(app.id, updateData);

    await historyService.logPhaseChange(app.candidateId, app.currentPhase, targetPhase, app.id);
    setMoveModal(null);
    setIsHiringFormOpen(false);
  };

  if (loadingApps) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-dark animate-pulse">
      <LayoutGrid size={48} className="mb-4 opacity-20" />
      <p className="font-bold">Sincronizando fluxo...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-brand-dark pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 mb-12">
        <div className="hidden md:block"></div>
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-brand-dark whitespace-nowrap">Fluxo de Triagem</h1>
        </div>
        <div className="hidden md:block"></div>
      </div>

      {/* Control Bar (Jobs-style) */}
      <div className="bg-white p-6 rounded-[28px] border border-border/50 shadow-sm">
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand-coral transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Pesquisar por nome, vaga ou status no fluxo..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-8 overflow-x-auto pt-4 min-h-[70vh] [transform:scaleY(-1)]">
        <div className="flex gap-8 [transform:scaleY(-1)] w-full">
          {phases.map((phase) => {
            const phaseApps = enrichedApps.filter(a => a.currentPhase === phase);
          return (
            <div key={phase} className="flex-shrink-0 w-[320px] flex flex-col gap-6 group/phase">
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-3">
                   <div className={cn(
                     "w-2 h-2 rounded-full",
                     phase === ApplicationPhase.NEW ? "bg-blue-500" :
                     phase === ApplicationPhase.SCHEDULING ? "bg-amber-500" :
                     phase === ApplicationPhase.INTERVIEW ? "bg-brand-coral" : 
                     phase === ApplicationPhase.ARCHIVE ? "bg-gray-500" :
                     "bg-emerald-500"
                   )} />
                   <h3 className="font-black text-brand-dark uppercase tracking-[0.1em] text-xs">{phase}</h3>
                   <span className="bg-brand-bg text-brand-dark text-[10px] font-black px-2 py-0.5 rounded-full border border-border shadow-sm">
                     {phaseApps.length}
                   </span>
                </div>
                <button 
                  onClick={() => {
                    setSelectedPhaseForAdd(phase);
                    setIsAddModalOpen(true);
                  }}
                  className="p-1.5 hover:bg-white rounded-lg text-muted-foreground transition-all opacity-0 group-hover/phase:opacity-100"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-4 p-2 rounded-[32px] bg-brand-bg/50 border border-transparent group-hover/phase:border-brand-coral/10 transition-all min-h-[500px]">
                {phaseApps.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white p-6 rounded-[24px] shadow-sm border border-border/60 hover:shadow-xl hover:border-brand-coral/30 hover:-translate-y-1 transition-all cursor-default group/card"
                  >
                    <div className="flex justify-between items-start mb-4">
                       <div className="flex flex-wrap gap-2">
                         <span className={cn(
                           "text-[10px] font-black px-2.5 py-1 rounded-lg border",
                           app.compatibilityLevel === 'Alta' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : 
                           app.compatibilityLevel === 'Média' ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-rose-50 border-rose-100 text-rose-700"
                         )}>
                           {app.compatibilityScore}% COMP
                         </span>
                         {app.experienceInArea && (
                           <span className={cn(
                             "text-[10px] font-black px-2.5 py-1 rounded-lg border",
                             app.experienceInArea === 'Sim' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : 
                             app.experienceInArea === 'Parcial' ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-rose-50 border-rose-100 text-rose-700"
                           )}>
                             EXP: {app.experienceInArea}
                           </span>
                         )}
                       </div>
                        <div className="flex items-center gap-1">
                          {phase === ApplicationPhase.ARCHIVE && (
                            <button 
                              onClick={(e) => handleDeleteCandidate(e, app)}
                              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Excluir Candidato"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhaseSelectorApp(app);
                            }}
                            className="p-2 text-muted-foreground hover:text-brand-coral hover:bg-brand-coral/5 rounded-xl transition-all group/move"
                            title="Mover de fase"
                          >
                            <ArrowRight size={20} className="group-hover/move:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    
                    <h4 className="font-extrabold text-brand-dark mb-1 leading-tight line-clamp-1">{app.candidate?.name}</h4>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-2">
                      <Briefcase size={12} /> {app.job?.title}
                    </p>

                    {(phase === ApplicationPhase.HIRING || phase === ApplicationPhase.ONBOARDING) && (
                      <div 
                        onClick={() => openHiringForm(app)}
                        className="mb-4 p-3 bg-brand-bg/50 rounded-xl border border-border/50 text-[10px] space-y-1 cursor-pointer hover:border-brand-coral/50 transition-all group/hiring"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] font-black text-brand-coral uppercase tracking-tighter">Dados de Admissão</span>
                          <Edit2 size={10} className="text-brand-coral opacity-0 group-hover/hiring:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-muted-foreground uppercase">Líder:</span>
                          <span className={cn("font-black truncate max-w-[100px]", !app.leaderId && !app.responsible && "text-rose-400")}>
                            {settings?.leaders?.find(l => l.id === app.leaderId)?.name || app.responsible || 'NÃO DEFINIDO'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-muted-foreground uppercase">Setor:</span>
                          <span className="font-black truncate max-w-[100px]">
                            {settings?.sectors?.find(s => s.id === app.sectorId)?.name || app.sectorName || 'NÃO DEFINIDO'}
                          </span>
                        </div>
                        {phase === ApplicationPhase.ONBOARDING && (
                          <div className="flex justify-between pt-1 border-t border-border/30 mt-1">
                            <span className="font-bold text-muted-foreground uppercase">Vínculo:</span>
                            <span className={cn("font-black", (app.isEmployeeActive !== false) ? "text-emerald-600" : "text-rose-500")}>
                              {app.isEmployeeActive !== false ? 'ATIVO' : 'INATIVO'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {phase === ApplicationPhase.SCHEDULING && (
                      <div className="mb-4 space-y-2 pb-2">
                        <div className="flex justify-between items-center px-1">
                          <p className="text-[10px] font-black text-brand-coral uppercase tracking-widest">
                            {app.interviewDate ? 'Ajustar Agenda' : 'Definir Agenda'}
                          </p>
                          {app.interviewDate && (
                            <span className="text-[8px] font-black bg-brand-coral/10 text-brand-coral px-1.5 py-0.5 rounded uppercase">Agendado</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="date" 
                            className="text-[10px] bg-brand-bg border border-border p-2 rounded-lg font-bold outline-none focus:ring-2 focus:ring-brand-coral/20 w-full"
                            value={app.interviewDate || ''}
                            onChange={async (e) => {
                              const date = e.target.value;
                              if (date) {
                                await updateApplication(app.id, { 
                                  interviewDate: date,
                                  interviewTime: app.interviewTime || '09:00',
                                  currentStatus: ApplicationStatus.SCHEDULED
                                });
                                await historyService.logInterviewScheduled(app.candidateId, app.id, date, app.interviewTime || '09:00');
                                refreshApplications();
                              }
                            }}
                          />
                          <input 
                            type="time" 
                            className="text-[10px] bg-brand-bg border border-border p-2 rounded-lg font-bold outline-none focus:ring-2 focus:ring-brand-coral/20 w-full"
                            defaultValue={app.interviewTime || '09:00'}
                            onBlur={async (e) => {
                              const time = e.target.value;
                              if (time && app.interviewDate) {
                                await updateApplication(app.id, { interviewTime: time });
                                await historyService.logInterviewScheduled(app.candidateId, app.id, app.interviewDate, time);
                                refreshApplications();
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-border/30 pt-4">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-xl bg-brand-bg flex items-center justify-center text-[10px] font-black text-brand-dark border border-border shadow-inner">
                             {app.candidate?.name?.[0]}
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Status</span>
                              <span className="text-[10px] font-black uppercase text-brand-coral">{app.currentStatus}</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!app.interviewDate && phase === ApplicationPhase.SCHEDULING && (
                            <Link 
                              href="/agenda"
                              className="p-2 text-brand-coral hover:bg-brand-coral/5 rounded-xl transition-all"
                              title="Ir para Agenda"
                            >
                              <Calendar size={18} />
                            </Link>
                          )}
                          <div className="flex flex-col text-right">
                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Última Att.</span>
                              <span className="text-[8px] font-bold text-muted-foreground uppercase">Hoje</span>
                          </div>
                        </div>
                    </div>
                  </div>
                ))}

                {phaseApps.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/30">
                      <HelpCircle size={32} />
                      <p className="text-[10px] font-black mt-2">NENHUM NESTA FASE</p>
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>

      {/* Phase Selector Modal */}
      {phaseSelectorApp && (
        <div className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-brand-dark">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-brand-coral/20">
            <div className="flex justify-between items-center mb-6">
               <div>
                 <h3 className="text-2xl font-black text-brand-dark tracking-tight">Mover Candidato</h3>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Selecione a fase de destino</p>
               </div>
               <button onClick={() => setPhaseSelectorApp(null)} className="p-2 hover:bg-brand-bg rounded-xl transition-all">
                 <X size={24} className="text-muted-foreground" />
               </button>
            </div>

            <div className="bg-brand-bg/60 p-5 rounded-3xl mb-6 border border-border/50">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-dark text-white rounded-2xl flex items-center justify-center font-black">
                     {phaseSelectorApp.candidate?.name?.[0]}
                  </div>
                  <div>
                    <p className="font-extrabold text-brand-dark leading-none mb-1">{phaseSelectorApp.candidate?.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{phaseSelectorApp.currentPhase}</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {phases.filter(p => p !== phaseSelectorApp.currentPhase).map((p) => {
                const isAllowed = canMoveToPhase(phaseSelectorApp.currentPhase, p);
                return (
                  <button
                    key={p}
                    onClick={() => {
                      if (!isAllowed) {
                        alert(`Para manter a integridade do processo, você deve seguir a ordem sequencial: Novo > Agendamento > Entrevista > Contratação. Por favor, mova o candidato para a próxima fase imediata.`);
                        return;
                      }
                      setMoveModal({ app: phaseSelectorApp, targetPhase: p });
                      setPhaseSelectorApp(null);
                    }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl transition-all group border border-transparent",
                      isAllowed 
                        ? "bg-brand-bg hover:bg-brand-coral hover:text-brand-dark border-transparent hover:border-brand-coral/20" 
                        : "bg-gray-50 opacity-40 cursor-not-allowed border-dashed border-border"
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-black uppercase tracking-tight">{p}</span>
                      {!isAllowed && <span className="text-[8px] font-bold text-rose-500 uppercase">Bloqueado: Siga a sequência</span>}
                    </div>
                    {isAllowed && <ArrowRight size={18} className="text-muted-foreground group-hover:text-brand-dark transition-all group-hover:translate-x-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Move Phase Prompt Modal */}
      {moveModal && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans text-brand-dark">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-8 pb-4 shrink-0">
               <h3 className="text-2xl font-extrabold tracking-tight">Alterar Status</h3>
               <button onClick={() => {
                 setMoveModal(null);
                 setIsHiringFormOpen(false);
               }} className="p-2 hover:bg-gray-100 rounded-xl"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-10 pb-8 space-y-6">
              <div className="bg-brand-bg/50 p-6 rounded-3xl border border-border/50">
                <p className="text-[10px] font-black uppercase text-brand-coral mb-2">MOVENDO CANDIDATO</p>
                <p className="font-extrabold text-xl">{moveModal.app.candidate?.name}</p>
                <div className="flex items-center gap-3 mt-4 text-xs font-bold text-muted-foreground uppercase">
                  <span>{moveModal.app.currentPhase}</span>
                  <ArrowRight size={14} />
                  <span className="text-brand-dark">{moveModal.targetPhase}</span>
                </div>
              </div>

              {isHiringFormOpen && (
                <div className="space-y-4 p-6 bg-brand-bg/30 rounded-3xl border border-brand-coral/10 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] font-black uppercase text-brand-coral tracking-widest mb-2">Detalhes da Contratação</p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Data de Admissão</label>
                      <input 
                        type="date"
                        className="w-full px-4 py-3 rounded-xl border border-border font-bold text-sm bg-white"
                        value={hiringData.hiringDate}
                        onChange={e => setHiringData({...hiringData, hiringDate: e.target.value})}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Líder Responsável</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl border border-border font-bold text-sm bg-white"
                        value={hiringData.leaderId}
                        onChange={e => setHiringData({...hiringData, leaderId: e.target.value})}
                      >
                        <option value="">Selecione um líder...</option>
                        {settings?.leaders?.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                      {(!settings?.leaders || settings.leaders.length === 0) && (
                        <p className="text-[9px] text-rose-500 font-bold mt-1">Nenhum líder cadastrado. Vá em Configurações &gt; Líderes.</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Setor / Unidade</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl border border-border font-bold text-sm bg-white"
                        value={hiringData.sectorId}
                        onChange={e => setHiringData({...hiringData, sectorId: e.target.value})}
                      >
                        <option value="">Selecione um setor...</option>
                        {settings?.sectors?.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {(!settings?.sectors || settings.sectors.length === 0) && (
                        <p className="text-[9px] text-rose-500 font-bold mt-1">Nenhum setor cadastrado. Vá em Configurações &gt; Setores.</p>
                      )}
                    </div>

                    {moveModal.targetPhase === ApplicationPhase.ONBOARDING && (
                      <div className="flex items-center gap-3 py-2">
                        <label className="text-xs font-bold text-brand-dark">Colaborador está Ativo?</label>
                        <button 
                          onClick={() => setHiringData({...hiringData, isEmployeeActive: !hiringData.isEmployeeActive})}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all",
                            hiringData.isEmployeeActive ? "bg-emerald-100 text-emerald-600 border border-emerald-200" : "bg-rose-100 text-rose-600 border border-rose-200"
                          )}
                        >
                          {hiringData.isEmployeeActive ? 'Sim, Ativo' : 'Não, Inativo'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3 pb-4">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">QUAL O STATUS ATUAL?</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(ApplicationStatus).filter(s => s !== ApplicationStatus.INACTIVE).map(status => (
                    <button 
                      key={status}
                      onClick={() => handleMove(status)}
                      className={cn(
                        "px-4 py-3 rounded-2xl border border-border text-xs font-extrabold hover:border-brand-coral hover:bg-brand-bg transition-all uppercase",
                        moveModal.app.currentStatus === status && "bg-brand-coral/10 border-brand-coral text-brand-coral"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isHiringFormOpen && (
              <div className="px-10 py-6 border-t border-border/30 shrink-0 bg-white">
                <button 
                  onClick={() => handleMove(moveModal.app.currentStatus)}
                  className="w-full py-4 bg-brand-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-dark/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Confirmar {moveModal.targetPhase === moveModal.app.currentPhase ? 'Alterações' : 'Contratação'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmApp && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 font-sans text-brand-dark">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
             <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
             </div>
             
             <h3 className="text-2xl font-black text-brand-dark tracking-tight mb-2">Excluir Cadastro?</h3>
             <p className="text-sm font-bold text-muted-foreground leading-relaxed mb-8">
               Você está prestes a excluir <span className="text-brand-dark font-black">{deleteConfirmApp.candidate?.name}</span>. 
               Esta ação removerá o candidato e sua inscrição permanentemente.
             </p>

             <div className="flex flex-col gap-3">
                <button 
                   disabled={isDeleting}
                   onClick={confirmDelete}
                   className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 disabled:opacity-50"
                >
                   {isDeleting ? 'EXCLUINDO...' : 'SIM, EXCLUIR AGORA'}
                </button>
                <button 
                   disabled={isDeleting}
                   onClick={() => setDeleteConfirmApp(null)}
                   className="w-full py-4 bg-brand-bg text-brand-dark rounded-2xl font-bold hover:bg-border/50 transition-all"
                >
                   CANCELAR
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Quick Add Candidate Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-brand-dark">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="text-2xl font-black text-brand-dark tracking-tight">Novo no Fluxo</h3>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Adicione um candidato à fase <span className="text-brand-coral">{selectedPhaseForAdd}</span></p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-3 hover:bg-brand-bg rounded-2xl transition-all">
                   <X size={24} className="text-muted-foreground" />
                </button>
             </div>

             <form onSubmit={(e) => {
               e.preventDefault();
               const formData = new FormData(e.currentTarget);
               handleQuickAdd({
                 name: formData.get('name') as string,
                 phone: formData.get('phone') as string,
                 jobId: formData.get('jobId') as string,
               });
             }} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">NOME DO CANDIDATO</label>
                   <input 
                      name="name"
                      required
                      placeholder="Ex: João da Silva"
                      className="w-full px-6 py-4 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all font-bold"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">TELEFONE (WHATSAPP)</label>
                   <input 
                      name="phone"
                      required
                      placeholder="(00) 00000-0000"
                      className="w-full px-6 py-4 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all font-bold"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">VAGA DESEJADA</label>
                   <select 
                      name="jobId"
                      required
                      className="w-full px-6 py-4 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all font-bold bg-white"
                   >
                      <option value="">Selecione uma vaga...</option>
                      {jobs.map(job => (
                        <option key={job.id} value={job.id}>{job.title}</option>
                      ))}
                   </select>
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 px-8 py-4 border border-border rounded-2xl font-bold hover:bg-brand-bg transition-all"
                   >
                      Cancelar
                   </button>
                   <button 
                      type="submit"
                      className="flex-1 px-8 py-4 bg-brand-dark text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-brand-dark/20"
                   >
                      ADICIONAR AGORA
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
