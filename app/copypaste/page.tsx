'use client';
import React, { useState, useEffect } from 'react';
import { 
  ClipboardPaste, List, FileText, 
  Search, CheckCircle2, 
  Trash2, Info, RotateCcw, X,
  AlertTriangle, UserPlus, Layers, UserCheck,
  Edit2, Calendar, Phone, Mail, MapPin, User, Sparkles
} from 'lucide-react';
import { copyPasteParserService, ParsedCandidate } from '@/services/copyPasteParserService';
import { db } from '@/database/db';
import { ApplicationPhase, ApplicationStatus, Gender, Job, AppSettings, Candidate } from '@/types';
import { cn } from '@/lib/utils';
import { historyService } from '@/services/historyService';
import { compatibilityService } from '@/services/compatibilityService';

export default function CopyPastePage() {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<ParsedCandidate[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [globalVaga, setGlobalVaga] = useState('');
  const [globalCanal, setGlobalCanal] = useState('');
  const [globalLider, setGlobalLider] = useState('Administrador');
  const [globalIndicacao, setGlobalIndicacao] = useState('');
  
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [duplicateCheck, setDuplicateCheck] = useState<{
    index: number;
    candidate: ParsedCandidate;
    matches: Candidate[];
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [jobsData, settingsData] = await Promise.all([
        db.listJobs(),
        db.getSettings()
      ]);
      setJobs(jobsData);
      setSettings(settingsData);
      if (settingsData && settingsData.channels.length > 0) {
        setGlobalCanal(settingsData.channels[0].name);
      }
    };
    fetchData();
  }, []);

  const handleOrganize = () => {
    if (!inputText.trim()) return;
    const parsedList = copyPasteParserService.parseText(inputText);
    setResults(parsedList);
  };

  const handleClear = () => {
    setInputText('');
    setResults([]);
    setEditingIndex(null);
  };

  const handleEditField = (index: number, field: keyof ParsedCandidate, value: any) => {
    const updated = [...results];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate confidence if basic fields change
    updated[index].confidence = copyPasteParserService.calculateConfidence(updated[index]);
    
    setResults(updated);
  };

  const processSave = async (parsed: ParsedCandidate, existingCandidateId?: string) => {
    let candidateId = existingCandidateId;

    try {
      if (!candidateId) {
        const newCand = await db.createCandidate({
          name: parsed.name || 'Sem Nome',
          normalizedName: (parsed.name || 'Sem Nome').toUpperCase(),
          gender: parsed.gender || Gender.UNKNOWN,
          phone: parsed.phone || 'Não localizei',
          whatsapp: parsed.whatsapp || parsed.phone || 'Não localizei',
          email: parsed.email || 'Não localizei',
          city: parsed.city || 'Não localizei',
          birthDate: parsed.birthDate,
          age: parsed.age,
          experiences: [parsed.experience1, parsed.experience2, parsed.experience3].filter(e => e && e !== 'Não localizei') as string[],
          observations: `Candidato importado por lista rápida - Canal: ${globalCanal}${globalCanal === 'Indicação' ? ` (Indicado por: ${globalIndicacao})` : ''}`,
          origin: 'Copia e cola'
        });
        candidateId = newCand.id;
        
        // Log history non-blockingly
        historyService.logCandidateCreation(candidateId, 'Copia e cola').catch(e => console.warn("Erro ao loggar criação de candidato:", e));
      }

      const selectedJob = jobs.find(j => j.id === globalVaga);
      const mockCandidate: Candidate = {
        id: candidateId || '',
        name: parsed.name || '',
        experiences: [parsed.experience1, parsed.experience2, parsed.experience3].filter(Boolean) as string[],
        phone: parsed.phone || '',
        whatsapp: parsed.whatsapp || '',
        email: parsed.email || '',
        normalizedName: (parsed.name || '').toUpperCase(),
        gender: parsed.gender || Gender.UNKNOWN,
        city: parsed.city || '',
        origin: 'Copia e cola',
        observations: '',
        createdAt: '',
        updatedAt: ''
      };

      const compResult = selectedJob ? compatibilityService.calculateCandidateJobCompatibility(mockCandidate, selectedJob) : null;

      const app = await db.createApplication({
        candidateId: candidateId || '',
        jobId: globalVaga,
        channel: globalCanal,
        currentPhase: ApplicationPhase.NEW,
        currentStatus: ApplicationStatus.NEW,
        responsible: globalLider,
        entryDate: new Date().toISOString(),
        observations: `Importação manual via Lista Rápida. ${globalCanal === 'Indicação' ? `Indicação: ${globalIndicacao}` : ''}`,
        compatibilityScore: compResult?.score || 0,
        compatibilityLevel: compResult?.level || 'Média',
        compatibilityReasons: compResult?.explanation || 'Processado via Lista Rápida.',
        matchedKeywords: compResult?.matchedKeywords || [],
        missingKeywords: compResult?.missingKeywords || [],
        partialMatches: compResult?.partialMatches || [],
        experienceInArea: compResult?.experienceInArea,
        compatibilityExplanation: compResult?.explanation || "",
        compatibilityCalculatedAt: new Date().toISOString(),
        origin: 'Copia e cola'
      });

      // Log history non-blockingly
      if (compResult) {
        historyService.logCompatibilityCalculated(candidateId || '', app.id, compResult.score, compResult.level).catch(e => console.warn("Erro ao loggar compatibilidade:", e));
      }
      historyService.logApplicationCreated(candidateId || '', globalVaga).catch(e => console.warn("Erro ao loggar criação de inscrição:", e));
      
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao processar salvamento:", error);
      return { success: false, error: error.message };
    }
  };

  const handleSaveAll = async () => {
    if (results.length === 0 || !globalVaga) {
      alert("Selecione a vaga desejada.");
      return;
    }
    
    if (globalCanal === 'Indicação' && !globalIndicacao.trim()) {
      alert("Por favor, informe quem indicou o candidato.");
      return;
    }

    setIsSaving(true);
    const remaining = [...results];
    let errors: string[] = [];
    
    while (remaining.length > 0) {
      const current = remaining[0];
      
      // Duplicity check by multiple criteria
      const matches = await db.searchDuplicates(current.name || '', current.phone || '');
      // Additional check by email
      if (matches.length === 0 && current.email && current.email !== 'Não localizei') {
         const allCands = await db.listCandidates();
         const byEmail = allCands.find(c => c.email === current.email);
         if (byEmail) matches.push(byEmail);
      }
      
      if (matches.length > 0) {
        setDuplicateCheck({
          index: results.length - remaining.length,
          candidate: current,
          matches
        });
        setIsSaving(false);
        return; // Wait for user decision
      }
      
      const saveResult = await processSave(current);
      if (!saveResult.success) {
        errors.push(`Erro no candidato ${current.name || 'Sem nome'}: ${saveResult.error}`);
      }
      
      remaining.shift();
      setResults([...remaining]);
    }

    if (errors.length > 0) {
      alert(`Processamento finalizado com alguns avisos:\n\n${errors.join('\n')}`);
    } else {
      alert('Todos os candidatos foram cadastrados com sucesso!');
      handleClear();
    }
    setIsSaving(false);
  };

  const resolveDuplicate = async (action: 'NEW_APP' | 'CREATE_ANYWAY' | 'SKIP') => {
    if (!duplicateCheck) return;
    const { candidate, matches } = duplicateCheck;
    
    if (action === 'NEW_APP') {
      await processSave(candidate, matches[0].id);
    } else if (action === 'CREATE_ANYWAY') {
      await processSave(candidate);
    }

    const remaining = results.slice(1);
    setResults(remaining);
    setDuplicateCheck(null);
    
    if (remaining.length > 0) {
      // Small timeout to allow state to sync before next iteration
      setTimeout(() => {
        handleSaveAll();
      }, 100);
    } else {
      alert('Processamento concluído.');
      handleClear();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-brand-dark pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 mb-12">
        <div className="hidden md:block"></div>
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-brand-dark whitespace-nowrap">Copia e Cola Inteligente</h1>
          <p className="text-muted-foreground font-bold mt-2 uppercase tracking-widest text-[10px]">Portal de Importação Estruturada</p>
        </div>
        <div className="hidden md:block"></div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-border/50 overflow-hidden">
        <div className="flex border-b border-border/50 bg-[#FAF9F6]">
            <div className="flex items-center gap-2 px-10 py-6 text-sm font-black border-b-4 border-brand-coral bg-white text-brand-dark uppercase tracking-widest">
              <List size={18} />
              Lista Rápida
            </div>
        </div>

        <div className="p-10 space-y-8">
          <div className="bg-brand-bg/50 p-6 rounded-2xl flex items-center gap-4 text-brand-dark font-medium border border-border/30">
            <div className="p-3 bg-white rounded-xl shadow-sm text-brand-coral">
              <Info size={24} />
            </div>
            <div className="space-y-1">
               <p className="font-black text-xs uppercase tracking-widest text-brand-coral">Dica de Importação</p>
               <p className="text-sm">Você pode colar vários candidatos ao mesmo tempo. Use o formato estruturado com rótulos para melhor detecção.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
               <label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">ÁREA DE TRANSFERÊNCIA</label>
               <span className="text-[10px] font-bold text-muted-foreground bg-brand-bg px-2 py-0.5 rounded uppercase tracking-wider">Suporta vários blocos</span>
            </div>
            <textarea 
              rows={12}
              placeholder="Nome completo: Patrícia Souza Almeida&#10;E-mail: patricia@email.com&#10;Telefone: 11966772145&#10;..."
              className="w-full p-6 rounded-3xl border border-border focus:ring-4 focus:ring-brand-coral/10 outline-none transition-all text-sm font-mono bg-[#FAF9F6] shadow-inner leading-relaxed"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleOrganize}
              className="px-10 py-4 bg-brand-dark text-white rounded-2xl font-extrabold flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-brand-dark/20 hover:-translate-y-1"
            >
              <Search size={22} />
              Organizar e Revisar
            </button>
            <button 
              onClick={handleClear}
              className="px-10 py-4 border border-border rounded-2xl font-extrabold flex items-center gap-2 hover:bg-brand-bg transition-all text-brand-dark/70"
            >
              <RotateCcw size={22} />
              Limpar Texto
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-8 animate-in slide-in-from-top-8 duration-500">
          <div className="bg-white rounded-[40px] shadow-2xl border border-border/50 p-10 space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <div className="flex items-center justify-between border-b border-border/50 pb-8 relative z-10">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Revisão e Cadastro</h2>
                <p className="text-muted-foreground font-medium mt-1">Ajuste os dados se necessário antes de confirmar a importação em massa.</p>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-3xl border border-emerald-100 font-black text-sm uppercase tracking-widest">
                <CheckCircle2 size={20} />
                {results.length} Detectados
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 p-8 bg-brand-bg/30 rounded-[32px] border border-border/30">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 text-brand-coral">Vaga de Destino</label>
                <select className="w-full px-5 py-4 rounded-2xl border border-border/50 outline-none focus:ring-4 focus:ring-brand-coral/10 text-xs bg-white font-black shadow-sm" value={globalVaga} onChange={(e) => setGlobalVaga(e.target.value)}>
                  <option value="">Selecione a vaga...</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 text-brand-coral">Canal de Captação</label>
                <select className="w-full px-5 py-4 rounded-2xl border border-border/50 outline-none focus:ring-4 focus:ring-brand-coral/10 text-xs bg-white font-black shadow-sm" value={globalCanal} onChange={(e) => setGlobalCanal(e.target.value)}>
                  {settings?.channels.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              {globalCanal === 'Indicação' && (
                <div className="space-y-2 animate-in slide-in-from-left-4">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 text-brand-coral">Quem indicou?</label>
                  <input 
                    type="text"
                    className="w-full px-5 py-4 rounded-2xl border border-border/50 outline-none focus:ring-4 focus:ring-brand-coral/10 text-xs bg-white font-black placeholder:text-muted-foreground shadow-sm"
                    placeholder="Nome de quem indicou"
                    value={globalIndicacao}
                    onChange={(e) => setGlobalIndicacao(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 text-brand-coral">Líder Responsável</label>
                <select className="w-full px-5 py-4 rounded-2xl border border-border/50 outline-none focus:ring-4 focus:ring-brand-coral/10 text-xs bg-white font-black shadow-sm" value={globalLider} onChange={(e) => setGlobalLider(e.target.value)}>
                  <option value="Administrador">Administrador</option>
                  <option value="Suporte RH">Suporte RH</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[32px] border border-border/50 max-h-[600px] overflow-y-auto custom-scrollbar shadow-inner bg-white">
              <table className="w-full text-left text-xs whitespace-nowrap border-separate border-spacing-0">
                <thead className="bg-[#FAF9F6] sticky top-0 z-20">
                  <tr>
                    <th className="px-6 py-5 font-black border-b border-border text-[9px] text-muted-foreground uppercase tracking-widest text-center bg-[#FAF9F6]">Match</th>
                    <th className="px-6 py-5 font-black border-b border-border text-[9px] text-muted-foreground uppercase tracking-widest bg-[#FAF9F6]">Nome</th>
                    <th className="px-6 py-5 font-black border-b border-border text-[9px] text-muted-foreground uppercase tracking-widest bg-[#FAF9F6]">Contato</th>
                    <th className="px-6 py-5 font-black border-b border-border text-[9px] text-muted-foreground uppercase tracking-widest bg-[#FAF9F6]">Perfil</th>
                    <th className="px-6 py-5 font-black border-b border-border text-[9px] text-muted-foreground uppercase tracking-widest bg-[#FAF9F6]">1ª Experiência</th>
                    <th className="px-6 py-5 font-black border-b border-border text-[9px] text-muted-foreground uppercase tracking-widest bg-[#FAF9F6]">2ª Experiência</th>
                    <th className="px-6 py-5 font-black border-b border-border text-[9px] text-muted-foreground uppercase tracking-widest bg-[#FAF9F6]">3ª Experiência</th>
                    <th className="px-6 py-5 font-black border-b border-border text-[9px] text-muted-foreground uppercase tracking-widest text-center bg-[#FAF9F6]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {results.map((res, index) => {
                    const selectedJob = jobs.find(j => j.id === globalVaga);
                    const mockCandidate: Candidate = {
                      id: '',
                      name: res.name || '',
                      experiences: [res.experience1, res.experience2, res.experience3].filter(Boolean) as string[],
                      phone: res.phone || '',
                      whatsapp: res.phone || '',
                      email: res.email || '',
                      normalizedName: (res.name || '').toUpperCase(),
                      gender: res.gender || Gender.UNKNOWN,
                      city: res.city || '',
                      origin: 'Copia e cola',
                      observations: '',
                      createdAt: '',
                      updatedAt: ''
                    };
                    const compResult = selectedJob ? compatibilityService.calculateCandidateJobCompatibility(mockCandidate, selectedJob) : null;
                    const isEditing = editingIndex === index;

                    return (
                      <tr key={index} className={cn("group transition-all", isEditing ? "bg-brand-bg/50" : "hover:bg-brand-bg/10")}>
                        <td className="px-6 py-6 text-center align-top">
                          {compResult ? (
                            <div className="flex flex-col items-center gap-1">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black",
                                compResult.level === 'Alta' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                compResult.level === 'Média' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-rose-50 text-rose-500 border border-rose-100"
                              )}>
                                <span className="text-[8px] opacity-60 leading-none">FIT</span>
                                <span className="text-sm leading-none mt-0.5">{compResult.score}%</span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                               <Sparkles size={16} />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-6 align-top">
                          {isEditing ? (
                            <input 
                              className="bg-white border border-border p-2 rounded-lg font-black w-full"
                              value={res.name}
                              onChange={(e) => handleEditField(index, 'name', e.target.value)}
                            />
                          ) : (
                            <div className="space-y-1">
                              <p className="font-black text-brand-dark text-sm">{res.name}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] bg-brand-dark/5 px-2 py-0.5 rounded font-black text-brand-dark uppercase tracking-tighter">{res.gender}</span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-6 align-top">
                           <div className="space-y-1.5">
                              <div className="flex items-center gap-2 group-hover:text-brand-coral transition-colors">
                                 <Phone size={12} className="text-muted-foreground" />
                                 {isEditing ? (
                                   <input className="bg-white border border-border px-2 py-1 rounded font-mono text-[10px]" value={res.phone} onChange={(e) => handleEditField(index, 'phone', e.target.value)} />
                                 ) : <span className="font-bold font-mono tracking-tight">{res.phone}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                 <Mail size={12} className="text-muted-foreground" />
                                 {isEditing ? (
                                   <input className="bg-white border border-border px-2 py-1 rounded text-[10px]" value={res.email} onChange={(e) => handleEditField(index, 'email', e.target.value)} />
                                 ) : <span className="font-medium text-brand-dark/70 italic lowercase truncate max-w-[150px]">{res.email}</span>}
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-6 align-top">
                           <div className="space-y-1.5 text-[10px]">
                              <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-muted-foreground">
                                 <MapPin size={12} />
                                 {isEditing ? (
                                   <input className="bg-white border border-border px-2 py-1 rounded text-[10px]" value={res.city} onChange={(e) => handleEditField(index, 'city', e.target.value)} />
                                 ) : <span className="text-brand-dark/80">{res.city}</span>}
                              </div>
                              <div className="flex items-center gap-2 font-black">
                                 <Calendar size={12} className="text-brand-coral" />
                                 {isEditing ? (
                                   <div className="flex gap-1">
                                      <input className="bg-white border border-border px-2 py-1 rounded text-[10px]" placeholder="DN" value={res.birthDate || ''} onChange={(e) => handleEditField(index, 'birthDate', e.target.value)} />
                                      <input className="bg-white border border-border px-2 py-1 rounded text-[10px]" placeholder="Idade" value={res.age || ''} onChange={(e) => handleEditField(index, 'age', e.target.value)} />
                                   </div>
                                 ) : <span>{res.age} ANOS {res.birthDate && <span className="text-muted-foreground font-medium">({res.birthDate})</span>}</span>}
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-6 align-top max-w-[200px]">
                             {isEditing ? (
                               <textarea className="bg-white border border-border p-2 rounded-lg text-[10px] h-16 w-full" value={res.experience1} onChange={(e) => handleEditField(index, 'experience1', e.target.value)} />
                             ) : <p className="text-[10px] font-medium leading-relaxed italic line-clamp-3 text-brand-dark/70">"{res.experience1}"</p>}
                        </td>
                        <td className="px-6 py-6 align-top max-w-[200px]">
                             {isEditing ? (
                               <textarea className="bg-white border border-border p-2 rounded-lg text-[10px] h-16 w-full" value={res.experience2} onChange={(e) => handleEditField(index, 'experience2', e.target.value)} />
                             ) : <p className="text-[10px] font-medium leading-relaxed italic line-clamp-3 text-brand-dark/70">"{res.experience2}"</p>}
                        </td>
                        <td className="px-6 py-6 align-top max-w-[200px]">
                             {isEditing ? (
                               <textarea className="bg-white border border-border p-2 rounded-lg text-[10px] h-16 w-full" value={res.experience3} onChange={(e) => handleEditField(index, 'experience3', e.target.value)} />
                             ) : <p className="text-[10px] font-medium leading-relaxed italic line-clamp-3 text-brand-dark/70">"{res.experience3}"</p>}
                        </td>
                        <td className="px-6 py-6 text-center align-top">
                           <div className="flex gap-2 justify-center">
                              <button 
                                onClick={() => setEditingIndex(isEditing ? null : index)}
                                className={cn(
                                  "p-2.5 rounded-xl transition-all",
                                  isEditing ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "text-brand-dark hover:bg-brand-bg border border-transparent hover:border-border"
                                )}
                              >
                                 {isEditing ? <CheckCircle2 size={18} /> : <Edit2 size={18} />}
                              </button>
                              <button 
                                onClick={() => setResults(results.filter((_, i) => i !== index))}
                                className="p-2.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all border border-transparent hover:border-rose-100"
                              >
                                <Trash2 size={18} />
                              </button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-8 border-t border-border/50">
               <button onClick={handleClear} className="text-muted-foreground hover:text-brand-dark font-black text-xs uppercase tracking-widest pl-4">Cancelar tudo e recomeçar</button>
               <button 
                onClick={handleSaveAll} 
                disabled={isSaving || !globalVaga} 
                className="px-14 py-5 bg-brand-dark text-white rounded-[24px] font-black flex items-center gap-4 hover:opacity-95 transition-all shadow-2xl shadow-brand-dark/30 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm"
               >
                 <UserCheck size={22} className="text-brand-coral" />
                 {isSaving ? "PROCESSANDO IMPORTAÇÃO..." : `CADASTRAR ${results.length} CANDIDATOS`}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Detection Modal - Refined */}
      {duplicateCheck && (
        <div className="fixed inset-0 bg-brand-dark/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4 font-sans text-brand-dark">
          <div className="bg-white rounded-[44px] w-full max-w-2xl p-12 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />
            
            <div className="flex items-center gap-5 text-amber-600 mb-10 pb-6 border-b border-border/50">
              <div className="p-4 bg-amber-50 rounded-[28px] border border-amber-100">
                <AlertTriangle size={36} />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tight">ALERTA DE DUPLICIDADE</h3>
                <p className="text-amber-800/80 font-bold uppercase tracking-wider text-[10px] mt-1">Este registro parece já existir em nosso banco de dados.</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="bg-brand-bg/50 p-8 rounded-[32px] border border-border/30 relative">
                <div className="absolute top-4 right-4 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Novo Dado</div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-3 tracking-widest">DADOS DETECTADOS NA LISTA:</p>
                <div className="space-y-2">
                   <p className="font-black text-2xl text-brand-dark leading-tight">{duplicateCheck.candidate.name}</p>
                   <div className="flex flex-wrap gap-4 pt-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-brand-secondary"><Phone size={14} /> {duplicateCheck.candidate.phone}</span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-brand-dark/60"><Mail size={14} /> {duplicateCheck.candidate.email}</span>
                   </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] font-black uppercase text-brand-dark/40 tracking-widest ml-1">COMO DESEJA PROSSEGUIR?</p>
                
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => resolveDuplicate('NEW_APP')}
                    className="flex items-center justify-between p-6 rounded-[28px] border-2 border-brand-secondary bg-brand-secondary/5 hover:bg-brand-secondary/10 transition-all group ring-offset-2 ring-brand-secondary/20 hover:ring-4"
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-brand-secondary uppercase tracking-[0.2em] text-[9px] px-2 py-0.5 bg-brand-secondary/10 rounded-full">OPÇÃO RECOMENDADA</p>
                      </div>
                      <p className="font-black text-xl text-brand-dark">Aproveitar Cadastro</p>
                      <p className="text-[11px] font-medium text-muted-foreground mt-1">Vincula esta nova vaga ao perfil que já existe no sistema.</p>
                    </div>
                    <UserPlus size={24} className="text-brand-secondary opacity-40 group-hover:opacity-100 transition-all group-hover:scale-110" />
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => resolveDuplicate('CREATE_ANYWAY')}
                      className="flex flex-col items-start p-6 rounded-[28px] border border-border hover:bg-gray-50 transition-all group text-left"
                    >
                      <p className="font-black text-sm text-brand-dark">Forçar Cadastro</p>
                      <p className="text-[10px] font-medium text-muted-foreground mt-1">Cria um novo registro mesmo assim.</p>
                    </button>

                    <button 
                      onClick={() => resolveDuplicate('SKIP')}
                      className="flex flex-col items-start p-6 rounded-[28px] border border-border hover:bg-rose-50 hover:border-rose-100 transition-all group text-left"
                    >
                      <p className="font-black text-sm text-rose-600">Pular Candidato</p>
                      <p className="text-[10px] font-medium text-rose-400 mt-1">Ignora esta linha e salva os outros.</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <button onClick={() => setDuplicateCheck(null)} className="absolute top-8 right-8 text-muted-foreground hover:text-brand-dark">
               <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
