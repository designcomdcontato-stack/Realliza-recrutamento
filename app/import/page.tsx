'use client';
import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Upload, Download, 
  CheckCircle2, AlertCircle, Info,
  Search, Trash2, ArrowRight, Save,
  X, HelpCircle, Table as TableIcon
} from 'lucide-react';
import { db } from '@/database/db';
import { ApplicationPhase, ApplicationStatus, Gender, Job, AppSettings } from '@/types';
import { cn } from '@/lib/utils';
import { historyService } from '@/services/historyService';
import { compatibilityService } from '@/services/compatibilityService';

interface SpreadsheetRow {
  [key: string]: string;
}

export default function ImportPage() {
  const [inputText, setInputText] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isImporting, setIsImporting] = useState(false);
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [vaga, setVaga] = useState('');
  const [canal, setCanal] = useState('');

  const fields = [
    { id: 'name', label: 'Nome Completo', required: true },
    { id: 'gender', label: 'Sexo' },
    { id: 'phone', label: 'Telefone' },
    { id: 'email', label: 'E-mail' },
    { id: 'city', label: 'Cidade' },
    { id: 'birthDate', label: 'Data de Nascimento' },
    { id: 'age', label: 'Idade' },
    { id: 'experience', label: 'Última Experiência' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const [jobsData, settingsData] = await Promise.all([
        db.listJobs(),
        db.getSettings()
      ]);
      setJobs(jobsData);
      setSettings(settingsData);
      if (settingsData && settingsData.channels.length > 0) {
        setCanal(settingsData.channels[0].name);
      }
    };
    fetchData();
  }, []);

  const handleProcessText = () => {
    if (!inputText.trim()) return;
    
    const lines = inputText.trim().split('\n');
    if (lines.length < 1) return;
    
    const headers = lines[0].split('\t');
    const dataLines = lines.slice(1);
    
    const parsedRows = dataLines.map(line => {
      const values = line.split('\t');
      const row: SpreadsheetRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    setColumns(headers);
    setRows(parsedRows);
    
    // Auto-map based on common names
    const newMapping: Record<string, string> = {};
    headers.forEach(h => {
      const lower = h.toLowerCase();
      if (lower.includes('nome')) newMapping[h] = 'name';
      if (lower.includes('sexo') || lower.includes('genero')) newMapping[h] = 'gender';
      if (lower.includes('tel') || lower.includes('whats') || lower.includes('cel')) newMapping[h] = 'phone';
      if (lower.includes('email')) newMapping[h] = 'email';
      if (lower.includes('cidade')) newMapping[h] = 'city';
      if (lower.includes('nasc')) newMapping[h] = 'birthDate';
      if (lower.includes('idade')) newMapping[h] = 'age';
      if (lower.includes('exper')) newMapping[h] = 'experience';
    });
    
    setMapping(newMapping);
    setStep(2);
  };

  const handleImport = async () => {
    if (!vaga) {
      alert('Selecione uma vaga para os candidatos.');
      return;
    }
    
    setIsImporting(true);
    let successCount = 0;

    try {
      for (const row of rows) {
        try {
          const getMappedValue = (fieldId: string) => {
            const col = Object.keys(mapping).find(h => mapping[h] === fieldId);
            return col ? row[col] : '';
          };

          const name = getMappedValue('name');
          if (!name) continue;

          const candidate = await db.createCandidate({
            name,
            normalizedName: name.toUpperCase(),
            gender: (getMappedValue('gender').toLowerCase().includes('m') ? Gender.MALE : Gender.FEMALE) as Gender,
            phone: getMappedValue('phone') || 'Não localizado',
            whatsapp: getMappedValue('phone') || 'Não localizado',
            email: getMappedValue('email') || 'Não localizado',
            city: getMappedValue('city') || 'Não localizado',
            birthDate: getMappedValue('birthDate'),
            age: parseInt(getMappedValue('age')) || 0,
            experiences: [getMappedValue('experience') || 'Não localizado'],
            observations: 'Importado via Planilha',
            origin: 'Importação'
          });

          const selectedJob = jobs.find(j => j.id === vaga);
          const { compatibilityService } = await import('@/services/compatibilityService');
          const compResult = selectedJob ? compatibilityService.calculateCandidateJobCompatibility(candidate, selectedJob) : null;

          const app = await db.createApplication({
            candidateId: candidate.id,
            jobId: vaga,
            channel: canal,
            currentPhase: ApplicationPhase.NEW,
            currentStatus: ApplicationStatus.NEW,
            responsible: 'Administrador',
            entryDate: new Date().toISOString(),
            observations: 'Inscrição via Importação de Planilha',
            compatibilityScore: compResult?.score || 50,
            compatibilityLevel: compResult?.level || 'Média',
            compatibilityReasons: compResult?.explanation || 'Importado via planilha de terceiros.',
            matchedKeywords: compResult?.matchedKeywords || [],
            missingKeywords: compResult?.missingKeywords || [],
            partialMatches: compResult?.partialMatches || [],
            compatibilityExplanation: compResult?.explanation || "",
            compatibilityCalculatedAt: new Date().toISOString(),
            experienceInArea: compResult?.experienceInArea,
            origin: 'Importação de planilha'
          });

          if (compResult) {
            historyService.logCompatibilityCalculated(candidate.id, app.id, compResult.score, compResult.level).catch(e => console.warn(e));
          }

          historyService.logCandidateCreation(candidate.id, 'Importação').catch(e => console.warn(e));
          successCount++;
        } catch (rowError) {
          console.error("Erro ao importar linha:", rowError);
        }
      }

      alert(`${successCount} candidatos importados com sucesso!`);
      setStep(1);
      setInputText('');
      setRows([]);
    } catch (error) {
      console.error(error);
      alert('Erro ao importar dados.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-brand-dark pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 mb-12">
        <div className="hidden md:block"></div>
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-brand-dark whitespace-nowrap">Importação de Dados</h1>
        </div>
        <div className="hidden md:block"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-4">
           {[
             { id: 1, label: 'Colar Dados', desc: 'Copie do Excel e cole aqui' },
             { id: 2, label: 'Mapear Colunas', desc: 'Associe os campos' },
             { id: 3, label: 'Revisar e Salvar', desc: 'Confirme o destino' }
           ].map(s => (
             <div key={s.id} className={cn(
               "p-6 rounded-[24px] border transition-all relative overflow-hidden",
               step === s.id ? "bg-white border-brand-coral shadow-xl shadow-brand-coral/5" : "bg-white/50 border-border opacity-50"
             )}>
               <div className="relative z-10">
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black mb-4",
                    step === s.id ? "bg-brand-coral text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {s.id}
                  </span>
                  <h3 className="font-extrabold text-brand-dark">{s.label}</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{s.desc}</p>
               </div>
               {step === s.id && <div className="absolute top-0 right-0 w-24 h-24 bg-brand-coral/5 rounded-full -mr-12 -mt-12" />}
             </div>
           ))}
        </div>

        <div className="md:col-span-3 space-y-8">
           {step === 1 && (
             <div className="bg-white rounded-[40px] shadow-2xl border border-border/50 p-10 space-y-8 animate-in slide-in-from-right-8 duration-500">
                <div className="bg-brand-bg/50 p-6 rounded-3xl flex items-center gap-4 text-brand-dark font-medium border border-border/30">
                  <div className="p-3 bg-white rounded-xl shadow-sm text-brand-secondary">
                    <TableIcon size={24} />
                  </div>
                  <p>Abra sua planilha, selecione as linhas (incluindo o cabeçalho), copie (Ctrl+C) e cole no campo abaixo.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">CONTEÚDO DA PLANILHA</label>
                  <textarea 
                    rows={12}
                    placeholder="Copie e cole aqui seus dados..."
                    className="w-full p-6 rounded-3xl border border-border focus:ring-4 focus:ring-brand-coral/10 outline-none transition-all text-xs font-mono bg-[#FAF9F6] shadow-inner"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={handleProcessText}
                    disabled={!inputText.trim()}
                    className="px-10 py-4 bg-brand-dark text-white rounded-2xl font-extrabold flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-brand-dark/20 disabled:opacity-50"
                  >
                    Próxima Etapa
                    <ArrowRight size={20} />
                  </button>
                </div>
             </div>
           )}

           {step === 2 && (
             <div className="bg-white rounded-[40px] shadow-2xl border border-border/50 p-10 space-y-8 animate-in slide-in-from-right-8 duration-500">
                <h2 className="text-2xl font-extrabold tracking-tight">Mapeamento de Colunas</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   {fields.map(field => (
                     <div key={field.id} className="space-y-2 p-4 rounded-2xl border border-border/50 bg-brand-bg/20">
                        <label className="text-[10px] font-black uppercase text-brand-coral tracking-widest block ml-1">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <select 
                          className="w-full px-4 py-2.5 rounded-xl border border-border outline-none focus:ring-4 focus:ring-brand-coral/10 text-xs bg-white font-bold"
                          value={Object.keys(mapping).find(k => mapping[k] === field.id) || ''}
                          onChange={(e) => {
                            const newMapping = { ...mapping };
                            // Remove existing mapping for this field if any
                            Object.keys(newMapping).forEach(k => {
                              if (newMapping[k] === field.id) delete newMapping[k];
                            });
                            if (e.target.value) newMapping[e.target.value] = field.id;
                            setMapping(newMapping);
                          }}
                        >
                          <option value="">(Não importar)</option>
                          {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                     </div>
                   ))}
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-border/50">
                   <button onClick={() => setStep(1)} className="font-bold text-muted-foreground hover:text-brand-dark">Voltar</button>
                   <button 
                    onClick={() => setStep(3)}
                    className="px-10 py-4 bg-brand-dark text-white rounded-2xl font-extrabold flex items-center gap-2"
                   >
                     Continuar
                     <ArrowRight size={20} />
                   </button>
                </div>
             </div>
           )}

           {step === 3 && (
             <div className="bg-white rounded-[40px] shadow-2xl border border-border/50 p-10 space-y-8 animate-in slide-in-from-right-8 duration-500">
                <h2 className="text-2xl font-extrabold tracking-tight">Revisão do Destino</h2>

                <div className="grid grid-cols-2 gap-8 p-8 bg-brand-bg/30 rounded-[32px] border border-border/50">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Vaga de Destino</label>
                    <select className="w-full px-5 py-3.5 rounded-2xl border border-border outline-none focus:ring-4 focus:ring-brand-coral/10 text-sm bg-white font-bold" value={vaga} onChange={(e) => setVaga(e.target.value)}>
                      <option value="">Selecione a vaga...</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>{j.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Canal</label>
                    <select className="w-full px-5 py-3.5 rounded-2xl border border-border outline-none focus:ring-4 focus:ring-brand-coral/10 text-sm bg-white font-bold" value={canal} onChange={(e) => setCanal(e.target.value)}>
                      {settings?.channels.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-brand-bg/50 p-8 rounded-[32px] border border-border/50">
                  <div className="flex items-center gap-4 mb-4">
                     <CheckCircle2 size={32} className="text-emerald-500" />
                     <div>
                        <p className="text-lg font-black">{rows.length} Candidatos detectados</p>
                        <p className="text-sm text-muted-foreground font-medium">As colunas foram mapeadas com sucesso.</p>
                     </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-border/50">
                   <button onClick={() => setStep(2)} className="font-bold text-muted-foreground hover:text-brand-dark">Corrigir colunas</button>
                   <button 
                    onClick={handleImport}
                    disabled={isImporting || !vaga}
                    className="px-12 py-5 bg-brand-secondary text-white rounded-2xl font-black shadow-xl shadow-brand-secondary/20 hover:-translate-y-1 transition-all disabled:opacity-50"
                   >
                     {isImporting ? 'IMPORTANDO...' : 'FINALIZAR IMPORTAÇÃO'}
                   </button>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
