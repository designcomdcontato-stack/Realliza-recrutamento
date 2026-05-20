'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  User, Mail, Phone, MapPin, Calendar, 
  Briefcase, Plus, Clock, FileText, 
  Trash2, Edit2, ChevronLeft, History,
  CheckCircle2, AlertCircle, X, Download,
  ExternalLink, MessageSquare, Clipboard,
  MoreHorizontal, Info, Sparkles
} from 'lucide-react';
import { useCandidates } from '@/hooks/useCandidates';
import { useApplications } from '@/hooks/useApplications';
import { useJobs } from '@/hooks/useJobs';
import { db } from '@/database/db';
import { historyService } from '@/services/historyService';
import { 
  Candidate, Application, Job, HistoryEvent, 
  CandidateDocument, ApplicationPhase, ApplicationStatus, Gender
} from '@/types';
import { cn } from '@/lib/utils';
import { CandidateModal } from '@/components/CandidateModal';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function CandidateDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { candidates, updateCandidate, anonymizeCandidate, deleteCandidate } = useCandidates();
  const { applications, addApplication, updateApplication, deleteApplication, refresh: refreshApplications } = useApplications(id);
  const { jobs } = useJobs();
  
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [activeTab, setActiveTab] = useState<'inscricoes' | 'historico' | 'documentos' | 'entrevistas'>('inscricoes');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [newAppData, setNewAppData] = useState({ jobId: '', channel: 'Manual', observations: '' });
  
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const candidateData = candidates.find(c => c.id === id);
    if (candidateData) {
      setCandidate(candidateData);
      fetchRelatedData();
    }
  }, [id, candidates]);

  const fetchRelatedData = async () => {
    const [historyData, docData] = await Promise.all([
      db.listHistory(id),
      db.listDocuments(id)
    ]);
    setHistory(historyData);
    setDocuments(docData);
  };

  const handleUpdateStatus = async (appId: string, phase: ApplicationPhase, status: ApplicationStatus) => {
    await updateApplication(appId, { currentPhase: phase, currentStatus: status });
    fetchRelatedData();
  };

  const handleAddDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fileName = formData.get('fileName') as string;
    const category = formData.get('category') as any;
    
    if (!fileName) return;

    await db.attachDocument({
      candidateId: id,
      fileName,
      fileType: 'Manual',
      fileFormat: 'PDF',
      fileSize: 1024,
      category,
      observations: formData.get('observations') as string || '',
      user: 'Administrador'
    });

    await historyService.logDocumentAttached(id, fileName);
    fetchRelatedData();
    (e.target as HTMLFormElement).reset();
  };

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-dark">
        <div className="w-16 h-16 border-4 border-brand-coral/20 border-t-brand-coral rounded-full animate-spin mb-4" />
        <p className="font-bold">Carregando perfil do candidato...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-brand-dark pb-20">
      {/* Top Navigation */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-brand-dark transition-all font-bold group print:hidden"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Voltar para Lista
      </button>

      {/* Profile Header Card */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-border/50 relative overflow-hidden print:border-none print:shadow-none print:p-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-coral/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none print:hidden" />
        
        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          <div className="w-32 h-32 rounded-[28px] bg-brand-dark flex items-center justify-center text-brand-bg text-4xl font-bold shadow-xl shadow-brand-dark/20 print:shadow-none">
            {candidate.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className={cn(
                  "text-4xl font-extrabold tracking-tight",
                  candidate.isAnonymous && "italic opacity-60"
                )}>
                  {candidate.name}
                </h1>
                <div className="flex flex-wrap gap-4 mt-2 font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5"><MapPin size={16} /> {candidate.city}</span>
                  <span className="flex items-center gap-1.5"><Calendar size={16} /> {candidate.age} anos</span>
                  <span className="flex items-center gap-1.5"><Briefcase size={16} /> {candidate.gender}</span>
                </div>
              </div>
              <div className="flex gap-2 print:hidden">
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-bg text-brand-dark font-bold hover:bg-gray-100 border border-border/50 transition-all shadow-sm"
                >
                  <Edit2 size={18} />
                  Editar Cadastro
                </button>
                <div className="relative group/menu">
                  <button className="p-3 bg-brand-bg text-brand-dark rounded-2xl border border-border/50 hover:bg-gray-100 transition-all shadow-sm">
                    <MoreHorizontal size={20} />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-border/50 py-2 hidden group-hover/menu:block z-20">
                    <button 
                      onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-all font-bold"
                    >
                      <Trash2 size={16} />
                      Excluir Permanente
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-bg rounded-xl text-brand-secondary">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Telefone / WhatsApp</p>
                  <p className="font-bold">{candidate.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-bg rounded-xl text-brand-secondary">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">E-mail</p>
                  <p className="font-bold truncate max-w-[200px]">{candidate.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-bg rounded-xl text-brand-secondary">
                  <ExternalLink size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Origem Principal</p>
                  <p className="font-bold">{candidate.origin}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Tabs Navigation */}
          <div className="flex border-b border-border/50 gap-8 overflow-x-auto no-scrollbar print:hidden">
            {[
              { id: 'inscricoes', label: 'Inscrições no Processo', icon: FileText },
              { id: 'entrevistas', label: 'Agenda de Entrevistas', icon: Calendar },
              { id: 'historico', label: 'Linha do Tempo', icon: History },
              { id: 'documentos', label: 'Documentos', icon: Clipboard }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 pb-4 text-sm font-bold uppercase tracking-wider transition-all relative border-b-2",
                  activeTab === tab.id 
                    ? "border-brand-coral text-brand-dark" 
                    : "border-transparent text-muted-foreground hover:text-brand-dark"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Panels */}
          <div className="animate-in fade-in duration-300">
            {activeTab === 'inscricoes' && (
              <div className="space-y-4">
                <div className="mb-6 print:hidden">
                  <h3 className="text-xl font-bold">Vagas Inscritas</h3>
                </div>

                {applications.length === 0 ? (
                  <div className="bg-brand-bg/30 border border-dashed border-border p-12 text-center rounded-[28px]">
                    <div className="w-16 h-16 bg-brand-bg rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                      <FileText size={32} />
                    </div>
                    <h4 className="text-lg font-bold mb-1">Nenhuma inscrição ativa</h4>
                    <p className="text-muted-foreground">Inicie um processo para este candidato em uma vaga aberta.</p>
                  </div>
                ) : (
                  applications.map(app => {
                    const job = jobs.find(j => j.id === app.jobId);
                    return (
                      <div key={app.id} className="bg-white border border-border/50 rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                        {/* Compatibility indicator bar */}
                        <div className={cn(
                          "absolute top-0 left-0 h-1.5 w-full",
                          app.compatibilityLevel === 'Alta' ? "bg-emerald-500" :
                          app.compatibilityLevel === 'Média' ? "bg-amber-500" : "bg-rose-500"
                        )} />

                        <div className="flex flex-col md:flex-row justify-between gap-8">
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <h4 className="text-2xl font-black group-hover:text-brand-coral transition-colors">
                                {job?.title || 'Vaga não identificada'}
                              </h4>
                              <div className={cn(
                                "text-[10px] font-black uppercase px-3 py-1 rounded-full border",
                                app.compatibilityLevel === 'Alta' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                app.compatibilityLevel === 'Média' ? "bg-amber-50 border-amber-100 text-amber-700" :
                                "bg-rose-50 border-rose-100 text-rose-700"
                              )}>
                                {app.compatibilityScore}% Compatibilidade • {app.compatibilityLevel}
                              </div>
                              {app.experienceInArea && (
                                <div className={cn(
                                  "text-[10px] font-black uppercase px-3 py-1 rounded-full border",
                                  app.experienceInArea === 'Sim' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                  app.experienceInArea === 'Parcial' ? "bg-amber-50 border-amber-100 text-amber-700" :
                                  "bg-rose-50 border-rose-100 text-rose-700"
                                )}>
                                  Exp. na Área: {app.experienceInArea}
                                </div>
                              )}
                            </div>
                            <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                              <span className="bg-brand-bg px-2 py-0.5 rounded text-brand-dark uppercase tracking-wider text-[10px]">{job?.department}</span>
                              • {job?.location}
                            </p>
                            
                             {/* Detailed Compatibility Info */}
                            <div className="bg-brand-bg/50 p-6 rounded-[24px] border border-border/30 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-brand-dark">
                                  <Sparkles size={16} className="text-brand-coral" />
                                  <span className="text-xs font-black uppercase tracking-widest leading-none">Análise Técnica Detalhada</span>
                                </div>
                                <div className="text-[10px] font-bold text-muted-foreground bg-white/50 px-2 py-0.5 rounded">
                                  {new Date(app.compatibilityCalculatedAt || app.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              
                              <p className="text-sm font-medium leading-relaxed italic text-brand-dark/80 bg-white/30 p-3 rounded-xl border border-white/50">
                                "{app.compatibilityExplanation || app.compatibilityReasons || 'Aguardando avaliação detalhada.'}"
                              </p>
                              
                              {app.compatibilityDetails && app.compatibilityDetails.length > 0 && (
                                <div className="space-y-2 mt-4">
                                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Detalhamento por Chave:</p>
                                  <div className="grid grid-cols-1 gap-2">
                                    {app.compatibilityDetails.map((detail, idx) => (
                                      <div key={idx} className="bg-white/40 p-3 rounded-xl border border-white/40 group/detail hover:bg-white/60 transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                          <div>
                                            <span className="text-[10px] font-black text-brand-dark block truncate max-w-[150px]">{detail.keyword}</span>
                                            <span className="text-[8px] font-bold text-muted-foreground uppercase">Peso: {detail.weight}% • {detail.match}</span>
                                          </div>
                                          <div className="text-right">
                                            <span className="text-xs font-black text-brand-coral">{detail.points} pts</span>
                                          </div>
                                        </div>
                                        {detail.foundTerms && detail.foundTerms.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {detail.foundTerms.map((term, tIdx) => (
                                              <span key={tIdx} className="text-[8px] font-bold bg-brand-dark/5 text-brand-dark px-1.5 py-0.5 rounded border border-brand-dark/5">
                                                {term}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex flex-wrap gap-2 pt-2">
                                {app.matchedKeywords?.map((kw, i) => (
                                  <span key={i} className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                    ✓ {kw}
                                  </span>
                                ))}
                                {app.partialMatches?.map((kw, i) => (
                                  <span key={i} className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                                    ~ {kw}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-6 pt-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                              <span className="flex items-center gap-1.5"><Clock size={14} /> Entrada: {new Date(app.entryDate).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1.5"><User size={14} /> Líder: {app.responsible}</span>
                              <span className="flex items-center gap-1.5"><MessageSquare size={14} /> Canal: {app.channel}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-4 min-w-[240px] bg-brand-bg/30 p-6 rounded-[28px] border border-border/30">
                            <div className="flex flex-col space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Fase do Processo</label>
                              <select 
                                className="w-full px-4 py-3 rounded-2xl border border-border/50 text-xs font-black bg-white shadow-sm focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all"
                                value={app.currentPhase}
                                onChange={(e) => updateApplication(app.id, { currentPhase: e.target.value as any })}
                              >
                                {Object.values(ApplicationPhase).map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                            <div className="flex flex-col space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Status Atual</label>
                              <select 
                                className="w-full px-4 py-3 rounded-2xl border border-border/50 text-xs font-black bg-white shadow-sm focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all"
                                value={app.currentStatus}
                                onChange={(e) => updateApplication(app.id, { currentStatus: e.target.value as any })}
                              >
                                {Object.values(ApplicationStatus).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                        <div className="mt-8 pt-4 border-t border-border/30 flex justify-end items-center print:hidden">
                          <div className="flex gap-2">
                             <button className="p-3 text-muted-foreground hover:text-brand-dark hover:bg-brand-bg transition-all rounded-xl border border-transparent hover:border-border/50 shadow-sm shadow-transparent hover:shadow-inner">
                               <Calendar size={18} />
                             </button>
                             <button 
                              onClick={() => deleteApplication(app.id)}
                              className="p-3 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl border border-transparent hover:border-rose-100 shadow-sm shadow-transparent hover:shadow-inner"
                             >
                               <Trash2 size={18} />
                             </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'historico' && (
              <div className="space-y-6 pl-4 border-l-2 border-border/50 ml-4">
                {history.map((event, idx) => (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-brand-coral border-2 border-white" />
                    <div className="bg-white border border-border/50 p-5 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-brand-bg rounded text-brand-dark">
                          {event.type}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {new Date(event.createdAt).toLocaleDateString()} • {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="font-bold text-sm mb-1">{event.description}</p>
                      {event.details && <p className="text-xs text-muted-foreground">{event.details}</p>}
                      <p className="text-[10px] font-bold text-brand-secondary mt-3 uppercase tracking-widest">Responsável: {event.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'documentos' && (
              <div className="space-y-6">
                <div className="bg-brand-bg/20 border border-border/50 rounded-3xl p-8">
                  <h4 className="font-bold mb-4">Anexar Novo Documento</h4>
                  <form onSubmit={handleAddDocument} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-1">NOME DO DOCUMENTO</label>
                      <input 
                        name="fileName"
                        required
                        className="w-full px-4 py-2 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50 text-sm"
                        placeholder="Ex: Curriculo_Joao.pdf"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-1">CATEGORIA</label>
                      <select name="category" className="w-full px-4 py-2 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50 text-sm bg-white">
                        <option value="Currículo">Currículo</option>
                        <option value="Documento pessoal">Documento pessoal</option>
                        <option value="Comprovante">Comprovante</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <textarea 
                        name="observations"
                        rows={2}
                        className="w-full px-4 py-2 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50 text-sm resize-none"
                        placeholder="Observações sobre o arquivo..."
                      />
                    </div>
                    <button 
                      type="submit"
                      className="md:col-span-2 py-3 bg-brand-dark text-brand-bg rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Anexar Documento
                    </button>
                  </form>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {documents.map(doc => (
                    <div key={doc.id} className="bg-white border border-border/50 p-4 rounded-2xl flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <FileText size={24} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-sm truncate">{doc.fileName}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{doc.category} • {doc.fileFormat}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button className="p-1.5 hover:bg-brand-bg rounded-lg text-muted-foreground hover:text-brand-dark">
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={async () => {
                            await db.deleteDocument(doc.id);
                            fetchRelatedData();
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'entrevistas' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-center gap-4">
                  <AlertCircle className="text-amber-600" size={32} />
                  <div>
                    <h4 className="font-bold text-amber-900">Agenda Integrada</h4>
                    <p className="text-sm text-amber-800">Agende e gerencie entrevistas diretamente pelo perfil do candidato para manter o histórico centralizado.</p>
                  </div>
                </div>
                <button className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground font-bold hover:bg-brand-bg/10 hover:border-brand-coral transition-all flex items-center justify-center gap-2">
                  <Plus size={20} />
                  Agendar Nova Entrevista
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Quick Info Sidebar */}
          <div className="bg-brand-dark text-white p-8 rounded-[32px] shadow-xl print:text-brand-dark print:bg-white print:shadow-none print:border print:border-border/50 print:p-0">
             <h3 className="text-xl font-bold mb-6 flex items-center gap-2 print:text-brand-dark">
               <Info size={20} className="text-brand-coral" />
               Visão Geral
             </h3>
             <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-brand-coral opacity-80 block mb-1">Últimas Experiências</label>
                  <div className="space-y-2">
                    {candidate.experiences.map((exp, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0 print:bg-brand-bg print:text-brand-dark">{i+1}</div>
                        <p className="leading-tight opacity-90">{exp}</p>
                      </div>
                    ))}
                    {candidate.experiences.length === 0 && <p className="text-sm italic opacity-50">Nenhuma experiência registrada.</p>}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-brand-coral opacity-80 block mb-1">Observações Privadas</label>
                  <p className="text-sm opacity-90 leading-relaxed italic">
                    "{candidate.observations || 'Sem observações cadastradas.'}"
                  </p>
                </div>
                <div className="pt-4 border-t border-white/10 print:border-border/50">
                  <div className="flex justify-between items-center text-xs font-bold opacity-70">
                    <span>CADASTRADO EM:</span>
                    <span>{new Date(candidate.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold opacity-70 mt-2">
                    <span>ÚLTIMA ATUALIZAÇÃO:</span>
                    <span>{new Date(candidate.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
             </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-border/50 shadow-sm print:hidden">
             <h3 className="text-lg font-bold mb-4">Ações Rápidas</h3>
             <div className="grid grid-cols-1 gap-3">
               <button 
                onClick={() => {
                   const win = window.open(`https://wa.me/55${candidate.phone.replace(/\D/g, '')}`, '_blank');
                   if (win) win.focus();
                }}
                className="flex items-center gap-3 w-full p-4 rounded-2xl bg-brand-bg font-bold text-sm hover:bg-brand-bg/80 transition-all"
               >
                 <MessageSquare size={18} className="text-brand-coral" />
                 Enviar WhatsApp
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isEditModalOpen && (
        <CandidateModal 
          candidate={candidate}
          onClose={() => setIsEditModalOpen(false)}
          onSave={async (data) => {
            await updateCandidate(candidate.id, data);
            refreshApplications();
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isNewAppModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-sans text-brand-dark">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-extrabold tracking-tight">Nova Inscrição</h3>
              <button onClick={() => setIsNewAppModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X size={24} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Vaga Disponível</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50 bg-white"
                  value={newAppData.jobId}
                  onChange={e => setNewAppData({...newAppData, jobId: e.target.value})}
                >
                  <option value="">Selecione a vaga...</option>
                  {jobs.filter(j => j.status === 'Aberta').map(j => (
                    <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Canal de Captação</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50 bg-white"
                  value={newAppData.channel}
                  onChange={e => setNewAppData({...newAppData, channel: e.target.value})}
                >
                  <option value="Manual">Manual</option>
                  <option value="Mogiconecta">Mogiconecta</option>
                  <option value="Indeed">Indeed</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Indicação">Indicação</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Observações da Inscrição</label>
                <textarea 
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50 resize-none"
                  value={newAppData.observations}
                  onChange={e => setNewAppData({...newAppData, observations: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsNewAppModalOpen(false)}
                  className="flex-1 px-4 py-4 border border-border rounded-2xl font-bold hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  disabled={!newAppData.jobId}
                  onClick={async () => {
                    // The addApplication hook will automatically trigger recalculation via applicationService
                    await addApplication({
                      candidateId: id,
                      jobId: newAppData.jobId,
                      channel: newAppData.channel,
                      currentPhase: ApplicationPhase.NEW,
                      currentStatus: ApplicationStatus.NEW,
                      responsible: 'Administrador',
                      entryDate: new Date().toISOString(),
                      observations: newAppData.observations,
                      compatibilityScore: 0,
                      compatibilityLevel: "Baixa",
                      compatibilityReasons: "Aguardando cálculo...",
                      matchedKeywords: [],
                      missingKeywords: [],
                      partialMatches: [],
                      compatibilityExplanation: "",
                      compatibilityDetails: [],
                      compatibilityCalculatedAt: new Date().toISOString(),
                      origin: 'Manual'
                    });
                    setIsNewAppModalOpen(false);
                    fetchRelatedData();
                  }}
                  className="flex-1 px-4 py-4 bg-brand-dark text-white rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
                >
                  Confirmar Inscrição
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal 
          title="Excluir Candidato?"
          message="Esta ação é definitiva. Todas as inscrições, histórico e documentos associados serão apagados do sistema."
          onConfirm={async () => {
            await deleteCandidate(id);
            router.push('/candidates');
          }}
          onCancel={() => setConfirmDelete(false)}
          variant="danger"
          confirmText="Sim, Excluir Tudo"
        />
      )}
    </div>
  );
}
