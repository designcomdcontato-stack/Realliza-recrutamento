'use client';
import React, { useState, useEffect } from 'react';
import { X, Save, User, MapPin, Phone, Mail, Calendar, Briefcase, Info } from 'lucide-react';
import { Candidate, Gender } from '@/types';
import { cn } from '@/lib/utils';

interface CandidateModalProps {
  candidate?: Candidate;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export function CandidateModal({ candidate, onClose, onSave }: CandidateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    gender: Gender.UNKNOWN,
    birthDate: '',
    age: '',
    city: 'Mogi Guaçu',
    phone: '',
    whatsapp: '',
    email: '',
    experiences: ['', '', ''],
    observations: '',
    origin: 'Manual'
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (candidate) {
      setFormData({
        name: candidate.name,
        gender: candidate.gender,
        birthDate: candidate.birthDate || '',
        age: String(candidate.age || ''),
        city: candidate.city,
        phone: candidate.phone,
        whatsapp: candidate.whatsapp,
        email: candidate.email,
        experiences: [
          candidate.experiences[0] || '',
          candidate.experiences[1] || '',
          candidate.experiences[2] || ''
        ],
        observations: candidate.observations,
        origin: candidate.origin
      });
    }
  }, [candidate]);

  const handleBirthDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, birthDate: date }));
    if (date) {
      const birth = new Date(date);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      setFormData(prev => ({ ...prev, age: String(age) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...formData,
        normalizedName: formData.name.toUpperCase(),
        experiences: formData.experiences.filter(exp => exp.trim() !== '')
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-sans text-brand-dark overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-8 py-6 border-b border-border/50 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              candidate ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
            )}>
              <User size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{candidate ? 'Editar Candidato' : 'Novo Candidato'}</h2>
              <p className="text-sm text-muted-foreground">{candidate ? 'Atualize as informações do perfil.' : 'Preencha os dados básicos do talento.'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-6">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <Info size={16} />
                Dados Pessoais
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5 ml-1">NOME COMPLETO</label>
                  <input 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50 transition-all"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5 ml-1">SEXO</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50 bg-white"
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value as Gender})}
                    >
                      {Object.values(Gender).map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5 ml-1">CIDADE</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50"
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5 ml-1">DATA NASC. <Calendar size={12} className="inline ml-1" /></label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50"
                      value={formData.birthDate}
                      onChange={e => handleBirthDateChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5 ml-1">IDADE</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50"
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <Phone size={16} />
                Contato
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5 ml-1">E-MAIL <Mail size={12} className="inline ml-1" /></label>
                  <input 
                    type="email"
                    className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5 ml-1">TELEFONE</label>
                    <input 
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5 ml-1">WHATSAPP</label>
                    <input 
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50"
                      value={formData.whatsapp}
                      onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5 ml-1">ORIGEM</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50 bg-white"
                    value={formData.origin}
                    onChange={e => setFormData({...formData, origin: e.target.value})}
                  >
                    <option value="Manual">Manual</option>
                    <option value="Indicação">Indicação</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Catho">Catho</option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-6">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <Briefcase size={16} />
                Últimas Experiências
              </h3>
              <div className="space-y-3">
                {formData.experiences.map((exp, idx) => (
                  <div key={idx}>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1 ml-1">{idx + 1}ª EXPERIÊNCIA</label>
                    <input 
                      placeholder="Empresa - Cargo (Duração)"
                      className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50"
                      value={exp}
                      onChange={e => {
                        const newExp = [...formData.experiences];
                        newExp[idx] = e.target.value;
                        setFormData({...formData, experiences: newExp});
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <Info size={16} />
                Observações Adicionais
              </h3>
              <textarea 
                rows={7}
                className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-brand-coral/50 resize-none"
                placeholder="Detalhes relevantes sobre o candidato..."
                value={formData.observations}
                onChange={e => setFormData({...formData, observations: e.target.value})}
              />
            </section>
          </div>

          <div className="flex gap-4 pt-6 sticky bottom-0 bg-white py-4 border-t border-border/50">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-8 py-4 border border-border rounded-2xl font-bold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 px-8 py-4 bg-brand-dark text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={20} />
                  {candidate ? 'Salvar Alterações' : 'Cadastrar Candidato'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
