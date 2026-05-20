'use client';
import React, { useState } from 'react';
import { 
  Briefcase, Plus, Search, 
  MapPin, Clock, Users,
  Pause, Play, CheckCircle, Trash2, Edit2, X, Save
} from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { Job, JobStatus } from '@/types';
import { cn } from '@/lib/utils';
import { ConfirmModal } from '@/components/ConfirmModal';
import Link from 'next/link';

export default function JobsPage() {
  const { jobs, loading, addJob, updateJob, deleteJob } = useJobs();
  const [applications, setApplications] = React.useState<any[]>([]);
  const [appsLoading, setAppsLoading] = React.useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'TODOS'>('TODOS');

  React.useEffect(() => {
    const fetchApps = async () => {
      try {
        const data = await import('@/database/db').then(m => m.db.listApplications());
        setApplications(data);
      } catch (e) {
        console.error(e);
      } finally {
        setAppsLoading(false);
      }
    };
    fetchApps();
  }, []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: 'Remoto / Presencial',
    description: '',
    requirements: '',
    mandatoryKeywords: '',
    desirableKeywords: '',
    valuedExperiences: '',
    key_1: '',
    key_2: '',
    key_3: '',
    key_4: '',
    key_5: ''
  });

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(search.toLowerCase()) || 
                         (j.department || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'TODOS' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openModal = (job?: Job) => {
    if (job) {
      setEditingJob(job);
      setFormData({
        title: job.title,
        department: job.department || '',
        location: job.location || '',
        description: job.description,
        requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : '',
        mandatoryKeywords: Array.isArray(job.mandatoryKeywords) ? job.mandatoryKeywords.join(', ') : '',
        desirableKeywords: Array.isArray(job.desirableKeywords) ? job.desirableKeywords.join(', ') : '',
        valuedExperiences: Array.isArray(job.valuedExperiences) ? job.valuedExperiences.join('\n') : '',
        key_1: job.compatibilityKeywords?.key_1 || '',
        key_2: job.compatibilityKeywords?.key_2 || '',
        key_3: job.compatibilityKeywords?.key_3 || '',
        key_4: job.compatibilityKeywords?.key_4 || '',
        key_5: job.compatibilityKeywords?.key_5 || ''
      });
    } else {
      setEditingJob(undefined);
      setFormData({
        title: '',
        department: '',
        location: 'Remoto / Presencial',
        description: '',
        requirements: '',
        mandatoryKeywords: '',
        desirableKeywords: '',
        valuedExperiences: '',
        key_1: '',
        key_2: '',
        key_3: '',
        key_4: '',
        key_5: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const compatibilityKeywords = {
      key_1: formData.key_1,
      key_2: formData.key_2,
      key_3: formData.key_3,
      key_4: formData.key_4,
      key_5: formData.key_5,
    };

    const data = {
      title: formData.title,
      department: formData.department,
      location: formData.location,
      description: formData.description,
      requirements: formData.requirements.split('\n').filter(s => s.trim()),
      mandatoryKeywords: formData.mandatoryKeywords.split(',').map(s => s.trim()).filter(s => s),
      desirableKeywords: formData.desirableKeywords.split(',').map(s => s.trim()).filter(s => s),
      valuedExperiences: formData.valuedExperiences.split('\n').filter(s => s.trim()),
      compatibilityKeywords
    };

    if (editingJob) {
      await updateJob(editingJob.id, data);
      
      // Recalculate compatibility for all applications for this job
      try {
        const { db } = await import('@/database/db');
        const { compatibilityService } = await import('@/services/compatibilityService');
        const apps = await db.listApplications();
        const candidates = await db.listCandidates();
        const jobApps = apps.filter(a => a.jobId === editingJob.id);
        
        for (const app of jobApps) {
          const candidate = candidates.find(c => c.id === app.candidateId);
          if (candidate) {
            const result = compatibilityService.calculateCandidateJobCompatibility(candidate, { ...editingJob, ...data });
            await db.updateApplication(app.id, {
              compatibilityScore: result.score,
              compatibilityLevel: result.level,
              matchedKeywords: result.matchedKeywords,
              missingKeywords: result.missingKeywords,
              partialMatches: result.partialMatches,
              compatibilityExplanation: result.explanation,
              compatibilityDetails: result.details,
              compatibilityCalculatedAt: new Date().toISOString()
            });
            
            const { historyService } = await import('@/services/historyService');
            await historyService.logCompatibilityRecalculated(candidate.id, app.id, result.score, result.level);
          }
        }
      } catch (err) {
        console.error("Erro ao recalcular compatibilidade", err);
      }
    } else {
      await addJob({
        ...data,
        status: JobStatus.OPEN,
        responsible: 'Administrador'
      });
    }
    setIsModalOpen(false);
  };

  const toggleStatus = async (job: Job) => {
    const nextStatus = job.status === JobStatus.OPEN ? JobStatus.PAUSED : JobStatus.OPEN;
    await updateJob(job.id, { status: nextStatus });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-brand-dark pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 mb-12">
        <div className="hidden md:block"></div>
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-brand-dark whitespace-nowrap">Oportunidades de Carreira</h1>
        </div>
        <div className="flex items-center justify-center md:justify-end">
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-brand-dark/20 hover:opacity-90 transition-all hover:-translate-y-1"
          >
            <Plus size={22} />
            Nova Vaga
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[28px] border border-border/50 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input 
            type="text"
            placeholder="Buscar por cargo ou departamento..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          {['TODOS', JobStatus.OPEN, JobStatus.PAUSED, JobStatus.CLOSED].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold transition-all border shrink-0",
                statusFilter === status 
                  ? "bg-brand-dark text-white border-brand-dark shadow-md" 
                  : "bg-white border-border text-muted-foreground hover:bg-gray-50"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-24 text-center animate-pulse">
            <div className="w-16 h-16 bg-brand-bg rounded-full mx-auto mb-4" />
            <p className="font-bold text-muted-foreground">Sincronizando vagas...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white rounded-[32px] border border-dashed border-border/60">
            <Briefcase size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-xl font-bold text-muted-foreground/60 tracking-tight">Nenhuma vaga nesta categoria.</p>
          </div>
        ) : filteredJobs.map((job) => (
          <div key={job.id} className="group bg-white rounded-[32px] p-8 shadow-sm border border-border/50 hover:shadow-xl hover:border-brand-coral/20 transition-all flex flex-col relative overflow-hidden">
            {/* Status Indicator */}
            <div className={cn(
              "absolute top-0 left-0 w-full h-1.5",
              job.status === JobStatus.OPEN ? "bg-emerald-500" : 
              job.status === JobStatus.PAUSED ? "bg-amber-500" : "bg-rose-500"
            )} />

            <div className="flex justify-between items-start mb-6">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                job.status === JobStatus.OPEN ? "bg-emerald-50 border-emerald-100 text-emerald-700" : 
                job.status === JobStatus.PAUSED ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-rose-50 border-rose-100 text-rose-700"
              )}>
                {job.status}
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => toggleStatus(job)} 
                  className="p-2 text-muted-foreground hover:text-brand-dark hover:bg-brand-bg rounded-xl transition-all"
                  title={job.status === JobStatus.OPEN ? 'Pausar Vaga' : 'Reabrir Vaga'}
                >
                  {job.status === JobStatus.OPEN ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button 
                  onClick={() => openModal(job)} 
                  className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Editar Vaga"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => setConfirmDelete(job.id)} 
                  className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  title="Excluir Vaga"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="text-2xl font-extrabold mb-2 tracking-tight group-hover:text-brand-coral transition-colors">{job.title}</h3>
            <p className="text-muted-foreground font-medium text-sm mb-6 flex items-center gap-2">
              <span className="font-bold text-brand-dark uppercase tracking-wider text-[11px] bg-brand-bg px-2 py-0.5 rounded">{job.department}</span>
              • {job.location}
            </p>
            
            <p className="text-sm text-muted-foreground leading-relaxed mb-8 line-clamp-3">
              {job.description}
            </p>
            
            <div className="space-y-3 mb-8 flex-1">
              <div className="flex items-center justify-between text-xs font-bold text-brand-dark/70 bg-brand-bg/50 p-3 rounded-xl border border-border/30">
                <div className="flex items-center gap-2"><Users size={16} /> Candidatos</div>
                <span className="text-brand-coral font-black">
                  {applications.filter(a => a.jobId === job.id).length} ativos
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-brand-dark/70 px-3">
                <div className="flex items-center gap-2"><Clock size={16} /> Aberta em</div>
                <span>{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Link 
                href={`/vagas/${job.id}/candidatos`}
                className="flex-1 bg-brand-dark text-white hover:opacity-90 px-4 py-3.5 rounded-2xl text-xs font-extrabold transition-all shadow-lg hover:-translate-y-0.5 flex items-center justify-center"
              >
                VER CANDIDATOS
              </Link>
              <button onClick={() => openModal(job)} className="px-5 py-3.5 bg-brand-bg text-brand-dark hover:bg-gray-100 border border-border/50 rounded-2xl text-xs font-extrabold transition-all">
                DETALHES
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova/Editar Vaga */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-brand-dark overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-2xl p-10 shadow-2xl my-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">{editingJob ? 'Editar Oportunidade' : 'Abrir Nova Vaga'}</h2>
                <p className="text-muted-foreground font-medium">Defina os requisitos e expectativas para o cargo.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all shadow-sm border border-border/50"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">TÍTULO DO CARGO</label>
                  <input 
                    required
                    className="w-full px-5 py-3.5 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all font-medium"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Vendedor de Consórcios"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">DEPARTAMENTO</label>
                  <input 
                    required
                    className="w-full px-5 py-3.5 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all font-medium"
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    placeholder="Ex: Comercial"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">DESCRIÇÃO DA OPORTUNIDADE</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full px-5 py-3.5 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all font-medium resize-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Descreva o dia a dia e o objetivo da vaga..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">REQUISITOS (UM POR LINHA)</label>
                    <textarea 
                      rows={4}
                      className="w-full px-5 py-3.5 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none text-sm font-medium resize-none"
                      value={formData.requirements}
                      onChange={e => setFormData({...formData, requirements: e.target.value})}
                      placeholder="Ex: CNH B ativa"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">PALAVRAS-CHAVE OBRIGATÓRIAS</label>
                    <textarea 
                      rows={4}
                      className="w-full px-5 py-3.5 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none text-sm font-medium resize-none"
                      value={formData.mandatoryKeywords}
                      onChange={e => setFormData({...formData, mandatoryKeywords: e.target.value})}
                      placeholder="Ex: Vendas, Argumentação, Persuasão"
                    />
                  </div>
                </div>

                <div className="bg-brand-bg/40 p-6 rounded-[32px] border border-brand-coral/10 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={18} className="text-brand-coral" />
                    <label className="text-[10px] font-black uppercase text-brand-dark tracking-widest">Ranking de Compatibilidade</label>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium mb-4 leading-tight">
                    Defina 5 termos em ordem de importância. O sistema usará esses termos para classificar os candidatos.
                  </p>
                  
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-black text-brand-dark/40 uppercase">Peso {i === 1 ? '68' : i === 2 ? '20' : i === 3 ? '8' : i === 4 ? '3' : '1'}%</span>
                        <span className="text-[8px] font-bold text-muted-foreground italic">
                          {i === 1 ? 'Fundamental' : i === 2 ? 'Muito importante' : i === 3 ? 'Importante' : i === 4 ? 'Desejável' : 'Diferencial'}
                        </span>
                      </div>
                      <input 
                        className="w-full px-4 py-2.5 rounded-xl border border-white bg-white shadow-sm focus:ring-2 focus:ring-brand-coral/30 outline-none transition-all text-xs font-bold"
                        value={(formData as any)[`key_${i}`]}
                        onChange={e => setFormData({...formData, [`key_${i}`]: e.target.value})}
                        placeholder={`Palavra/Frase ${i}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-4 border border-border rounded-2xl font-bold hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-8 py-4 bg-brand-dark text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-brand-dark/20 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {editingJob ? 'Salvar Vaga' : 'Criar Vaga agora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Exclusão */}
      {confirmDelete && (
        <ConfirmModal 
          title="Excluir Vaga Permanentemente?"
          message="Esta vaga e todo o progresso dos candidatos nela serão apagados. Os candidatos permanecerão na base geral, mas as inscrições desta vaga sumirão."
          onConfirm={async () => {
            await deleteJob(confirmDelete);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
          variant="danger"
          confirmText="Sim, Excluir Vaga"
        />
      )}
    </div>
  );
}
