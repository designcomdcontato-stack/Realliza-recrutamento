'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Filter, UserPlus, ClipboardPaste, 
  Eye, Edit2, MapPin, Phone, MoreHorizontal,
  Download, Trash2, UserX, Trash, CheckCircle2,
  AlertCircle, Clock, Calendar, FileText,
  UserCheck, History, Briefcase, ExternalLink,
  MessageSquare, Copy, ChevronDown, ChevronUp,
  Printer, ArrowUpRight, Check, X, Bookmark,
  Users, Upload
} from 'lucide-react';
import { useCandidates } from '@/hooks/useCandidates';
import { Candidate, Application, Job, CandidateDocument, ApplicationPhase, ApplicationStatus } from '@/types';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { CandidateModal } from '@/components/CandidateModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DocumentViewer } from '@/components/DocumentViewer';
import { exportService } from '@/services/exportService';
import { cn } from '@/lib/utils';
import { db } from '@/database/db';
import { format, differenceInYears, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type EnrichedCandidate = Candidate & {
  latestApplication?: Application;
  latestJob?: Job;
  applicationCount: number;
  hasResume: boolean;
  resumeUrl?: string;
  calculatedAge: string | number;
  experienceMatch: 'Sim' | 'Parcial' | 'Não' | 'Não localizei';
};

export default function CandidatesPage() {
  const { 
    candidates, loading: candidatesLoading, addCandidate, 
    updateCandidate, deleteCandidate, bulkDeleteCandidates, anonymizeCandidate,
    refresh
  } = useCandidates();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allDocs, setAllDocs] = useState<CandidateDocument[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [uploadingCandidateId, setUploadingCandidateId] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<CandidateDocument | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkPhaseModal, setShowBulkPhaseModal] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Undo/Desfazer state
  const [undoAction, setUndoAction] = useState<{
    type: 'delete' | 'bulk_delete' | 'anonymize' | 'update_phase' | 'bulk_update_phase' | 'update_candidate';
    description: string;
    timestamp: number;
    data: any;
  } | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoTimer, setUndoTimer] = useState(15);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerUndoableAction = (action: {
    type: 'delete' | 'bulk_delete' | 'anonymize' | 'update_phase' | 'bulk_update_phase' | 'update_candidate';
    description: string;
    data: any;
  }) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setUndoAction({
      ...action,
      timestamp: Date.now()
    });
    setShowUndoToast(true);
    setUndoTimer(15);

    timerRef.current = setInterval(() => {
      setUndoTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setShowUndoToast(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleUndoClose = () => {
    setShowUndoToast(false);
    setUndoAction(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleUndo = async () => {
    if (!undoAction) return;

    setGlobalLoading(true);
    try {
      switch (undoAction.type) {
        case 'delete': {
          const { candidate, applications: apps, documents: docs } = undoAction.data;
          
          await db.createCandidate(candidate);
          
          for (const app of apps) {
            await db.createApplication(app);
          }
          
          for (const doc of docs) {
            await db.attachDocument(doc);
          }
          break;
        }
        case 'bulk_delete': {
          const { candidates: candsToRestore, applications: apps, documents: docs } = undoAction.data;
          
          for (const cand of candsToRestore) {
            await db.createCandidate(cand);
          }
          
          for (const app of apps) {
            await db.createApplication(app);
          }
          
          for (const doc of docs) {
            await db.attachDocument(doc);
          }
          break;
        }
        case 'anonymize': {
          const { candidateId, originalData } = undoAction.data;
          await db.updateCandidate(candidateId, originalData);
          break;
        }
        case 'update_phase': {
          const { applicationId, oldPhase } = undoAction.data;
          await db.updateApplication(applicationId, { currentPhase: oldPhase });
          break;
        }
        case 'bulk_update_phase': {
          const { applicationsOldPhases } = undoAction.data;
          for (const item of applicationsOldPhases) {
            await db.updateApplication(item.id, { currentPhase: item.phase });
          }
          break;
        }
        case 'update_candidate': {
          const { candidateId, originalData } = undoAction.data;
          await db.updateCandidate(candidateId, originalData);
          break;
        }
        default:
          break;
      }
      
      await refresh();
      const appsData = await db.listApplications();
      setApplications(appsData);
      const docsData = await db.listAllDocuments();
      setAllDocs(docsData);
      
      setUndoAction(null);
      setShowUndoToast(false);
    } catch (error) {
      console.error("Desfazer falhou:", error);
    } finally {
      setGlobalLoading(false);
    }
  };

  // Keyboard shortcut (Ctrl+Z) for Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (showUndoToast && undoAction) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUndoToast, undoAction]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Filters state
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    channel: 'TODOS',
    jobId: 'TODOS',
    phase: 'TODOS',
    status: 'TODOS',
    city: 'TODOS',
    type: 'TODOS', // Novo vs Já se cadastrou
    minCompatibility: 0,
    hasResume: 'TODOS',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'entryDate',
    direction: 'desc'
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmAnonymize, setConfirmAnonymize] = useState<string | null>(null);

  const uniqueCities = useMemo(() => {
    const cities = new Set(candidates.map(c => c.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [candidates]);

  useEffect(() => {
    const fetchData = async () => {
      setGlobalLoading(true);
      try {
        const [appsData, jobsData, docsData] = await Promise.all([
          db.listApplications(),
          db.listJobs(),
          db.listAllDocuments()
        ]);
        setApplications(appsData);
        setJobs(jobsData);
        setAllDocs(docsData);
      } catch (error) {
        console.error("Error fetching supplemental candidate data", error);
      } finally {
        setGlobalLoading(false);
      }
    };
    fetchData();
  }, [candidates]);

  const enrichedCandidates: EnrichedCandidate[] = useMemo(() => {
    return candidates.map(c => {
      const candidateApps = applications
        .filter(a => a.candidateId === c.id)
        .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
      
      const latestApp = candidateApps[0];
      const latestJob = latestApp ? jobs.find(j => j.id === latestApp.jobId) : undefined;
      const candidateDocs = allDocs.filter(d => d.candidateId === c.id);
      const resume = candidateDocs.find(d => d.category === 'Currículo');
      
      let calculatedAge: string | number = '-';
      if (c.birthDate && c.birthDate.includes('/')) {
        try {
          const parsedDate = parse(c.birthDate, "dd/MM/yyyy", new Date());
          if (isValid(parsedDate)) {
            calculatedAge = differenceInYears(new Date(), parsedDate);
          }
        } catch (e) {
          console.error("Error parsing birth date", e);
        }
      } 
      
      if (calculatedAge === '-' && c.age) {
        calculatedAge = c.age;
      }

      return {
        ...c,
        latestApplication: latestApp,
        latestJob,
        applicationCount: candidateApps.length,
        hasResume: !!resume,
        resumeUrl: resume?.id,
        calculatedAge,
        experienceMatch: latestApp?.experienceInArea || (latestApp?.compatibilityLevel === 'Média' ? 'Parcial' : 'Não')
      };
    });
  }, [candidates, applications, jobs, allDocs]);

  const filteredCandidates = enrichedCandidates.filter(c => {
    const latestApp = c.latestApplication;
    
    // Global search
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      c.name?.toLowerCase()?.includes(searchLower) ||
      c.phone?.includes(search) ||
      c.city?.toLowerCase()?.includes(searchLower) ||
      (c.latestJob?.title?.toLowerCase()?.includes(searchLower)) ||
      (latestApp?.channel?.toLowerCase()?.includes(searchLower));

    if (!matchesSearch) return false;

    // Detailed filters
    if (filters.channel !== 'TODOS' && latestApp?.channel !== filters.channel) return false;
    if (filters.jobId !== 'TODOS' && latestApp?.jobId !== filters.jobId) return false;
    if (filters.phase !== 'TODOS' && latestApp?.currentPhase !== filters.phase) return false;
    if (filters.status !== 'TODOS' && latestApp?.currentStatus !== filters.status) return false;
    if (filters.city !== 'TODOS' && c.city !== filters.city) return false;
    
    if (filters.dateStart && latestApp) {
      if (new Date(latestApp.entryDate) < new Date(filters.dateStart)) return false;
    }
    if (filters.dateEnd && latestApp) {
      const endDate = new Date(filters.dateEnd);
      endDate.setHours(23, 59, 59);
      if (new Date(latestApp.entryDate) > endDate) return false;
    }

    if (filters.type === 'NOVO' && c.applicationCount > 1) return false;
    if (filters.type === 'JA_CADASTRADO' && c.applicationCount <= 1) return false;

    if (filters.hasResume === 'SIM' && !c.hasResume) return false;
    if (filters.hasResume === 'NAO' && c.hasResume) return false;

    if (latestApp && latestApp.compatibilityScore < filters.minCompatibility) return false;

    return true;
  });

  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    const { key, direction } = sortConfig;
    let valA: any;
    let valB: any;

    switch(key) {
      case 'entryDate':
        valA = a.latestApplication ? new Date(a.latestApplication.entryDate).getTime() : 0;
        valB = b.latestApplication ? new Date(b.latestApplication.entryDate).getTime() : 0;
        break;
      case 'name':
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
        break;
      case 'age':
        valA = typeof a.calculatedAge === 'number' ? a.calculatedAge : 0;
        valB = typeof b.calculatedAge === 'number' ? b.calculatedAge : 0;
        break;
      case 'city':
        valA = a.city.toLowerCase();
        valB = b.city.toLowerCase();
        break;
      case 'compatibility':
        valA = a.latestApplication?.compatibilityScore || 0;
        valB = b.latestApplication?.compatibilityScore || 0;
        break;
      case 'phase':
        valA = a.latestApplication?.currentPhase || '';
        valB = b.latestApplication?.currentPhase || '';
        break;
      default:
        valA = a[key as keyof EnrichedCandidate];
        valB = b[key as keyof EnrichedCandidate];
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCandidates(sortedCandidates.map(c => c.id));
    } else {
      setSelectedCandidates([]);
    }
  };

  const handleSelectCandidate = (id: string) => {
    setSelectedCandidates(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedCandidates.length) return;
    setBulkActionLoading(true);
    try {
      const candidatesToRestore = candidates.filter(c => selectedCandidates.includes(c.id));
      const relatedApps = applications.filter(a => selectedCandidates.includes(a.candidateId));
      const relatedDocs = allDocs.filter(d => selectedCandidates.includes(d.candidateId));
      
      triggerUndoableAction({
        type: 'bulk_delete',
        description: `${selectedCandidates.length} candidatos excluídos em massa`,
        data: {
          candidates: candidatesToRestore,
          applications: relatedApps,
          documents: relatedDocs
        }
      });

      await bulkDeleteCandidates(selectedCandidates);
      setSelectedCandidates([]);
    } catch (error) {
      console.error("Bulk delete failed", error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUpdatePhase = async (phase: ApplicationPhase) => {
    if (!selectedCandidates.length) return;
    setBulkActionLoading(true);
    try {
      const applicationIds = enrichedCandidates
        .filter(c => selectedCandidates.includes(c.id) && c.latestApplication)
        .map(c => c.latestApplication!.id);

      if (applicationIds.length > 0) {
        const oldApplications = applications.filter(a => applicationIds.includes(a.id));
        triggerUndoableAction({
          type: 'bulk_update_phase',
          description: `Fase de ${applicationIds.length} candidatos alterada para ${phase}`,
          data: {
            applicationsOldPhases: oldApplications.map(a => ({ id: a.id, phase: a.currentPhase }))
          }
        });

        await db.bulkUpdateApplications(applicationIds, { currentPhase: phase });
      }

      // Refresh local applications state
      const appsData = await db.listApplications();
      setApplications(appsData);
      setSelectedCandidates([]);
      setShowBulkPhaseModal(false);
    } catch (error) {
      console.error("Bulk update phase failed", error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleCopyPhone = (phone: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
  };

  const handleUpdatePhase = async (appId: string, phase: ApplicationPhase) => {
    try {
      const currentApp = applications.find(a => a.id === appId);
      if (currentApp && currentApp.currentPhase !== phase) {
        triggerUndoableAction({
          type: 'update_phase',
          description: `Fase alterada para ${phase}`,
          data: {
            applicationId: appId,
            oldPhase: currentApp.currentPhase
          }
        });
      }
      await db.updateApplication(appId, { currentPhase: phase });
      // Refresh local applications state
      const appsData = await db.listApplications();
      setApplications(appsData);
    } catch (error) {
      console.error("Failed to update phase", error);
    }
  };

  const handleUploadResume = async (candidateId: string, file: File) => {
    setUploadingCandidateId(candidateId);
    try {
      const reader = new FileReader();
      
      const contentUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const format = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      let detectedType = file.type;
      if (!detectedType) {
        if (format === 'pdf') detectedType = 'application/pdf';
        else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(format)) detectedType = `image/${format === 'jpg' ? 'jpeg' : format}`;
        else if (format === 'txt') detectedType = 'text/plain';
        else if (format === 'doc') detectedType = 'application/msword';
        else if (format === 'docx') detectedType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else detectedType = 'application/octet-stream';
      }

      await db.attachDocument({
        candidateId,
        fileName: file.name,
        fileType: detectedType,
        fileFormat: format,
        fileSize: file.size,
        category: 'Currículo',
        observations: 'Enviado via tabela rápida',
        user: 'Sistema',
        contentUrl
      });
      // Refresh documents
      const docsData = await db.listAllDocuments();
      setAllDocs(docsData);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploadingCandidateId(null);
    }
  };

  const handleAssociateJob = async (candidateId: string, jobId: string) => {
    if (jobId === 'NONE') return;
    try {
      await db.createApplication({
        candidateId,
        jobId,
        channel: 'Manual',
        currentPhase: ApplicationPhase.NEW,
        currentStatus: ApplicationStatus.NEW,
        responsible: 'Sistema',
        entryDate: new Date().toISOString(),
        observations: 'Vaga associada manualmente na base',
        compatibilityScore: 0,
        compatibilityLevel: 'Baixa',
        compatibilityReasons: 'Adicionado manualmente',
        origin: 'Manual'
      });
      // Refresh applications
      const appsData = await db.listApplications();
      setApplications(appsData);
    } catch (error) {
      console.error("Failed to associate job", error);
    }
  };

  const handleExportCSV = () => {
    const dataToExport = sortedCandidates.map(c => ({
      'Entrada': c.latestApplication ? format(new Date(c.latestApplication.entryDate), 'dd/MM/yyyy') : 'N/A',
      'Canal': c.latestApplication?.channel || 'N/A',
      'Nome': c.name,
      'Idade': c.calculatedAge,
      'Cidade': c.city,
      'Telefone': c.phone,
      'Vaga': c.latestJob?.title || 'N/A',
      'Compatibilidade': c.latestApplication ? `${c.latestApplication.compatibilityScore}%` : 'N/A',
      'Status': c.latestApplication?.currentStatus || 'N/A'
    }));
    exportService.downloadCSV('candidatos-realliza', dataToExport);
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case ApplicationPhase.NEW: return 'bg-blue-100 text-blue-700 border-blue-200';
      case ApplicationPhase.SCHEDULING: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ApplicationPhase.INTERVIEW: return 'bg-purple-100 text-purple-700 border-purple-200';
      case ApplicationPhase.HIRING: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ApplicationPhase.ARCHIVE: return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 75) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 45) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-brand-dark pb-20">
      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 mb-12">
        <div className="hidden md:block"></div>
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-brand-dark whitespace-nowrap">Base de Talentos</h1>
        </div>
        <div className="flex items-center justify-center md:justify-end gap-3">
          {undoAction && (
            <button 
              onClick={handleUndo}
              className="flex items-center gap-2 bg-[#F49A9D]/15 hover:bg-[#F49A9D]/25 border border-[#F49A9D] text-brand-dark px-6 py-4 rounded-2xl transition-all text-xs font-bold shadow-sm animate-pulse shrink-0"
              title={`Atalho: Ctrl+Z (${undoTimer}s)`}
            >
              <History size={18} className="text-brand-dark" />
              Desfazer ({undoTimer}s)
            </button>
          )}
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white border border-border/50 text-brand-dark px-6 py-4 rounded-2xl transition-all hover:bg-gray-50 text-xs font-bold shadow-sm"
          >
            <Download size={18} />
            Exportar
          </button>
          <button 
            onClick={() => {
              setEditingCandidate(undefined);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-brand-dark/20 hover:opacity-90 transition-all hover:-translate-y-1"
          >
            <UserPlus size={22} />
            Novo Candidato
          </button>
        </div>
      </div>

      {/* Control Bar (Jobs-style) */}
      <div className="bg-white p-6 rounded-[28px] border border-border/50 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand-coral transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Buscar por nome, telefone, vaga, canal..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border focus:ring-2 focus:ring-brand-coral/50 outline-none transition-all text-sm font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
            {['TODOS', ...Object.values(ApplicationPhase)].map((phase) => (
              <button
                key={phase}
                onClick={() => setFilters({...filters, phase})}
                className={cn(
                  "px-5 py-3 rounded-2xl text-xs font-bold transition-all border shrink-0",
                  filters.phase === phase 
                    ? "bg-brand-dark text-white border-brand-dark shadow-md" 
                    : "bg-white border-border text-muted-foreground hover:bg-gray-50"
                )}
              >
                {phase}
              </button>
            ))}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2",
                showFilters ? "bg-brand-coral text-brand-dark border-brand-coral" : "bg-white border-border text-muted-foreground hover:bg-gray-50"
              )}
            >
              <Filter size={16} />
              Mais Filtros
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-4 border-t border-border/10 animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Período</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    className="w-full text-xs p-3 rounded-xl border border-border focus:ring-1 focus:ring-brand-coral outline-none"
                    value={filters.dateStart}
                    onChange={(e) => setFilters({...filters, dateStart: e.target.value})}
                  />
                  <input 
                    type="date" 
                    className="w-full text-xs p-3 rounded-xl border border-border focus:ring-1 focus:ring-brand-coral outline-none"
                    value={filters.dateEnd}
                    onChange={(e) => setFilters({...filters, dateEnd: e.target.value})}
                  />
                </div>
             </div>

             <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Canal</label>
                <select 
                  className="w-full text-xs p-3 rounded-xl border border-border focus:ring-1 focus:ring-brand-coral outline-none font-bold"
                  value={filters.channel}
                  onChange={(e) => setFilters({...filters, channel: e.target.value})}
                >
                  <option value="TODOS">Todos os Canais</option>
                  <option value="Mogiconecta">Mogiconecta</option>
                  <option value="Catho">Catho</option>
                  <option value="Indeed">Indeed</option>
                  <option value="Infojobs">Infojobs</option>
                  <option value="Indicação">Indicação</option>
                </select>
             </div>

             <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Vaga</label>
                <select 
                  className="w-full text-xs p-3 rounded-xl border border-border focus:ring-1 focus:ring-brand-coral outline-none font-bold"
                  value={filters.jobId}
                  onChange={(e) => setFilters({...filters, jobId: e.target.value})}
                >
                  <option value="TODOS">Todas as Vagas</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
             </div>

             <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Status</label>
                <select 
                  className="w-full text-xs p-3 rounded-xl border border-border focus:ring-1 focus:ring-brand-coral outline-none font-bold"
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="TODOS">Todos os Status</option>
                  {Object.values(ApplicationStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
             </div>

             <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Cidade</label>
                <select 
                  className="w-full text-xs p-3 rounded-xl border border-border focus:ring-1 focus:ring-brand-coral outline-none font-bold"
                  value={filters.city}
                  onChange={(e) => setFilters({...filters, city: e.target.value})}
                >
                  <option value="TODOS">Todas as Cidades</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
             </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[32px] shadow-sm border border-border/50 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1400px]">
          <thead className="bg-[#FAF9F6] border-b border-border/50">
            <tr>
              <th className="px-6 py-6 w-12 text-center">
                <input 
                  type="checkbox" 
                  className="rounded border-border/50 text-brand-coral focus:ring-brand-coral cursor-pointer"
                  checked={selectedCandidates.length > 0 && selectedCandidates.length === sortedCandidates.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th onClick={() => handleSort('entryDate')} className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground cursor-pointer hover:text-brand-dark transition-colors">
                 <div className="flex items-center gap-2">
                    Data Entrada
                    {sortConfig.key === 'entryDate' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                 </div>
              </th>
              <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Canal</th>
              <th onClick={() => handleSort('name')} className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground cursor-pointer hover:text-brand-dark transition-colors">
                 <div className="flex items-center gap-2">
                    Nome e Idade
                    {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                 </div>
              </th>
              <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Contato</th>
              <th onClick={() => handleSort('city')} className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground cursor-pointer hover:text-brand-dark transition-colors">
                 <div className="flex items-center gap-2">
                    Localização
                    {sortConfig.key === 'city' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                 </div>
              </th>
              <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Vaga</th>
              <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground text-center">Exp. na Área</th>
              <th onClick={() => handleSort('compatibility')} className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground text-center cursor-pointer hover:text-brand-dark transition-colors">
                 <div className="flex items-center justify-center gap-2">
                    Comp.
                    {sortConfig.key === 'compatibility' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                 </div>
              </th>
              <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground text-center">Currículo</th>
              <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Tipo</th>
              <th onClick={() => handleSort('phase')} className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground cursor-pointer hover:text-brand-dark transition-colors">
                 <div className="flex items-center gap-2">
                    Fase
                    {sortConfig.key === 'phase' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                 </div>
              </th>
              <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {globalLoading ? (
              <tr>
                <td colSpan={12} className="px-6 py-24 text-center">
                   <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-brand-bg border-t-brand-coral rounded-full animate-spin"></div>
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Processando talentos...</p>
                   </div>
                </td>
              </tr>
            ) : sortedCandidates.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-6 py-24 text-center">
                   <div className="flex flex-col items-center gap-4">
                      <UserX size={48} className="text-muted-foreground/30" />
                      <p className="text-sm font-bold text-muted-foreground">Nenhum candidato localizado nos filtros atuais.</p>
                   </div>
                </td>
              </tr>
            ) : sortedCandidates.map((c) => (
              <tr key={c.id} className={cn(
                "hover:bg-brand-bg/30 transition-all group",
                selectedCandidates.includes(c.id) && "bg-brand-coral/5 hover:bg-brand-coral/10"
              )}>
                {/* 0. Selection */}
                <td className="px-6 py-5 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-border/50 text-brand-coral focus:ring-brand-coral cursor-pointer"
                    checked={selectedCandidates.includes(c.id)}
                    onChange={() => handleSelectCandidate(c.id)}
                  />
                </td>
                {/* 1. Data de Entrada */}
                <td className="px-6 py-5 whitespace-nowrap">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black text-brand-dark">
                         {c.latestApplication ? format(new Date(c.latestApplication.entryDate), 'dd/MM/yyyy') : 'Não localizei'}
                      </span>
                      {c.latestApplication && (
                         <span className="text-[10px] font-medium text-muted-foreground uppercase">
                            {format(new Date(c.latestApplication.entryDate), 'HH:mm')}
                         </span>
                      )}
                   </div>
                </td>

                {/* 2. Canal */}
                <td className="px-6 py-5">
                   <div className="flex flex-col gap-1">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-center border",
                        c.latestApplication?.channel === 'Indicação' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-brand-bg text-brand-dark border-border/50'
                      )}>
                         {c.latestApplication?.channel || 'Não localizei'}
                      </span>
                      {c.latestApplication?.channel === 'Indicação' && c.latestApplication.whoIndicated && (
                         <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-80 pl-1">
                            De: {c.latestApplication.whoIndicated}
                         </span>
                      )}
                   </div>
                </td>

                {/* 3. Nome e idade */}
                <td className="px-6 py-5">
                   <div className="flex flex-col">
                      <span className={cn(
                        "text-sm font-black text-brand-dark group-hover:text-brand-coral transition-colors leading-tight",
                        c.isAnonymous && "italic opacity-50"
                      )}>
                         {(() => {
                           const parts = (c.name || '').trim().split(/\s+/);
                           if (parts.length <= 1) return c.name;
                           return `${parts[0]} ${parts[parts.length - 1]}`;
                         })()}
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                         {typeof c.calculatedAge === 'number' ? `${c.calculatedAge} anos` : c.calculatedAge}
                      </span>
                   </div>
                </td>

                {/* 4. Contato */}
                <td className="px-6 py-5">
                   <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 group/phone">
                         <div className="p-1.5 bg-brand-bg rounded-lg text-brand-dark">
                            <Phone size={12} />
                         </div>
                         <span className="text-[11px] font-bold text-brand-dark">{c.phone || 'Não localizei'}</span>
                         <button 
                          onClick={() => handleCopyPhone(c.phone)}
                          className="p-1.5 text-muted-foreground hover:text-brand-coral/80 opacity-0 group-hover/phone:opacity-100 transition-all"
                         >
                            <Copy size={10} />
                         </button>
                      </div>
                      {c.email && (
                         <div className="flex items-center gap-2 overflow-hidden">
                            <div className="p-1.5 bg-brand-bg rounded-lg text-brand-dark shrink-0">
                               <Calendar size={12} />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[120px]">{c.email}</span>
                         </div>
                      )}
                   </div>
                </td>

                {/* 5. Localização */}
                <td className="px-6 py-5">
                   <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-brand-coral opacity-50" />
                      <span className="text-xs font-bold text-brand-dark">{c.city || 'Não localizei'}</span>
                   </div>
                </td>

                {/* 6. Vaga */}
                <td className="px-6 py-5">
                   <div className="flex flex-col gap-1">
                      {c.latestJob ? (
                        <>
                          <span className="text-xs font-black text-brand-dark uppercase tracking-tight">
                             {c.latestJob.title}
                          </span>
                          {c.latestJob.department && (
                             <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                                {c.latestJob.department}
                             </span>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] font-black uppercase text-muted-foreground/60 mb-1">Associar à Vaga</span>
                           <select 
                            className="text-[10px] p-2 rounded-lg bg-brand-bg/50 border border-border/30 font-bold focus:outline-none focus:ring-1 focus:ring-brand-coral"
                            value="NONE"
                            onChange={(e) => handleAssociateJob(c.id, e.target.value)}
                           >
                              <option value="NONE" disabled>Selecionar Vaga...</option>
                              {jobs.map(j => (
                                <option key={j.id} value={j.id}>{j.title}</option>
                              ))}
                           </select>
                        </div>
                      )}
                   </div>
                </td>

                {/* 7. Experiência na área */}
                <td className="px-6 py-5 text-center">
                   <span className={cn(
                     "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                     c.experienceMatch === 'Sim' ? "bg-emerald-100 text-emerald-700" :
                     c.experienceMatch === 'Parcial' ? "bg-amber-100 text-amber-700" :
                     "bg-rose-100 text-rose-700"
                   )}>
                      {c.experienceMatch}
                   </span>
                </td>

                {/* 8. Compatibilidade */}
                <td className="px-6 py-5">
                   <div className="flex flex-col items-center gap-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-black text-brand-dark">
                          {c.latestApplication ? `${c.latestApplication.compatibilityScore}%` : '---'}
                        </span>
                      </div>
                      {c.latestApplication ? (
                         <div className="w-full max-w-[60px] h-1.5 bg-brand-bg rounded-full overflow-hidden border border-border/30">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-700",
                                c.latestApplication.compatibilityScore >= 75 ? "bg-emerald-500" :
                                c.latestApplication.compatibilityScore >= 45 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${c.latestApplication.compatibilityScore}%` }}
                            />
                         </div>
                      ) : (
                         <span className="text-[8px] font-bold text-muted-foreground uppercase">N/A</span>
                      )}
                   </div>
                </td>

                {/* 9. Currículo */}
                <td className="px-6 py-5 text-center">
                   {c.hasResume || uploadingCandidateId === c.id ? (
                      <div className="flex flex-col items-center gap-1">
                         {uploadingCandidateId === c.id ? (
                           <div className="flex items-center gap-2 text-brand-coral">
                             <div className="w-4 h-4 border-2 border-brand-coral/30 border-t-brand-coral rounded-full animate-spin"></div>
                             <span className="text-[9px] font-black animate-pulse uppercase">Enviando</span>
                           </div>
                         ) : (
                           <button 
                            onClick={() => {
                              const doc = allDocs.find(d => d.candidateId === c.id && d.category === 'Currículo');
                              if (doc) setViewingDocument(doc);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all text-center w-full justify-center"
                           >
                              <Eye size={12} />
                              Ver
                           </button>
                         )}
                      </div>
                   ) : (
                      <div className="flex flex-col items-center">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-bg text-brand-dark border border-border/50 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-brand-coral hover:bg-white cursor-pointer transition-all">
                          <Upload size={12} />
                          Subir
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".pdf,.doc,.docx,.png,.jpeg,.jpg,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,text/plain"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadResume(c.id, file);
                            }}
                          />
                        </label>
                      </div>
                   )}
                </td>

                {/* 10. Tipo de inscrição */}
                <td className="px-6 py-5">
                   <div className="relative group/type">
                      {c.applicationCount > 1 ? (
                         <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl cursor-default">
                            <AlertCircle size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Já se cadastrou</span>
                         </div>
                      ) : (
                         <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl cursor-default">
                            <CheckCircle2 size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Novo</span>
                         </div>
                      )}
                      
                      {c.applicationCount > 1 && (
                         <div className="absolute bottom-full left-0 mb-2 w-64 bg-brand-dark text-white p-4 rounded-2xl shadow-2xl z-20 invisible group-hover/type:visible opacity-0 group-hover/type:opacity-100 transition-all duration-300">
                             <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-brand-coral border-b border-white/10 pb-2">Histórico de Inscrições</p>
                             <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                   <span className="opacity-60">Total de Inscrições</span>
                                   <span className="font-bold">{c.applicationCount}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                   <span className="opacity-60">Última Vaga</span>
                                   <span className="font-bold">{c.latestJob?.title}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                   <span className="opacity-60">Último Status</span>
                                   <span className="font-bold">{c.latestApplication?.currentStatus}</span>
                                </div>
                             </div>
                         </div>
                      )}
                   </div>
                </td>

                {/* 11. Fase */}
                <td className="px-6 py-5">
                   <select 
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border outline-none cursor-pointer focus:ring-4 focus:ring-brand-coral/20 transition-all",
                      getPhaseColor(c.latestApplication?.currentPhase || '')
                    )}
                    value={c.latestApplication?.currentPhase}
                    onChange={(e) => c.latestApplication && handleUpdatePhase(c.latestApplication.id, e.target.value as ApplicationPhase)}
                    onClick={(e) => e.stopPropagation()}
                   >
                      {Object.values(ApplicationPhase).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                   </select>
                </td>

                <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-1">
                      <Link 
                        href={`/candidates/${c.id}`}
                        className="p-2 text-muted-foreground hover:text-brand-dark hover:bg-brand-bg rounded-xl transition-all"
                        title="Ver Detalhes"
                      >
                        <ArrowUpRight size={20} />
                      </Link>
                      
                      <button 
                        onClick={() => { setEditingCandidate(c); setIsModalOpen(true); }}
                        className="p-2 text-muted-foreground hover:text-brand-dark hover:bg-brand-bg rounded-xl transition-all"
                        title="Editar Cadastro"
                      >
                        <Edit2 size={18} />
                      </button>

                      <button 
                        className="p-2 text-muted-foreground hover:text-brand-dark hover:bg-brand-bg rounded-xl transition-all"
                        title="Agendar Entrevista"
                      >
                        <Calendar size={18} />
                      </button>

                      <button 
                        onClick={() => setConfirmDelete(c.id)}
                        className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Excluir Candidato"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals - Same as before */}
      {isModalOpen && (
        <CandidateModal 
          candidate={editingCandidate}
          onClose={() => setIsModalOpen(false)}
          onSave={async (data) => {
            if (editingCandidate) {
              triggerUndoableAction({
                type: 'update_candidate',
                description: `Dados de ${editingCandidate.name} atualizados`,
                data: {
                  candidateId: editingCandidate.id,
                  originalData: editingCandidate
                }
              });
              await updateCandidate(editingCandidate.id, data);
            } else {
              await addCandidate(data);
            }
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal 
          title="Excluir Candidato?"
          message="Todos os dados, inscrições e documentos vinculados a este candidato serão removidos. Esta ação pode ser desfeita clicando em Desfazer ou usando Ctrl+Z."
          onConfirm={async () => {
            const candidateToDelete = candidates.find(c => c.id === confirmDelete);
            if (candidateToDelete) {
              const relatedApps = applications.filter(a => a.candidateId === confirmDelete);
              const relatedDocs = allDocs.filter(d => d.candidateId === confirmDelete);
              
              triggerUndoableAction({
                type: 'delete',
                description: `Candidato ${candidateToDelete.name} excluído`,
                data: {
                  candidate: candidateToDelete,
                  applications: relatedApps,
                  documents: relatedDocs
                }
              });
            }
            await deleteCandidate(confirmDelete);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
          variant="danger"
          confirmText="Sim, Excluir"
        />
      )}

      {confirmAnonymize && (
        <ConfirmModal 
          title="Anonimizar Candidato?"
          message="Os dados pessoais (Nome, E-mail, Telefone) serão substituídos por informações genéricas para proteger a privacidade, mas as experiências e histórico serão mantidos. Esta ação pode ser desfeita clicando em Desfazer ou usando Ctrl+Z."
          onConfirm={async () => {
            const origCandidate = candidates.find(c => c.id === confirmAnonymize);
            if (origCandidate) {
              triggerUndoableAction({
                type: 'anonymize',
                description: `Candidato ${origCandidate.name} anonimizado`,
                data: {
                  candidateId: confirmAnonymize,
                  originalData: origCandidate
                }
              });
            }
            await anonymizeCandidate(confirmAnonymize);
            setConfirmAnonymize(null);
          }}
          onCancel={() => setConfirmAnonymize(null)}
          variant="warning"
          confirmText="Sim, Anonimizar"
        />
      )}

      {viewingDocument && (
        <DocumentViewer 
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
          onDelete={async (id) => {
            await db.deleteDocument(id);
            const docsData = await db.listAllDocuments();
            setAllDocs(docsData);
            setViewingDocument(null);
          }}
        />
      )}

      {/* Bulk Actions Floating Bar */}
      <AnimatePresence>
        {selectedCandidates.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#073F3A] text-white rounded-3xl shadow-2xl p-4 lg:p-5 flex items-center gap-8 border border-white/10"
          >
            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 bg-[#F49A9D] rounded-2xl flex items-center justify-center font-black text-[#073F3A]">
                {selectedCandidates.length}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase tracking-tight">Candidatos</span>
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Selecionados</span>
              </div>
            </div>

            <div className="h-10 w-px bg-white/10" />

            <div className="flex items-center gap-3 pr-2">
              <button 
                onClick={() => {
                  console.log("Opening bulk phase modal");
                  setShowBulkPhaseModal(true);
                }}
                disabled={bulkActionLoading}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 border border-white/5 hover:border-white/10"
              >
                {bulkActionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <History size={16} className="text-[#F49A9D]" />
                )}
                Alterar Fase
              </button>
              <button 
                onClick={() => {
                  setShowBulkDeleteConfirm(true);
                }}
                disabled={bulkActionLoading}
                className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 hover:bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 border border-rose-500/20 group"
              >
                {bulkActionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 size={16} className="text-rose-400 group-hover:text-white transition-colors" />
                )}
                Excluir em Massa
              </button>
              <button 
                onClick={() => setSelectedCandidates([])}
                className="p-3 hover:bg-white/10 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Phase Modal */}
      <AnimatePresence>
        {showBulkPhaseModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#073F3A]/40 backdrop-blur-sm" 
              onClick={() => !bulkActionLoading && setShowBulkPhaseModal(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-[#073F3A] mb-1">Alterar Fase</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {selectedCandidates.length} Candidatos Selecionados
                  </p>
                </div>
                <button onClick={() => setShowBulkPhaseModal(false)} className="p-2 hover:bg-brand-bg rounded-xl transition-all">
                  <X size={24} className="text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {Object.values(ApplicationPhase).map((phase) => (
                  <button
                    key={phase}
                    onClick={() => handleBulkUpdatePhase(phase)}
                    disabled={bulkActionLoading}
                    className="flex items-center justify-between p-5 rounded-2xl bg-brand-bg hover:bg-[#073F3A] hover:text-white transition-all group border border-transparent hover:border-[#073F3A]/10 disabled:opacity-50"
                  >
                    <span className="text-sm font-black uppercase tracking-tight">{phase}</span>
                    {bulkActionLoading ? (
                      <div className="w-4 h-4 border-2 border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 size={18} className="text-muted-foreground group-hover:text-[#F49A9D] transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Bulk Delete Confirm Modal */}
      {showBulkDeleteConfirm && (
        <ConfirmModal 
          onCancel={() => setShowBulkDeleteConfirm(false)}
          onConfirm={() => {
            handleBulkDelete();
            setShowBulkDeleteConfirm(false);
          }}
          title="Exclusão em Massa"
          message={`Tem certeza que deseja excluir permanentemente ${selectedCandidates.length} candidatos selecionados? Esta ação poderá ser desfeita usando o botão superior ou o comando Ctrl+Z.`}
          confirmText="Sim, Excluir Todos"
        />
      )}

      {/* Floating Undo notification toast/banner with active countdown bar */}
      <AnimatePresence>
        {showUndoToast && undoAction && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 right-8 z-[120] bg-brand-dark text-white rounded-2xl shadow-2xl p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 border border-white/10 max-w-sm w-full font-sans"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="w-10 h-10 bg-[#F49A9D] text-brand-dark rounded-xl flex items-center justify-center font-bold">
                <History size={20} />
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#F49A9D]">Ação realizada</p>
                <p className="text-xs font-bold text-white/90 truncate">{undoAction.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-3 md:mt-0 justify-end">
              <button 
                onClick={handleUndo}
                className="px-4 py-2 bg-[#F49A9D] hover:bg-[#F49A9D]/90 text-brand-dark text-xs font-black transition-all rounded-xl shadow-lg flex items-center gap-1 shrink-0"
              >
                Desfazer
                <span className="hidden md:inline opacity-60 text-[10px] bg-brand-dark/10 px-1 py-0.5 rounded ml-1">Ctrl+Z</span>
              </button>
              <button 
                onClick={handleUndoClose}
                className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Visual timer line indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-2xl overflow-hidden">
              <motion.div 
                key={undoAction.timestamp}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 15, ease: "linear" }}
                className="h-full bg-[#F49A9D]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
