import { supabase } from '../lib/supabaseClient';
import { 
  Candidate, Job, Application, HistoryEvent, 
  CandidateDocument, User, AppSettings,
  ApplicationPhase, ApplicationStatus, JobStatus,
  Interview, Gender
} from "../types";
import { DatabaseAdapter } from "./dbInterface";

export class SupabaseDatabaseAdapter implements DatabaseAdapter {
  private mapCandidate(data: any): Candidate {
    const experiences = Array.isArray(data.experiences) ? data.experiences : [];
    
    // Fallback: if experiences is empty but experience_1/2/3 have data
    if (experiences.length === 0) {
      if (data.experience_1) experiences.push(data.experience_1);
      if (data.experience_2) experiences.push(data.experience_2);
      if (data.experience_3) experiences.push(data.experience_3);
    }

    return {
      id: data.id,
      name: data.name || "Não localizado",
      normalizedName: data.normalized_name || "",
      gender: data.gender || Gender.UNKNOWN,
      birthDate: data.birth_date,
      age: data.age,
      city: data.city || "Não localizado",
      phone: data.phone || "",
      whatsapp: data.whatsapp || "",
      email: data.email || "",
      experiences: experiences,
      observations: data.observations || "",
      origin: data.origin || "Manual",
      isAnonymous: data.is_anonymous,
      originalText: data.original_text,
      parsingConfidence: data.parsing_confidence,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapJob(data: any): Job {
    return {
      id: data.id,
      title: data.title || "Sem título",
      description: data.description || "",
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      mandatoryKeywords: Array.isArray(data.required_keywords) ? data.required_keywords : [],
      desirableKeywords: Array.isArray(data.desirable_keywords) ? data.desirable_keywords : [],
      valuedExperiences: Array.isArray(data.valued_experiences) ? data.valued_experiences : [],
      status: data.status || JobStatus.DRAFT,
      responsible: data.responsible || "Não localizado",
      responsibleId: data.responsible_id,
      department: data.department || "",
      compatibilityKeywords: data.compatibility_keywords || {
        key_1: data.keyword_1 || '',
        key_2: data.keyword_2 || '',
        key_3: data.keyword_3 || '',
        key_4: data.keyword_4 || '',
        key_5: data.keyword_5 || '',
      },
      createdAt: data.created_at
    };
  }

  private mapApplication(data: any): Application {
    return {
      id: data.id,
      candidateId: data.candidate_id,
      jobId: data.job_id,
      channel: data.channel || "Direto",
      whoIndicated: data.referred_by || data.who_indicated || "",
      currentPhase: data.stage || ApplicationPhase.NEW,
      currentStatus: data.status || ApplicationStatus.NEW,
      responsible: data.responsible || "Sem responsável",
      entryDate: data.entry_date,
      interviewDate: data.interview_date,
      interviewTime: data.interview_time,
      observations: data.observations || "",
      origin: data.origin || "",
      compatibilityScore: data.compatibility_score || 0,
      compatibilityLevel: data.compatibility_level || "Baixa",
      compatibilityReasons: data.compatibility_reasons || "",
      matchedKeywords: data.matched_keywords || [],
      missingKeywords: data.missing_keywords || [],
      partialMatches: data.partial_matches || [],
      compatibilityExplanation: data.compatibility_explanation || "",
      compatibilityCalculatedAt: data.compatibility_calculated_at,
      experienceInArea: data.experience_in_area || "",
      compatibilityDetails: data.compatibility_details,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapInterview(data: any): Interview {
    return {
      id: data.id,
      candidateId: data.candidate_id,
      applicationId: data.application_id,
      jobId: data.job_id,
      date: data.date,
      time: data.time,
      responsible: data.responsible || "Não definido",
      status: data.status || "Agendada",
      type: data.type || "Presencial",
      feedback: data.feedback || "",
      observations: data.observations || "",
      createdAt: data.created_at
    };
  }

  private mapHistoryEvent(data: any): HistoryEvent {
    return {
      id: data.id,
      candidateId: data.candidate_id,
      applicationId: data.application_id,
      user: data.user_name || "Sistema",
      userId: data.user_id,
      type: data.event_type || "Criação",
      description: data.description || "",
      title: data.title,
      action: data.action,
      details: data.details,
      metadata: data.metadata,
      previousValue: data.previous_value,
      newValue: data.new_value,
      createdAt: data.created_at
    };
  }

  private mapDocument(data: any): CandidateDocument {
    return {
      id: data.id,
      candidateId: data.candidate_id,
      fileName: data.file_name || "Arquivo",
      fileType: data.file_type || "application/octet-stream",
      fileFormat: data.file_format || "PDF",
      fileSize: data.file_size || 0,
      category: data.category || "Outros",
      observations: data.observations || "",
      user: data.user_name || "Sistema",
      contentUrl: data.content_url || "",
      createdAt: data.created_at
    };
  }

  private mapUser(data: any): User {
    return {
      id: data.id,
      name: data.name || "Usuário",
      email: data.email || "",
      role: data.role || "RH",
      position: data.position || "",
      status: data.status || "Ativo",
      createdAt: data.created_at
    };
  }

  async listCandidates(): Promise<Candidate[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Falha ao listCandidates:", error);
      throw error;
    }
    return (data || []).map(this.mapCandidate);
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
       console.error(`Falha ao getCandidate(${id}):`, error);
       throw error;
    }
    return data ? this.mapCandidate(data) : undefined;
  }

  async createCandidate(data: Omit<Candidate, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Candidate> {
    const experiences = data.experiences || [];
    const insertData: any = {
      name: data.name || "Não localizado",
      normalized_name: data.normalizedName || "",
      gender: data.gender || Gender.UNKNOWN,
      birth_date: data.birthDate,
      age: data.age,
      city: data.city || "Não localizado",
      phone: data.phone || "",
      whatsapp: data.whatsapp || "",
      email: data.email || "",
      experiences: experiences,
      experience_1: experiences[0] || null,
      experience_2: experiences[1] || null,
      experience_3: experiences[2] || null,
      observations: data.observations || "",
      origin: data.origin || "Manual",
      is_anonymous: data.isAnonymous,
      original_text: data.originalText,
      parsing_confidence: data.parsingConfidence
    };

    if (data.id) insertData.id = data.id;

    const { data: created, error } = await supabase
      .from('candidates')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
       console.error("Falha ao createCandidate no Supabase:", {
         table: 'candidates',
         payload: insertData,
         error: error.message,
         details: error.details,
         hint: error.hint
       });
       throw error;
    }
    return this.mapCandidate(created);
  }

  async updateCandidate(id: string, data: Partial<Candidate>): Promise<Candidate> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name || "Não localizado";
    if (data.normalizedName !== undefined) updateData.normalized_name = data.normalizedName;
    if (data.gender !== undefined) updateData.gender = data.gender || Gender.UNKNOWN;
    if (data.birthDate !== undefined) updateData.birth_date = data.birthDate;
    if (data.age !== undefined) updateData.age = data.age;
    if (data.city !== undefined) updateData.city = data.city || "Não localizado";
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp;
    if (data.email !== undefined) updateData.email = data.email;
    
    if (data.experiences !== undefined) {
      const experiences = data.experiences || [];
      updateData.experiences = experiences;
      updateData.experience_1 = experiences[0] || null;
      updateData.experience_2 = experiences[1] || null;
      updateData.experience_3 = experiences[2] || null;
    }
    
    if (data.observations !== undefined) updateData.observations = data.observations;
    if (data.origin !== undefined) updateData.origin = data.origin;
    if (data.isAnonymous !== undefined) updateData.is_anonymous = data.isAnonymous;
    if (data.originalText !== undefined) updateData.original_text = data.originalText;
    if (data.parsingConfidence !== undefined) updateData.parsing_confidence = data.parsingConfidence;

    const { data: updated, error } = await supabase
      .from('candidates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
       console.error(`Falha ao updateCandidate(${id}) no Supabase:`, {
         table: 'candidates',
         id,
         payload: updateData,
         error: error.message,
         details: error.details
       });
       throw error;
    }
    return this.mapCandidate(updated);
  }

  async deleteCandidate(id: string): Promise<void> {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);
    
    if (error) {
       console.error(`Falha ao deleteCandidate(${id}):`, error);
       throw error;
    }
  }

  async bulkDeleteCandidates(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .in('id', ids);
    
    if (error) {
       console.error("Falha ao bulkDeleteCandidates:", error);
       throw error;
    }
  }

  async searchDuplicates(name: string, phone: string): Promise<Candidate[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .or(`name.ilike.%${name}%,phone.eq.${phone}`);
    
    if (error) {
       console.error("Falha ao searchDuplicates:", error);
       throw error;
    }
    return (data || []).map(this.mapCandidate);
  }

  async listJobs(): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Falha ao listJobs no Supabase:", error);
      throw error;
    }
    return (data || []).map(this.mapJob);
  }

  async getJob(id: string): Promise<Job | undefined> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error(`Falha ao getJob(${id}):`, error);
      throw error;
    }
    return data ? this.mapJob(data) : undefined;
  }

  async createJob(data: Omit<Job, "id" | "createdAt"> & { id?: string }): Promise<Job> {
    const insertData: any = {
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      required_keywords: data.mandatoryKeywords,
      desirable_keywords: data.desirableKeywords,
      valued_experiences: data.valuedExperiences,
      status: data.status,
      responsible: data.responsible,
      responsible_id: data.responsibleId,
      department: data.department || "",
      compatibility_keywords: data.compatibilityKeywords
    };

    if (data.id) insertData.id = data.id;

    const { data: created, error } = await supabase
      .from('jobs')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
       console.error("Falha ao createJob no Supabase:", error);
       throw error;
    }
    return this.mapJob(created);
  }

  async updateJob(id: string, data: Partial<Job>): Promise<Job> {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.requirements !== undefined) updateData.requirements = data.requirements;
    if (data.mandatoryKeywords !== undefined) updateData.required_keywords = data.mandatoryKeywords;
    if (data.desirableKeywords !== undefined) updateData.desirable_keywords = data.desirableKeywords;
    if (data.valuedExperiences !== undefined) updateData.valued_experiences = data.valuedExperiences;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.responsible !== undefined) updateData.responsible = data.responsible;
    if (data.responsibleId !== undefined) updateData.responsible_id = data.responsibleId;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.compatibilityKeywords !== undefined) updateData.compatibility_keywords = data.compatibilityKeywords;

    const { data: updated, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
       console.error(`Falha ao updateJob(${id}) no Supabase:`, error);
       throw error;
    }
    return this.mapJob(updated);
  }

  async deleteJob(id: string): Promise<void> {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);
    
    if (error) {
       console.error(`Falha ao deleteJob(${id}):`, error);
       throw error;
    }
  }

  async listApplications(): Promise<Application[]> {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
       console.error("Falha ao listApplications:", error);
       throw error;
    }
    return (data || []).map(this.mapApplication);
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
       console.error(`Falha ao getApplication(${id}):`, error);
       throw error;
    }
    return data ? this.mapApplication(data) : undefined;
  }

  async getApplicationsByCandidate(candidateId: string): Promise<Application[]> {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('candidate_id', candidateId);
    
    if (error) {
       console.error(`Falha ao getApplicationsByCandidate(${candidateId}):`, error);
       throw error;
    }
    return (data || []).map(this.mapApplication);
  }

  async getApplicationsByJob(jobId: string): Promise<Application[]> {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', jobId);
    
    if (error) {
       console.error(`Falha ao getApplicationsByJob(${jobId}):`, error);
       throw error;
    }
    return (data || []).map(this.mapApplication);
  }

  async createApplication(data: Omit<Application, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Application> {
    const insertData: any = {
      candidate_id: data.candidateId,
      job_id: data.jobId,
      channel: data.channel || "Direto",
      referred_by: data.whoIndicated || "",
      stage: data.currentPhase || "Novo",
      status: data.currentStatus || "Novo",
      entry_date: data.entryDate || new Date().toISOString(),
      interview_date: data.interviewDate || null,
      interview_time: data.interviewTime || null,
      observations: data.observations || "",
      origin: data.origin || "Manual",
      compatibility_score: data.compatibilityScore !== undefined ? data.compatibilityScore : 0,
      compatibility_level: data.compatibilityLevel || "Baixa",
      compatibility_reasons: data.compatibilityReasons || null,
      matched_keywords: Array.isArray(data.matchedKeywords) ? data.matchedKeywords : [],
      missing_keywords: Array.isArray(data.missingKeywords) ? data.missingKeywords : [],
      partial_matches: Array.isArray(data.partialMatches) ? data.partialMatches : [],
      compatibility_explanation: data.compatibilityExplanation || null,
      compatibility_calculated_at: data.compatibilityCalculatedAt || null,
      experience_in_area: data.experienceInArea || null,
      compatibility_details: data.compatibilityDetails || null
    };

    if (data.id) insertData.id = data.id;

    const { data: created, error } = await supabase
      .from('applications')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
       console.error("Falha ao createApplication no Supabase:", {
         table: 'applications',
         payload: insertData,
         error: error.message,
         details: error.details,
         hint: error.hint,
         code: error.code
       });
       throw new Error(`Falha ao criar inscrição: ${error.message}${error.details ? ` - ${error.details}` : ''}`);
    }
        return this.mapApplication(created);
  }

  async updateApplication(id: string, data: Partial<Application>): Promise<Application> {
    const updateData: any = {};
    if (data.candidateId !== undefined) updateData.candidate_id = data.candidateId;
    if (data.jobId !== undefined) updateData.job_id = data.jobId;
    if (data.channel !== undefined) updateData.channel = data.channel;
    if (data.whoIndicated !== undefined) updateData.referred_by = data.whoIndicated;
    if (data.currentPhase !== undefined) updateData.stage = data.currentPhase;
    if (data.currentStatus !== undefined) updateData.status = data.currentStatus;
    if (data.entryDate !== undefined) updateData.entry_date = data.entryDate;
    if (data.interviewDate !== undefined) updateData.interview_date = data.interviewDate;
    if (data.interviewTime !== undefined) updateData.interview_time = data.interviewTime;
    if (data.observations !== undefined) updateData.observations = data.observations;
    if (data.origin !== undefined) updateData.origin = data.origin;
    if (data.compatibilityScore !== undefined) updateData.compatibility_score = data.compatibilityScore;
    if (data.compatibilityLevel !== undefined) updateData.compatibility_level = data.compatibilityLevel;
    if (data.compatibilityReasons !== undefined) updateData.compatibility_reasons = data.compatibilityReasons || null;
    if (data.matchedKeywords !== undefined) updateData.matched_keywords = Array.isArray(data.matchedKeywords) ? data.matchedKeywords : [];
    if (data.missingKeywords !== undefined) updateData.missing_keywords = Array.isArray(data.missingKeywords) ? data.missingKeywords : [];
    if (data.partialMatches !== undefined) updateData.partial_matches = Array.isArray(data.partialMatches) ? data.partialMatches : [];
    if (data.compatibilityExplanation !== undefined) updateData.compatibility_explanation = data.compatibilityExplanation || null;
    if (data.compatibilityCalculatedAt !== undefined) updateData.compatibility_calculated_at = data.compatibilityCalculatedAt || null;
    if (data.experienceInArea !== undefined) updateData.experience_in_area = data.experienceInArea || null;
    if (data.compatibilityDetails !== undefined) updateData.compatibility_details = data.compatibilityDetails || null;

    const { data: updated, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
       console.error(`Falha ao updateApplication(${id}) no Supabase:`, {
         table: 'applications',
         id,
         payload: updateData,
         error: error.message,
         details: error.details,
         hint: error.hint
       });
       throw new Error(`Falha ao atualizar inscrição: ${error.message}`);
     }
     return this.mapApplication(updated);
  }

  async bulkUpdateApplications(ids: string[], data: Partial<Application>): Promise<void> {
    const updateData: any = {};
    if (data.currentPhase !== undefined) updateData.stage = data.currentPhase;
    if (data.currentStatus !== undefined) updateData.status = data.currentStatus;

    const { error } = await supabase
      .from('applications')
      .update(updateData)
      .in('id', ids);
    
    if (error) {
       console.error("Falha ao bulkUpdateApplications:", error);
       throw error;
    }
  }

  async deleteApplication(id: string): Promise<void> {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id);
    
    if (error) {
       console.error(`Falha ao deleteApplication(${id}):`, error);
       throw error;
    }
  }

  async listInterviews(): Promise<Interview[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) {
       console.error("Falha ao listInterviews:", error);
       throw error;
    }
    return (data || []).map(this.mapInterview);
  }

  async getInterview(id: string): Promise<Interview | undefined> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
       console.error(`Falha ao getInterview(${id}):`, error);
       throw error;
    }
    return data ? this.mapInterview(data) : undefined;
  }

  async getInterviewsByCandidate(candidateId: string): Promise<Interview[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('candidate_id', candidateId);
    
    if (error) {
       console.error(`Falha ao getInterviewsByCandidate(${candidateId}):`, error);
       throw error;
    }
    return (data || []).map(this.mapInterview);
  }

  async createInterview(data: Omit<Interview, "id" | "createdAt"> & { id?: string }): Promise<Interview> {
    const insertData: any = {
      candidate_id: data.candidateId,
      application_id: data.applicationId,
      job_id: data.jobId,
      date: data.date,
      time: data.time,
      responsible: data.responsible,
      status: data.status,
      type: data.type,
      feedback: data.feedback,
      observations: data.observations
    };

    if (data.id) insertData.id = data.id;

    const { data: created, error } = await supabase
      .from('interviews')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
       console.error("Falha ao createInterview:", error);
       throw error;
    }
    return this.mapInterview(created);
  }

  async updateInterview(id: string, data: Partial<Interview>): Promise<Interview> {
    const updateData: any = {};
    if (data.date !== undefined) updateData.date = data.date;
    if (data.time !== undefined) updateData.time = data.time;
    if (data.responsible !== undefined) updateData.responsible = data.responsible;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.feedback !== undefined) updateData.feedback = data.feedback;
    if (data.observations !== undefined) updateData.observations = data.observations;

    const { data: updated, error } = await supabase
      .from('interviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
       console.error(`Falha ao updateInterview(${id}):`, error);
       throw error;
    }
    return this.mapInterview(updated);
  }

  async deleteInterview(id: string): Promise<void> {
    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', id);
    
    if (error) {
       console.error(`Falha ao deleteInterview(${id}):`, error);
       throw error;
    }
  }

  async listHistory(candidateId: string): Promise<HistoryEvent[]> {
    const { data, error } = await supabase
      .from('history_events')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    
    if (error) {
       console.error(`Falha ao listHistory(${candidateId}):`, error);
       throw error;
    }
    return (data || []).map(this.mapHistoryEvent);
  }

  async addHistory(data: Omit<HistoryEvent, "id" | "createdAt"> & { id?: string }): Promise<HistoryEvent> {
    const eventType = data.type || "Criação";
    const description = data.description || `Evento de ${eventType} registrado no sistema.`;
    
    const insertData: any = {
      candidate_id: data.candidateId,
      application_id: data.applicationId,
      user_name: data.user,
      user_id: data.userId,
      event_type: eventType,
      description: description,
      title: data.title || null,
      action: data.action || null,
      details: data.details || null,
      metadata: data.metadata || null,
      previous_value: data.previousValue || null,
      new_value: data.newValue || null
    };

    if (data.id) insertData.id = data.id;

    try {
      const { data: created, error } = await supabase
        .from('history_events')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
         console.error("Falha ao addHistory no Supabase:", {
           table: 'history_events',
           payload: insertData,
           error: error.message,
           details: error.details,
           hint: error.hint,
           code: error.code
         });
         
         // Non-blocking fallback to prevent interrupting parent flow
         return {
           id: data.id || `temp-${Date.now()}`,
           ...data,
           description,
           createdAt: new Date().toISOString()
         } as HistoryEvent;
      }
      return this.mapHistoryEvent(created);
    } catch (e: any) {
       console.error("Erro crítico em addHistory (Supabase):", e);
       return {
         id: data.id || `temp-${Date.now()}`,
         ...data,
         description,
         createdAt: new Date().toISOString()
       } as HistoryEvent;
    }
  }

  async listDocuments(candidateId: string): Promise<CandidateDocument[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('candidate_id', candidateId);
    
    if (error) {
       console.error(`Falha ao listDocuments(${candidateId}):`, error);
       throw error;
    }
    return (data || []).map(this.mapDocument);
  }

  async listAllDocuments(): Promise<CandidateDocument[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*');
    
    if (error) {
       console.error("Falha ao listAllDocuments:", error);
       throw error;
    }
    return (data || []).map(this.mapDocument);
  }

  async attachDocument(data: Omit<CandidateDocument, "id" | "createdAt"> & { id?: string }): Promise<CandidateDocument> {
    const insertData: any = {
      candidate_id: data.candidateId,
      file_name: data.fileName,
      file_type: data.fileType,
      file_format: data.fileFormat,
      file_size: data.fileSize,
      category: data.category,
      observations: data.observations,
      user_name: data.user,
      content_url: data.contentUrl
    };

    if (data.id) insertData.id = data.id;

    const { data: created, error } = await supabase
      .from('documents')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
       console.error("Falha ao attachDocument:", error);
       throw error;
    }
    return this.mapDocument(created);
  }

  async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (error) {
       console.error(`Falha ao deleteDocument(${id}):`, error);
       throw error;
    }
  }

  async getDashboardMetrics(): Promise<any> {
    try {
      const runners = await Promise.allSettled([
        this.listCandidates(),
        this.listApplications(),
        this.listInterviews()
      ]);

      const candidates = runners[0].status === 'fulfilled' ? runners[0].value : [];
      const apps = runners[1].status === 'fulfilled' ? runners[1].value : [];
      const interviews = runners[2].status === 'fulfilled' ? runners[2].value : [];

      if (runners.some(r => r.status === 'rejected')) {
        console.warn("Algumas tabelas do Dashboard não carregaram corretamente.");
      }
      
      return {
        totalCandidates: candidates.length,
        totalApplications: apps.length,
        byPhase: {
          [ApplicationPhase.NEW]: apps.filter(a => a.currentPhase === ApplicationPhase.NEW).length,
          [ApplicationPhase.SCHEDULING]: apps.filter(a => a.currentPhase === ApplicationPhase.SCHEDULING).length,
          [ApplicationPhase.INTERVIEW]: apps.filter(a => a.currentPhase === ApplicationPhase.INTERVIEW).length,
          [ApplicationPhase.HIRING]: apps.filter(a => a.currentPhase === ApplicationPhase.HIRING).length,
          [ApplicationPhase.ONBOARDING]: apps.filter(a => a.currentPhase === ApplicationPhase.ONBOARDING).length,
          [ApplicationPhase.ARCHIVE]: apps.filter(a => a.currentPhase === ApplicationPhase.ARCHIVE).length,
        },
        byStatus: apps.reduce((acc, a) => {
          acc[a.currentStatus] = (acc[a.currentStatus] || 0) + 1;
          return acc;
        }, {} as any),
        hiredCount: apps.filter(a => a.currentStatus === ApplicationStatus.HIRED).length,
        rejectedCount: apps.filter(a => a.currentStatus === ApplicationStatus.REJECTED).length,
        interviewCount: interviews.length,
        compatibilityLevels: {
          Alta: apps.filter(a => a.compatibilityLevel === 'Alta').length,
          Média: apps.filter(a => a.compatibilityLevel === 'Média').length,
          Baixa: apps.filter(a => a.compatibilityLevel === 'Baixa').length,
        }
      };
    } catch (e) {
      console.error("Falha crítica ao getDashboardMetrics no Supabase:", e);
      throw e;
    }
  }

  async getSettings(): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
      companyName: "Realliza Consórcios",
      primaryColor: "#073F3A",
      secondaryColor: "#F49A9D",
      accentColor: "#F49A9D",
      bgColor: "#FFFFFF",
      channels: [],
      phases: [],
      statuses: [],
      rejectionReasons: [],
      documentCategories: [],
      leaders: [],
      sectors: []
    };

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'app_settings')
      .maybeSingle();
    
    if (error) {
      console.error("Erro ao buscar configurações no Supabase:", error);
      return defaultSettings;
    }
    
    if (data && data.value) {
      const v = data.value as any;
      return {
        companyName: v.companyName ?? defaultSettings.companyName,
        logo: v.logo ?? defaultSettings.logo,
        primaryColor: v.primaryColor ?? defaultSettings.primaryColor,
        secondaryColor: v.secondaryColor ?? defaultSettings.secondaryColor,
        accentColor: v.accentColor ?? defaultSettings.accentColor,
        bgColor: v.bgColor ?? defaultSettings.bgColor,
        channels: v.channels ?? defaultSettings.channels,
        phases: v.phases ?? defaultSettings.phases,
        statuses: v.statuses ?? defaultSettings.statuses,
        rejectionReasons: v.rejectionReasons ?? defaultSettings.rejectionReasons,
        documentCategories: v.documentCategories ?? defaultSettings.documentCategories,
        leaders: v.leaders ?? defaultSettings.leaders,
        sectors: v.sectors ?? defaultSettings.sectors
      };
    }

    return defaultSettings;
  }

  async updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...data };

    const { data: existing, error: checkError } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'app_settings')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('settings')
        .update({ value: updated, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('settings')
        .insert({ key: 'app_settings', value: updated });
      if (error) throw error;
    }
    
    return updated;
  }

  async listUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(this.mapUser);
  }

  async createUser(data: Omit<User, "id" | "createdAt"> & { id?: string }): Promise<User> {
    const insertData: any = {
      name: data.name,
      email: data.email,
      role: data.role,
      position: data.position,
      status: data.status
    };

    if (data.id) insertData.id = data.id;

    const { data: created, error } = await supabase
      .from('app_users')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw error;
    return this.mapUser(created);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: updated, error } = await supabase
      .from('app_users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return this.mapUser(updated);
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('app_users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async seedInitialData(): Promise<void> {
    // No-op
  }
}
