'use client';
import { useState, useEffect } from 'react';
import { 
  Building, Palette, List, 
  Trash2, Plus, Save, Bell, 
  ShieldCheck, Database, X, GripVertical,
  Users as UsersIcon, Settings as SettingsIcon,
  Layers, CheckSquare, Mail, Search, Edit2,
  FileDown, Upload, FileSpreadsheet, AlertCircle,
  CheckCircle2, Info
} from 'lucide-react';
import { db, localAdapter, supabaseAdapter } from '@/database/db';
import { AppSettings, User, ConfigPhase, ConfigStatus } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';
import * as Papa from 'papaparse';

import { applicationService } from '@/services/applicationService';
import { importSpreadsheetService } from '@/services/importSpreadsheetService';

type SettingsTab = 'empresa' | 'canais' | 'fluxo' | 'usuarios' | 'lideres' | 'setores' | 'importar' | 'database';

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('empresa');
  const [users, setUsers] = useState<User[]>([]);
  const [dbResults, setDbResults] = useState<Record<string, {
    status: 'pending' | 'ok' | 'error';
    error?: string;
    details?: string;
    hint?: string;
    code?: string;
  }>>({});
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [newChannel, setNewChannel] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  useEffect(() => {
    const fetchUsers = async () => {
      const userData = await db.listUsers();
      setUsers(userData);
    };
    fetchUsers();
  }, []);

  const handleSave = async () => {
    if (localSettings) {
      await updateSettings(localSettings);
      alert('Configurações salvas com sucesso!');
    }
  };

  const addChannel = () => {
    if (!newChannel.trim() || !localSettings) return;
    setLocalSettings({
      ...localSettings,
      channels: [
        ...localSettings.channels,
        { id: Math.random().toString(36).substring(7), name: newChannel, active: true, order: localSettings.channels.length }
      ]
    });
    setNewChannel('');
  };

  const addItem = (type: 'leaders' | 'sectors') => {
    if (!newItemName.trim() || !localSettings) return;
    const currentItems = localSettings[type] || [];
    setLocalSettings({
      ...localSettings,
      [type]: [
        ...currentItems,
        { id: Math.random().toString(36).substring(7), name: newItemName, active: true }
      ]
    });
    setNewItemName('');
  };

  const removeItem = (type: 'leaders' | 'sectors', id: string) => {
    if (!localSettings) return;
    const currentItems = localSettings[type] || [];
    setLocalSettings({
      ...localSettings,
      [type]: currentItems.filter(i => i.id !== id)
    });
  };

  const removeChannel = (id: string) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      channels: localSettings.channels.filter(c => c.id !== id)
    });
  };

  const handleDeleteUser = async (id: string) => {
     if (confirm('Deseja realmente remover este usuário?')) {
        await db.deleteUser(id);
        const updated = await db.listUsers();
        setUsers(updated);
     }
  };

  const saveUser = async (userData: Omit<User, 'id' | 'createdAt'>) => {
     if (editingUser) {
        await db.updateUser(editingUser.id, userData);
     } else {
        await db.createUser(userData);
     }
     const updated = await db.listUsers();
     setUsers(updated);
     setIsUserModalOpen(false);
     setEditingUser(null);
  };

  const testSupabase = async () => {
    const { supabase } = await import('@/lib/supabaseClient');
    const tables = [
      { name: 'candidates', label: 'Candidatos' },
      { name: 'applications', label: 'Inscrições' },
      { name: 'jobs', label: 'Vagas' },
      { name: 'channels', label: 'Canais' }, 
      { name: 'stages', label: 'Etapas' }, 
      { name: 'statuses', label: 'Status' }, 
      { name: 'interviews', label: 'Entrevistas' }, 
      { name: 'documents', label: 'Documentos' }, 
      { name: 'history_events', label: 'Histórico' }, 
      { name: 'settings', label: 'Configurações' }, 
      { name: 'app_users', label: 'Usuários' }
    ];
    
    setIsTestingDb(true);
    const results: any = {};
    
    // Test direct connection and variables first
    results['connection'] = { status: 'pending' };
    setDbResults({ ...results });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      results['connection'] = { 
        status: 'error', 
        error: 'Variáveis de ambiente não encontradas.',
        hint: 'Verifique se NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão configurados no Painel de Configurações do AI Studio.' 
      };
    } else {
      results['connection'] = { status: 'ok', details: `Conectado a ${url}` };
    }
    setDbResults({ ...results });
    
    for (const table of tables) {
      results[table.name] = { status: 'pending' };
      setDbResults({ ...results });
      
      try {
        const { data, error, count } = await supabase.from(table.name).select('id', { count: 'exact' }).limit(1);
        
        if (error) {
          results[table.name] = { 
            status: 'error', 
            error: error.message,
            details: error.details,
            hint: error.hint || 'Verifique se a tabela existe e se as políticas RLS permitem leitura.',
            code: error.code
          };
        } else {
          results[table.name] = { 
            status: 'ok',
            details: `${count !== null ? count : 0} registros encontrados.`
          };
        }
      } catch (err: any) {
        results[table.name] = { status: 'error', error: err.message };
      }
      setDbResults({ ...results });
    }
    setIsTestingDb(false);
  };

  const downloadTemplate = () => {
    const headers = ["Nome", "Sexo", "E-mail", "Telefone", "WhatsApp", "Cidade", "Nascimento", "Idade", "Vaga", "Canal", "Líder", "Setor", "Fase", "Vínculo", "Status", "Score", "Experiência", "Experiência na Área", "Observação"];
    const example = ["João da Silva", "Homem", "joao@email.com", "(11) 99999-9999", "(11) 99999-9999", "São Paulo", "10/05/1990", "34", "Vendedor", "Instagram", "Ruth", "Vendas", "Novo", "Ativo", "Novo", "85", "5 anos em vendas", "Sim", "Candidato muito comunicativo"];
    
    const csvContent = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_importacao_realliza.csv";
    link.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportResult(null);
      setImportLog([]);
    }
  };

  const processImport = () => {
    if (!selectedFile || !localSettings) return;

    setImporting(true);
    setImportLog(["Iniciando processamento do arquivo..."]);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await importSpreadsheetService.processRows(results.data, localSettings);
          setImportResult(res);
          setImportLog(prev => [...prev, ...res.details, "Importação finalizada!"]);
        } catch (err) {
          setImportLog(prev => [...prev, "ERRO CRÍTICO: " + (err instanceof Error ? err.message : "Erro desconhecido")]);
        } finally {
          setImporting(false);
          setSelectedFile(null);
        }
      },
      error: (error) => {
        setImportLog(prev => [...prev, "Erro no Parse CSV: " + error.message]);
        setImporting(false);
      }
    });
  };

  if (loading || !localSettings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-dark animate-pulse">
        <SettingsIcon size={48} className="mb-4 opacity-20" />
        <p className="font-bold">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-12 text-brand-dark pb-20 font-sans animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 mb-12">
        <div className="hidden md:block"></div>
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-brand-dark whitespace-nowrap">Configurações</h1>
        </div>
        <div className="flex items-center justify-center md:justify-end">
          <button 
            onClick={handleSave}
            className="px-10 py-4 bg-brand-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-brand-dark/20 hover:-translate-y-1"
          >
            <Save size={18} />
            Salvar Geral
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-white rounded-3xl border border-border/50 shadow-sm overflow-x-auto no-scrollbar">
         {[
           { id: 'empresa', label: 'Empresa & Tema', icon: Building },
           { id: 'canais', label: 'Canais de Entrada', icon: List },
           { id: 'fluxo', label: 'Fases & Status', icon: Layers },
           { id: 'lideres', label: 'Líderes', icon: UsersIcon },
           { id: 'setores', label: 'Setores/Unidades', icon: Building },
           { id: 'usuarios', label: 'Equipe & Acessos', icon: ShieldCheck },
           { id: 'database', label: 'Banco de Dados', icon: Database },
           { id: 'importar', label: 'Importar Dados', icon: FileSpreadsheet },
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as SettingsTab)}
             className={cn(
               "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
               activeTab === tab.id ? "bg-brand-dark text-white shadow-lg" : "text-muted-foreground hover:bg-brand-bg hover:text-brand-dark"
             )}
           >
             <tab.icon size={16} />
             {tab.label}
           </button>
         ))}
      </div>

      <div className="animate-in slide-in-from-bottom-4 duration-500">
         {activeTab === 'empresa' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <section className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                     <Building size={18} className="text-brand-coral" />
                     <h2 className="font-extrabold uppercase text-xs tracking-widest">Identidade Visual</h2>
                  </div>
                  <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm space-y-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Nome da Empresa</label>
                        <input 
                           type="text" 
                           className="w-full px-6 py-4 rounded-2xl bg-brand-bg/30 border border-border focus:ring-4 focus:ring-brand-coral/10 focus:border-brand-coral outline-none text-sm font-bold transition-all" 
                           value={localSettings.companyName} 
                           onChange={e => setLocalSettings({...localSettings, companyName: e.target.value})} 
                        />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Logo da Empresa</label>
                        <div className="flex flex-col gap-4">
                           <div className="flex gap-4 items-end">
                              <div className="flex-1 space-y-3">
                                 <label className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest ml-1 italic">URL ou Base64</label>
                                 <input 
                                    type="text" 
                                    className="w-full px-6 py-4 rounded-2xl bg-brand-bg/30 border border-border focus:ring-4 focus:ring-brand-coral/10 focus:border-brand-coral outline-none text-sm font-bold transition-all" 
                                    placeholder="Ex: https://img.com/logo.png" 
                                    value={localSettings.logo || ''} 
                                    onChange={e => setLocalSettings({...localSettings, logo: e.target.value})} 
                                 />
                              </div>
                              <label className="shrink-0">
                                 <input 
                                    type="file" 
                                    accept="image/png,image/svg+xml,image/jpeg" 
                                    className="hidden" 
                                    onChange={(e) => {
                                       const file = e.target.files?.[0];
                                       if (!file) return;
                                       const reader = new FileReader();
                                       reader.onload = (ev) => {
                                          const base64 = ev.target?.result as string;
                                          setLocalSettings({...localSettings, logo: base64});
                                       };
                                       reader.readAsDataURL(file);
                                    }} 
                                 />
                                 <div className="px-6 py-4 rounded-2xl bg-brand-dark text-white font-black text-[10px] uppercase tracking-widest cursor-pointer hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-brand-dark/10">
                                    <Upload size={16} />
                                    Subir PNG
                                 </div>
                              </label>
                           </div>
                           
                           {localSettings.logo && (
                              <div className="p-4 bg-brand-bg/50 rounded-2xl border border-border/30 flex items-center justify-between group">
                                 <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-xl border border-border p-2 flex items-center justify-center overflow-hidden">
                                       <img src={localSettings.logo} alt="Preview Logo" className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <div>
                                       <p className="text-[10px] font-black uppercase tracking-tight">Prévia do Logo</p>
                                       <p className="text-[10px] text-muted-foreground font-medium truncate w-40">
                                          {localSettings.logo.startsWith('data:') ? 'Arquivo Carregado' : localSettings.logo}
                                       </p>
                                    </div>
                                 </div>
                                 <button 
                                    onClick={() => setLocalSettings({...localSettings, logo: ''})}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                 >
                                    <X size={16} />
                                 </button>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </section>

               <section className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                     <Palette size={18} className="text-brand-coral" />
                     <h2 className="font-extrabold uppercase text-xs tracking-widest">Esquema de Cores</h2>
                  </div>
                  <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm space-y-8">
                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Cor Principal</label>
                           <div className="flex gap-2">
                              <input type="color" className="w-12 h-14 rounded-2xl cursor-pointer p-1" value={localSettings.primaryColor} onChange={e => setLocalSettings({...localSettings, primaryColor: e.target.value})} />
                              <input type="text" className="flex-1 px-4 lg:w-20 rounded-2xl border border-border text-xs font-mono font-black" value={localSettings.primaryColor} onChange={e => setLocalSettings({...localSettings, primaryColor: e.target.value})} />
                           </div>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Cor de Destaque</label>
                           <div className="flex gap-2">
                              <input type="color" className="w-12 h-14 rounded-2xl cursor-pointer p-1" value={localSettings.accentColor} onChange={e => setLocalSettings({...localSettings, accentColor: e.target.value})} />
                              <input type="text" className="flex-1 px-4 lg:w-20 rounded-2xl border border-border text-xs font-mono font-black" value={localSettings.accentColor} onChange={e => setLocalSettings({...localSettings, accentColor: e.target.value})} />
                           </div>
                        </div>
                     </div>
                     <div className="p-8 bg-brand-bg/50 rounded-3xl border border-border/30 flex items-center justify-between">
                        <div className="flex gap-2">
                           <div style={{ backgroundColor: localSettings.primaryColor }} className="w-8 h-8 rounded-xl shadow-lg border-2 border-white" />
                           <div style={{ backgroundColor: localSettings.accentColor }} className="w-8 h-8 rounded-xl shadow-lg border-2 border-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Prévia do Tema</span>
                     </div>
                  </div>
               </section>
            </div>
         )}

         {activeTab === 'canais' && (
            <section className="space-y-8">
               <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                  <List size={18} className="text-brand-coral" />
                  <h2 className="font-extrabold uppercase text-xs tracking-widest">Canais de Aquisição</h2>
               </div>
               <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm space-y-10">
                  <div className="flex flex-col md:flex-row gap-4">
                     <input 
                        className="flex-1 px-6 py-4 rounded-2xl bg-brand-bg/30 border border-border focus:border-brand-coral outline-none text-sm font-bold" 
                        placeholder="Nome do novo canal..." 
                        value={newChannel}
                        onChange={e => setNewChannel(e.target.value)}
                     />
                     <button onClick={addChannel} className="px-10 py-4 bg-brand-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-dark/20">
                        <Plus size={18} />
                        Adicionar Canal
                     </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {localSettings.channels.sort((a,b) => a.order - b.order).map((channel) => (
                        <div key={channel.id} className="flex items-center justify-between p-6 rounded-3xl bg-brand-bg/30 border border-border/30 group hover:border-brand-coral transition-all">
                           <div className="flex items-center gap-3">
                              <GripVertical size={16} className="text-muted-foreground cursor-grab active:cursor-grabbing" />
                              <span className="text-sm font-extrabold">{channel.name}</span>
                           </div>
                           <button onClick={() => removeChannel(channel.id)} className="p-2 opacity-0 group-hover:opacity-100 bg-rose-50 text-rose-500 rounded-xl transition-all hover:bg-rose-100">
                              <Trash2 size={16} />
                           </button>
                        </div>
                     ))}
                  </div>
               </div>
            </section>
         )}

         {activeTab === 'lideres' && (
            <section className="space-y-8">
               <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                  <UsersIcon size={18} className="text-brand-coral" />
                  <h2 className="font-extrabold uppercase text-xs tracking-widest">Gestão de Líderes</h2>
               </div>
               <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm space-y-10">
                  <div className="flex flex-col md:flex-row gap-4">
                     <input 
                        className="flex-1 px-6 py-4 rounded-2xl bg-brand-bg/30 border border-border focus:border-brand-coral outline-none text-sm font-bold" 
                        placeholder="Nome do líder..." 
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addItem('leaders')}
                     />
                     <button onClick={() => addItem('leaders')} className="px-10 py-4 bg-brand-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-dark/20">
                        <Plus size={18} />
                        Adicionar Líder
                     </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {(localSettings.leaders || []).map((leader) => (
                        <div key={leader.id} className="flex items-center justify-between p-6 rounded-3xl bg-brand-bg/30 border border-border/30 group hover:border-brand-coral transition-all">
                           <span className="text-sm font-extrabold">{leader.name}</span>
                           <button onClick={() => removeItem('leaders', leader.id)} className="p-2 opacity-0 group-hover:opacity-100 bg-rose-50 text-rose-500 rounded-xl transition-all hover:bg-rose-100">
                              <Trash2 size={16} />
                           </button>
                        </div>
                     ))}
                  </div>
                  {(localSettings.leaders || []).length > 0 && (
                     <div className="pt-6 border-t border-border/10 flex justify-end">
                        <button onClick={handleSave} className="px-8 py-3 bg-brand-dark text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90">
                           <Save size={16} /> Salvar Líderes
                        </button>
                     </div>
                  )}
               </div>
            </section>
         )}

         {activeTab === 'setores' && (
            <section className="space-y-8">
               <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                  <Building size={18} className="text-brand-coral" />
                  <h2 className="font-extrabold uppercase text-xs tracking-widest">Setores / Unidades</h2>
               </div>
               <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm space-y-10">
                  <div className="flex flex-col md:flex-row gap-4">
                     <input 
                        className="flex-1 px-6 py-4 rounded-2xl bg-brand-bg/30 border border-border focus:border-brand-coral outline-none text-sm font-bold" 
                        placeholder="Nome do setor ou unidade..." 
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addItem('sectors')}
                     />
                     <button onClick={() => addItem('sectors')} className="px-10 py-4 bg-brand-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-dark/20">
                        <Plus size={18} />
                        Adicionar Setor
                     </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {(localSettings.sectors || []).map((sector) => (
                        <div key={sector.id} className="flex items-center justify-between p-6 rounded-3xl bg-brand-bg/30 border border-border/30 group hover:border-brand-coral transition-all">
                           <span className="text-sm font-extrabold">{sector.name}</span>
                           <button onClick={() => removeItem('sectors', sector.id)} className="p-2 opacity-0 group-hover:opacity-100 bg-rose-50 text-rose-500 rounded-xl transition-all hover:bg-rose-100">
                              <Trash2 size={16} />
                           </button>
                        </div>
                     ))}
                  </div>
                  {(localSettings.sectors || []).length > 0 && (
                     <div className="pt-6 border-t border-border/10 flex justify-end">
                        <button onClick={handleSave} className="px-8 py-3 bg-brand-dark text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90">
                           <Save size={16} /> Salvar Setores
                        </button>
                     </div>
                  )}
               </div>
            </section>
         )}

         {activeTab === 'usuarios' && (
            <section className="space-y-8">
               <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                     <UsersIcon size={18} className="text-brand-coral" />
                     <h2 className="font-extrabold uppercase text-xs tracking-widest">Gestão de Equipe</h2>
                  </div>
                  <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="text-[10px] font-black uppercase text-brand-coral tracking-widest flex items-center gap-1 hover:underline">
                     <Plus size={14} /> Novo Usuário
                  </button>
               </div>
               
               <div className="bg-white rounded-[40px] border border-border/50 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-brand-bg/50 border-b border-border/50">
                           <tr>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-50">Usuário</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-50">Role</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-50">Status</th>
                              <th className="px-8 py-5"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                           {users.map(user => (
                              <tr key={user.id} className="hover:bg-brand-bg/20 transition-all group">
                                 <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-xl bg-brand-dark text-white flex items-center justify-center font-black text-xs">
                                          {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                       </div>
                                       <div>
                                          <p className="font-extrabold text-sm">{user.name}</p>
                                          <p className="text-xs text-muted-foreground font-medium">{user.email}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6">
                                    <span className="text-xs font-black uppercase px-3 py-1 bg-brand-bg rounded-lg border border-border/50">
                                       {user.role}
                                    </span>
                                 </td>
                                 <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                       <div className={cn("w-2 h-2 rounded-full", user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-rose-400')} />
                                       <span className="text-xs font-bold">{user.status}</span>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                       <button 
                                          onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} 
                                          className="p-2.5 text-muted-foreground hover:text-brand-dark hover:bg-brand-bg rounded-xl transition-all"
                                          title="Editar Usuário"
                                       >
                                          <Edit2 size={18} />
                                       </button>
                                       <button 
                                          onClick={() => handleDeleteUser(user.id)} 
                                          className="p-2.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                          title="Remover Usuário"
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
               </div>
            </section>
         )}

         {activeTab === 'importar' && (
            <section className="space-y-8 animate-in fade-in duration-500">
               <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                  <FileSpreadsheet size={18} className="text-brand-coral" />
                  <h2 className="font-extrabold uppercase text-xs tracking-widest">Importação Masiva de Dados</h2>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                     <div className="bg-white p-8 rounded-[40px] border border-border/50 shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-brand-bg/50 rounded-xl flex items-center justify-center text-brand-coral">
                              <Info size={20} />
                           </div>
                           <h3 className="font-extrabold text-brand-dark">Instruções</h3>
                        </div>
                        <ul className="space-y-4">
                           {[
                              { label: "1. Baixe o Modelo", desc: "Use o arquivo oficial para evitar erros de leitura." },
                              { label: "2. Preencha os Campos", desc: "Nome, Telefone e Vaga são fundamentais." },
                              { label: "3. Fases, Vínculo e Status", desc: "Você pode subir candidatos direto para 'Entrevista' ou 'Colaboradores' com vínculo 'Ativo'." },
                              { label: "4. Líderes e Setores", desc: "Certifique-se que os nomes de Líder e Setor na planilha existem nas suas configurações." }
                           ].map((step, idx) => (
                              <li key={idx} className="space-y-1">
                                 <p className="text-[10px] font-black uppercase text-brand-coral tracking-wider">{step.label}</p>
                                 <p className="text-xs text-muted-foreground font-medium">{step.desc}</p>
                              </li>
                           ))}
                        </ul>
                        <button 
                           onClick={downloadTemplate}
                           className="w-full py-4 bg-brand-bg hover:bg-brand-bg/80 border border-border rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                           <FileDown size={16} />
                           Baixar Modelo CSV
                        </button>
                     </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm space-y-10 min-h-[400px] flex flex-col items-center justify-center text-center">
                        {!importResult && !importing && (
                           <>
                              <div className="w-24 h-24 bg-brand-bg/30 rounded-[32px] flex items-center justify-center text-brand-coral mb-6">
                                 <Upload size={40} />
                              </div>
                              <div className="max-w-xs space-y-2 mb-8">
                                 <h3 className="text-xl font-black tracking-tight">Seleção de Arquivo</h3>
                                 <p className="text-sm text-muted-foreground font-medium">Arraste seu arquivo CSV ou clique no botão abaixo para começar.</p>
                              </div>
                              
                              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                                 <label className="w-full">
                                    <input 
                                       type="file" 
                                       accept=".csv" 
                                       className="hidden" 
                                       onChange={handleFileChange}
                                    />
                                    <div className="w-full py-5 px-8 bg-brand-bg border-2 border-dashed border-border rounded-3xl cursor-pointer hover:border-brand-coral hover:bg-brand-coral/5 transition-all group">
                                       <span className="text-xs font-black uppercase tracking-widest text-brand-dark flex items-center justify-center gap-2">
                                          {selectedFile ? selectedFile.name : 'Selecionar Arquivo CSV'}
                                       </span>
                                    </div>
                                 </label>

                                 {selectedFile && (
                                    <button 
                                       onClick={processImport}
                                       className="w-full py-5 bg-brand-dark text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-brand-dark/20 hover:opacity-90 transition-all"
                                    >
                                       Iniciar Importação Agora
                                    </button>
                                 )}
                              </div>
                           </>
                        )}

                        {importing && (
                           <div className="space-y-8 w-full max-w-md">
                              <div className="flex flex-col items-center gap-6">
                                 <div className="relative">
                                    <div className="w-20 h-20 border-4 border-brand-coral/10 border-t-brand-coral rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                       <FileSpreadsheet size={24} className="text-brand-coral" />
                                    </div>
                                 </div>
                                 <div className="text-center">
                                    <h3 className="text-lg font-black tracking-tight">Processando Dados...</h3>
                                    <p className="text-xs text-muted-foreground font-medium mt-1">Estamos validando e salvando seus candidatos de forma segura.</p>
                                 </div>
                              </div>
                              
                              <div className="bg-brand-dark/95 p-6 rounded-3xl text-left h-48 overflow-y-auto font-mono text-[10px] space-y-1 text-emerald-400">
                                 {importLog.map((log, i) => (
                                    <div key={i} className="flex gap-2">
                                       <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
                                       <span>{log}</span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {importResult && !importing && (
                           <div className="w-full space-y-10 animate-in zoom-in duration-300">
                              <div className="flex flex-col items-center text-center gap-4">
                                 <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                                    <CheckCircle2 size={32} />
                                 </div>
                                 <div>
                                    <h3 className="text-2xl font-black tracking-tight">Importação Concluída!</h3>
                                    <p className="text-sm text-muted-foreground font-medium">Resumo do processamento realizado.</p>
                                 </div>
                              </div>

                              <div className="grid grid-cols-3 gap-6">
                                 <div className="p-6 bg-brand-bg/50 rounded-3xl border border-border/30">
                                    <p className="text-[10px] font-black uppercase text-brand-dark/40 tracking-widest mb-1">Candidatos Novos</p>
                                    <p className="text-3xl font-black text-brand-dark">{importResult.imported}</p>
                                 </div>
                                 <div className="p-6 bg-brand-bg/50 rounded-3xl border border-border/30">
                                    <p className="text-[10px] font-black uppercase text-brand-dark/40 tracking-widest mb-1">Duplicados/Vinculados</p>
                                    <p className="text-3xl font-black text-brand-coral">{importResult.duplicates}</p>
                                 </div>
                                 <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100">
                                    <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-1">Erros/Incompletos</p>
                                    <p className="text-3xl font-black text-rose-600">{importResult.errors}</p>
                                 </div>
                              </div>

                              <div className="bg-brand-dark p-6 rounded-3xl text-left h-32 overflow-y-auto font-mono text-[10px] text-white/60">
                                 {importLog.slice(-50).map((log, i) => (
                                    <div key={i}>{log}</div>
                                 ))}
                              </div>

                              <button 
                                 onClick={() => setImportResult(null)}
                                 className="px-12 py-5 bg-brand-dark text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-brand-dark/20 hover:opacity-90 transition-all"
                              >
                                 Finalizar e Voltar
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </section>
         )}

         {activeTab === 'fluxo' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <section className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                     <Layers size={18} className="text-brand-coral" />
                     <h2 className="font-extrabold uppercase text-xs tracking-widest">Fases do Pipeline</h2>
                  </div>
                  <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm space-y-6">
                     <div className="flex items-center gap-3 p-4 bg-brand-bg/50 border border-dashed border-border rounded-2xl justify-center text-muted-foreground italic text-sm">
                        Em breve: Customize a ordem e nomes das fases.
                     </div>
                     <div className="space-y-3">
                        {localSettings.phases.map(p => (
                           <div key={p.id} className="flex items-center justify-between p-5 rounded-2xl bg-brand-bg/20 border border-border/30">
                              <span className="text-sm font-extrabold tracking-tight">{p.name}</span>
                              <div style={{ backgroundColor: p.color }} className="w-4 h-4 rounded-full shadow-sm" />
                           </div>
                        ))}
                     </div>
                  </div>
               </section>

               <section className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                     <CheckSquare size={18} className="text-brand-coral" />
                     <h2 className="font-extrabold uppercase text-xs tracking-widest">Status Personalizados</h2>
                  </div>
                  <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm space-y-6">
                     <div className="flex items-center gap-3 p-4 bg-brand-bg/50 border border-dashed border-border rounded-2xl justify-center text-muted-foreground italic text-sm">
                        Em breve: Adicione seus próprios status de triagem.
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        {localSettings.statuses.map(s => (
                           <div key={s.id} className="flex items-center gap-2 p-4 rounded-2xl border border-border/30 bg-brand-bg/20">
                              <div style={{ backgroundColor: s.color }} className="w-3 h-3 rounded-full" />
                              <span className="text-xs font-bold truncate">{s.name}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               </section>
            </div>
         )}

         {activeTab === 'database' && (
            <div className="grid grid-cols-1 gap-12 animate-in fade-in duration-500">
               <section className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                     <Database size={18} className="text-brand-coral" />
                     <h2 className="font-extrabold uppercase text-xs tracking-widest">Diagnóstico do Banco de Dados</h2>
                  </div>
                  
                  <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm space-y-10">
                     <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-border/10">
                        <div className="space-y-1">
                           <h3 className="font-black text-lg">Teste de Conexão Supabase</h3>
                           <p className="text-sm text-muted-foreground font-medium">Verifique se todas as tabelas estão acessíveis e configuradas corretamente.</p>
                        </div>
                        <button 
                           onClick={testSupabase}
                           disabled={isTestingDb}
                           className={cn(
                              "px-10 py-5 bg-brand-dark text-white rounded-3xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-brand-dark/20 hover:opacity-90 transition-all",
                              isTestingDb && "opacity-50 cursor-not-allowed"
                           )}
                        >
                           {isTestingDb ? "Diagnosticando..." : "Iniciar Diagnóstico"}
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(dbResults).map(([key, res]) => (
                           <div key={key} className="p-6 rounded-3xl bg-brand-bg/30 border border-border/30 space-y-3 transition-all hover:border-brand-coral/30">
                              <div className="flex items-center justify-between">
                                 <span className="font-black text-xs uppercase tracking-widest">{key}</span>
                                 {res.status === 'ok' ? (
                                    <div className="flex items-center gap-1 text-emerald-500 font-black text-[10px] uppercase">
                                       <CheckCircle2 size={14} /> OK
                                    </div>
                                 ) : res.status === 'error' ? (
                                    <div className="flex items-center gap-1 text-rose-500 font-black text-[10px] uppercase">
                                       <AlertCircle size={14} /> ERRO
                                    </div>
                                 ) : (
                                    <div className="w-4 h-4 border-2 border-brand-coral/20 border-t-brand-coral rounded-full animate-spin" />
                                 )}
                              </div>
                              
                              {res.details && <p className="text-[10px] font-medium text-muted-foreground leading-tight">{res.details}</p>}
                              
                              {res.error && (
                                 <div className="space-y-2 p-3 bg-rose-50 rounded-xl border border-rose-100 mt-2 overflow-hidden">
                                    <p className="text-[10px] font-bold text-rose-600 leading-tight break-words">{res.error}</p>
                                    {res.code && <p className="text-[9px] font-mono opacity-60">Código: {res.code}</p>}
                                    {res.hint && (
                                       <div className="p-2 bg-white rounded-lg border border-rose-200 mt-2">
                                          <p className="text-[9px] font-bold text-brand-dark opacity-70 mb-1 tracking-widest uppercase">Sugestão / Hint:</p>
                                          <p className="text-[9px] text-brand-dark leading-normal">{res.hint}</p>
                                       </div>
                                    )}
                                 </div>
                              )}
                           </div>
                        ))}
                        {Object.keys(dbResults).length === 0 && !isTestingDb && (
                           <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground/40 italic">
                              <Database size={48} className="mb-4 opacity-20" />
                              <p className="text-sm font-medium">Clique no botão para iniciar o diagnóstico completo.</p>
                           </div>
                        )}
                     </div>
                  </div>
               </section>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-brand-dark">
                  <section className="space-y-6">
                     <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                        <ShieldCheck size={18} className="text-brand-coral" />
                        <h2 className="font-extrabold uppercase text-xs tracking-widest">Configuração do Provedor</h2>
                     </div>
                     <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm space-y-8">
                        <div className="p-6 bg-brand-bg/30 rounded-3xl border border-border/30 space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-widest opacity-50">Provedor Ativo</span>
                              <span className="px-4 py-1.5 bg-brand-dark text-white rounded-full text-[10px] font-black uppercase">
                                 {localStorage.getItem('database_provider_override') === 'local' ? 'LocalStorage (Browser)' : 
                                  localStorage.getItem('database_provider_override') === 'supabase' ? 'Supabase (Nuvem)' :
                                  (process.env.NEXT_PUBLIC_DATABASE_PROVIDER || 'local')}
                              </span>
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-widest opacity-50">Conexão com Supabase</span>
                              <div className="flex items-center gap-2">
                                 <div className={cn("w-2 h-2 rounded-full", supabaseAdapter ? "bg-emerald-500" : "bg-rose-400")} />
                                 <span className="text-xs font-extrabold">{supabaseAdapter ? "Disponível" : "Indisponível"}</span>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Alternar Provedor Manualmente</label>
                           <div className="grid grid-cols-2 gap-3">
                              <button 
                                 onClick={() => {
                                    localStorage.setItem('database_provider_override', 'local');
                                    window.location.reload();
                                 }}
                                 className={cn(
                                    "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all",
                                    localStorage.getItem('database_provider_override') === 'local' ? "bg-brand-dark text-white border-brand-dark" : "bg-white border-border hover:bg-brand-bg"
                                 )}
                              >
                                 Forçar Local
                              </button>
                              <button 
                                 onClick={() => {
                                    if (!supabaseAdapter) {
                                       alert("Atenção: Supabase não parece estar configurado no ambiente.");
                                    }
                                    localStorage.setItem('database_provider_override', 'supabase');
                                    window.location.reload();
                                 }}
                                 className={cn(
                                    "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all",
                                    localStorage.getItem('database_provider_override') === 'supabase' || (!localStorage.getItem('database_provider_override') && process.env.NEXT_PUBLIC_DATABASE_PROVIDER === 'supabase') ? "bg-brand-dark text-white border-brand-dark" : "bg-white border-border hover:bg-brand-bg"
                                 )}
                              >
                                 Forçar Nuvem
                              </button>
                           </div>
                        </div>

                        {!supabaseAdapter && (
                           <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex gap-4">
                              <AlertCircle className="text-amber-500 shrink-0" size={24} />
                              <div className="space-y-1">
                                 <p className="text-sm font-black text-amber-900">Supabase não configurado</p>
                                 <p className="text-xs text-amber-800/70 font-medium">Configure as variáveis no AI Studio para ativar a nuvem.</p>
                              </div>
                           </div>
                        )}
                     </div>
                  </section>

                  <section className="space-y-6">
                     <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                        <Layers size={18} className="text-brand-coral" />
                        <h2 className="font-extrabold uppercase text-xs tracking-widest">Migração (Local → Supabase)</h2>
                     </div>
                     <div className="bg-white p-10 rounded-[40px] border border-border/50 shadow-sm space-y-6">
                        <p className="text-sm text-muted-foreground font-medium">Envie seus dados locais para o banco de dados Supabase na nuvem.</p>
                        
                        <button 
                           onClick={async () => {
                              if (!supabaseAdapter) {
                                 alert("Supabase não configurado corretamente.");
                                 return;
                              }
                              if (!confirm("Isso irá copiar todos os seus dados locais para o Supabase. Deseja continuar?")) return;
                              
                              try {
                                 setImporting(true);
                                 setImportLog(["Iniciando migração..."]);
                                 
                                 // Candidates
                                 const candidates = await localAdapter.listCandidates();
                                 setImportLog(prev => [...prev, `Migrando ${candidates.length} candidatos...`]);
                                 for (const c of candidates) {
                                    await supabaseAdapter.createCandidate(c);
                                 }

                                 // Jobs
                                 const jobs = await localAdapter.listJobs();
                                 setImportLog(prev => [...prev, `Migrando ${jobs.length} vagas...`]);
                                 for (const j of jobs) {
                                    await supabaseAdapter.createJob(j);
                                 }

                                 // Applications
                                 const apps = await localAdapter.listApplications();
                                 setImportLog(prev => [...prev, `Migrando ${apps.length} inscrições...`]);
                                 for (const a of apps) {
                                    await supabaseAdapter.createApplication(a);
                                 }

                                 setImportLog(prev => [...prev, "Migração concluída com sucesso!"]);
                                 alert("Migração finalizada!");
                                 window.location.reload();
                              } catch (err: any) {
                                 console.error(err);
                                 setImportLog(prev => [...prev, `ERRO: ${err.message}`]);
                                 alert("Erro durante a migração. Verifique o console.");
                              } finally {
                                 setImporting(false);
                              }
                           }}
                           disabled={!supabaseAdapter || importing}
                           className="w-full py-5 bg-brand-dark text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-dark/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                           <Database size={18} />
                           Migrar Dados Agora
                        </button>

                        <button 
                           onClick={() => {
                              localStorage.removeItem('database_provider_override');
                              window.location.reload();
                           }}
                           className="w-full py-3 text-[10px] font-black uppercase text-muted-foreground hover:text-brand-dark transition-all"
                        >
                           Limpar Override e Usar Default
                        </button>
                     </div>
                  </section>
               </div>
            </div>
          )}
      </div>

      {/* User Modal */}
      {isUserModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-dark/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
               <div className="p-10 space-y-8">
                  <div className="flex justify-between items-center">
                     <h3 className="text-2xl font-extrabold tracking-tight">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                     <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-brand-bg rounded-xl transition-all">
                        <X size={20} />
                     </button>
                  </div>
                  
                  <form className="space-y-6" onSubmit={(e) => {
                     e.preventDefault();
                     const formData = new FormData(e.currentTarget);
                     saveUser({
                        name: formData.get('name') as string,
                        email: formData.get('email') as string,
                        role: formData.get('role') as any,
                        position: formData.get('position') as string,
                        status: formData.get('status') as any || 'Ativo',
                     });
                  }}>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest ml-1">Nome Completo</label>
                        <input name="name" defaultValue={editingUser?.name} required className="w-full px-6 py-4 rounded-2xl bg-brand-bg/50 border border-border outline-none focus:border-brand-coral font-bold text-sm" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest ml-1">E-mail Corporativo</label>
                        <input name="email" type="email" defaultValue={editingUser?.email} required className="w-full px-6 py-4 rounded-2xl bg-brand-bg/50 border border-border outline-none focus:border-brand-coral font-bold text-sm" />
                        <p className="text-[10px] text-amber-600 font-bold leading-normal mt-1 block">
                           💡 Para permitir o login, crie também este e-mail em Supabase &gt; Authentication &gt; Users.
                        </p>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest ml-1">Nível de Acesso</label>
                           <select name="role" defaultValue={editingUser?.role || 'RH'} className="w-full px-6 py-4 rounded-2xl bg-brand-bg/50 border border-border outline-none focus:border-brand-coral font-bold text-sm">
                              <option value="RH">RH</option>
                              <option value="Administrador">Administrador</option>
                              <option value="Líder">Líder</option>
                              <option value="Visualizador">Visualizador</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest ml-1">Status</label>
                           <select name="status" defaultValue={editingUser?.status || 'Ativo'} className="w-full px-6 py-4 rounded-2xl bg-brand-bg/50 border border-border outline-none focus:border-brand-coral font-bold text-sm">
                              <option value="Ativo">Ativo</option>
                              <option value="Inativo">Inativo</option>
                           </select>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest ml-1">Cargo</label>
                        <input name="position" defaultValue={editingUser?.position} className="w-full px-6 py-4 rounded-2xl bg-brand-bg/50 border border-border outline-none focus:border-brand-coral font-bold text-sm" />
                     </div>
                     
                     <div className="pt-6 flex gap-4">
                        <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 bg-brand-bg hover:bg-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-brand-dark text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-dark/20 hover:opacity-90 transition-all">Salvar Usuário</button>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      )}

      {/* Danger Zone */}
      <section className="pt-20">
        <div className="bg-rose-50 border border-rose-100 rounded-[40px] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-8 text-center md:text-left">
            <div className="w-20 h-20 bg-brand-dark rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-brand-dark/30">
              <Database size={40} />
            </div>
            <div>
              <h4 className="text-2xl font-extrabold text-brand-dark">Manutenção de Dados</h4>
              <p className="text-brand-dark/70 font-medium max-w-sm mt-1">Recalcule a compatibilidade de todos os candidatos ou limpe o banco de dados local.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={async () => {
                const confirmed = confirm('Deseja recalcular a compatibilidade de TODOS os candidatos inscritos? Isso pode levar alguns segundos.');
                if (confirmed) {
                  try {
                    await applicationService.recalculateAll();
                    alert('Recalculo concluído com sucesso em todas as inscrições!');
                    window.location.reload();
                  } catch (err) {
                    alert('Erro ao recalcular: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
                  }
                }
              }}
              className="px-12 py-5 bg-brand-dark text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-2xl shadow-brand-dark/20"
            >
              Recalcular Compatibilidades
            </button>
            <button 
              onClick={() => {
                if (confirm('TEM CERTEZA? Todos os dados (candidatos, vagas, configurações) serão APAGADOS permanentemente do seu navegador.')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="px-12 py-5 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-2xl shadow-rose-600/20"
            >
              Resetar Tudo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
