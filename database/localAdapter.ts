import { 
  Candidate, Job, Application, HistoryEvent, 
  CandidateDocument, User, AppSettings,
  ApplicationPhase, ApplicationStatus, JobStatus, Gender,
  Interview
} from "../types";
import { DatabaseAdapter } from "./dbInterface";

const STORAGE_KEYS = {
  CANDIDATES: "realliza_candidates",
  JOBS: "realliza_jobs",
  APPLICATIONS: "realliza_applications",
  INTERVIEWS: "realliza_interviews",
  HISTORY: "realliza_history",
  DOCUMENTS: "realliza_documents",
  USERS: "realliza_users",
  SETTINGS: "realliza_settings",
};

export class LocalDatabaseAdapter implements DatabaseAdapter {
  private getData<T>(key: string, defaultValue: T[] = []): T[] {
    if (typeof window === "undefined") return defaultValue;
    try {
      const data = localStorage.getItem(key);
      if (!data || data === "undefined" || data === "null") return defaultValue;
      return JSON.parse(data);
    } catch (e) {
      console.error(`LocalDatabase: Error parsing key "${key}":`, e);
      return defaultValue;
    }
  }

  private saveData<T>(key: string, data: T[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`LocalDatabase: Error saving key "${key}":`, e);
    }
  }

  async listCandidates(): Promise<Candidate[]> {
    return this.getData<Candidate>(STORAGE_KEYS.CANDIDATES);
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    const list = await this.listCandidates();
    return list.find(c => c.id === id);
  }

  async createCandidate(data: Omit<Candidate, "createdAt" | "updatedAt"> & { id?: string }): Promise<Candidate> {
    const list = await this.listCandidates();
    const newCandidate: Candidate = {
      ...data,
      id: data.id || Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newCandidate);
    this.saveData(STORAGE_KEYS.CANDIDATES, list);
    return newCandidate;
  }

  async updateCandidate(id: string, data: Partial<Candidate>): Promise<Candidate> {
    const list = await this.listCandidates();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Candidato não encontrado");
    
    const updated = {
      ...list[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    list[index] = updated;
    this.saveData(STORAGE_KEYS.CANDIDATES, list);
    return updated;
  }

  async deleteCandidate(id: string): Promise<void> {
    const candidates = await this.listCandidates();
    const apps = await this.listApplications();
    const interviews = await this.listInterviews();
    const history = this.getData<HistoryEvent>(STORAGE_KEYS.HISTORY);
    const documents = this.getData<CandidateDocument>(STORAGE_KEYS.DOCUMENTS);

    this.saveData(STORAGE_KEYS.CANDIDATES, candidates.filter(c => c.id !== id));
    this.saveData(STORAGE_KEYS.APPLICATIONS, apps.filter(a => a.candidateId !== id));
    this.saveData(STORAGE_KEYS.INTERVIEWS, interviews.filter(i => i.candidateId !== id));
    this.saveData(STORAGE_KEYS.HISTORY, history.filter(h => h.candidateId !== id));
    this.saveData(STORAGE_KEYS.DOCUMENTS, documents.filter(d => d.candidateId !== id));
  }

  async bulkDeleteCandidates(ids: string[]): Promise<void> {
    const candidates = await this.listCandidates();
    const apps = await this.listApplications();
    const interviews = await this.listInterviews();
    const history = this.getData<HistoryEvent>(STORAGE_KEYS.HISTORY);
    const documents = this.getData<CandidateDocument>(STORAGE_KEYS.DOCUMENTS);

    this.saveData(STORAGE_KEYS.CANDIDATES, candidates.filter(c => !ids.includes(c.id)));
    this.saveData(STORAGE_KEYS.APPLICATIONS, apps.filter(a => !ids.includes(a.candidateId)));
    this.saveData(STORAGE_KEYS.INTERVIEWS, interviews.filter(i => !ids.includes(i.candidateId)));
    this.saveData(STORAGE_KEYS.HISTORY, history.filter(h => !ids.includes(h.candidateId)));
    this.saveData(STORAGE_KEYS.DOCUMENTS, documents.filter(d => !ids.includes(d.candidateId)));
  }

  async listJobs(): Promise<Job[]> {
    return this.getData<Job>(STORAGE_KEYS.JOBS);
  }

  async getJob(id: string): Promise<Job | undefined> {
    const list = await this.listJobs();
    return list.find(j => j.id === id);
  }

  async createJob(data: Omit<Job, "createdAt"> & { id?: string }): Promise<Job> {
    const list = await this.listJobs();
    const newJob: Job = {
      ...data,
      id: data.id || Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    list.push(newJob);
    this.saveData(STORAGE_KEYS.JOBS, list);
    return newJob;
  }

  async updateJob(id: string, data: Partial<Job>): Promise<Job> {
    const list = await this.listJobs();
    const index = list.findIndex(j => j.id === id);
    if (index === -1) throw new Error("Vaga não encontrada");
    list[index] = { ...list[index], ...data };
    this.saveData(STORAGE_KEYS.JOBS, list);
    return list[index];
  }

  async deleteJob(id: string): Promise<void> {
    const jobs = await this.listJobs();
    const apps = await this.listApplications();
    const interviews = await this.listInterviews();

    this.saveData(STORAGE_KEYS.JOBS, jobs.filter(j => j.id !== id));
    this.saveData(STORAGE_KEYS.APPLICATIONS, apps.filter(a => a.jobId !== id));
    this.saveData(STORAGE_KEYS.INTERVIEWS, interviews.filter(i => i.jobId !== id));
  }

  async listApplications(): Promise<Application[]> {
    return this.getData<Application>(STORAGE_KEYS.APPLICATIONS);
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const list = await this.listApplications();
    return list.find(a => a.id === id);
  }

  async getApplicationsByCandidate(candidateId: string): Promise<Application[]> {
    const list = await this.listApplications();
    return list.filter(a => a.candidateId === candidateId);
  }

  async getApplicationsByJob(jobId: string): Promise<Application[]> {
    const list = await this.listApplications();
    return list.filter(a => a.jobId === jobId);
  }

  async createApplication(data: Omit<Application, "createdAt" | "updatedAt"> & { id?: string }): Promise<Application> {
    const list = await this.listApplications();
    const newApp: Application = {
      ...data,
      id: data.id || Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newApp);
    this.saveData(STORAGE_KEYS.APPLICATIONS, list);
    return newApp;
  }

  async updateApplication(id: string, data: Partial<Application>): Promise<Application> {
    const list = await this.listApplications();
    const index = list.findIndex(a => a.id === id);
    if (index === -1) throw new Error("Inscrição não encontrada");
    const updated = {
      ...list[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    list[index] = updated;
    this.saveData(STORAGE_KEYS.APPLICATIONS, list);
    return updated;
  }

  async bulkUpdateApplications(ids: string[], data: Partial<Application>): Promise<void> {
    const list = await this.listApplications();
    const now = new Date().toISOString();
    const newList = list.map(app => {
      if (ids.includes(app.id)) {
        return {
          ...app,
          ...data,
          updatedAt: now
        };
      }
      return app;
    });
    this.saveData(STORAGE_KEYS.APPLICATIONS, newList);
  }

  async deleteApplication(id: string): Promise<void> {
    const apps = await this.listApplications();
    const interviews = await this.listInterviews();
    const history = this.getData<HistoryEvent>(STORAGE_KEYS.HISTORY);

    this.saveData(STORAGE_KEYS.APPLICATIONS, apps.filter(a => a.id !== id));
    this.saveData(STORAGE_KEYS.INTERVIEWS, interviews.filter(i => i.applicationId !== id));
    this.saveData(STORAGE_KEYS.HISTORY, history.filter(h => h.applicationId !== id));
  }

  // Interviews
  async listInterviews(): Promise<Interview[]> {
    return this.getData<Interview>(STORAGE_KEYS.INTERVIEWS);
  }

  async getInterview(id: string): Promise<Interview | undefined> {
    const list = await this.listInterviews();
    return list.find(i => i.id === id);
  }

  async getInterviewsByCandidate(candidateId: string): Promise<Interview[]> {
    const list = await this.listInterviews();
    return list.filter(i => i.candidateId === candidateId);
  }

  async createInterview(data: Omit<Interview, "createdAt"> & { id?: string }): Promise<Interview> {
    const list = await this.listInterviews();
    const newInterview: Interview = {
      ...data,
      id: data.id || Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    list.push(newInterview);
    this.saveData(STORAGE_KEYS.INTERVIEWS, list);
    return newInterview;
  }

  async updateInterview(id: string, data: Partial<Interview>): Promise<Interview> {
    const list = await this.listInterviews();
    const index = list.findIndex(i => i.id === id);
    if (index === -1) throw new Error("Entrevista não encontrada");
    const updated = { ...list[index], ...data };
    list[index] = updated;
    this.saveData(STORAGE_KEYS.INTERVIEWS, list);
    return updated;
  }

  async deleteInterview(id: string): Promise<void> {
    const list = await this.listInterviews();
    this.saveData(STORAGE_KEYS.INTERVIEWS, list.filter(i => i.id !== id));
  }

  async listHistory(candidateId: string): Promise<HistoryEvent[]> {
    const list = this.getData<HistoryEvent>(STORAGE_KEYS.HISTORY);
    return list.filter(h => h.candidateId === candidateId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addHistory(data: Omit<HistoryEvent, "createdAt"> & { id?: string }): Promise<HistoryEvent> {
    const list = this.getData<HistoryEvent>(STORAGE_KEYS.HISTORY);
    const newEvent: HistoryEvent = {
      ...data,
      id: data.id || Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    list.push(newEvent);
    this.saveData(STORAGE_KEYS.HISTORY, list);
    return newEvent;
  }

  async listDocuments(candidateId: string): Promise<CandidateDocument[]> {
    const list = this.getData<CandidateDocument>(STORAGE_KEYS.DOCUMENTS);
    return list.filter(d => d.candidateId === candidateId);
  }

  async listAllDocuments(): Promise<CandidateDocument[]> {
    return this.getData<CandidateDocument>(STORAGE_KEYS.DOCUMENTS);
  }

  async attachDocument(data: Omit<CandidateDocument, "createdAt"> & { id?: string }): Promise<CandidateDocument> {
    const list = this.getData<CandidateDocument>(STORAGE_KEYS.DOCUMENTS);
    const newDoc: CandidateDocument = {
      ...data,
      id: data.id || Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    list.push(newDoc);
    this.saveData(STORAGE_KEYS.DOCUMENTS, list);
    return newDoc;
  }

  async deleteDocument(id: string): Promise<void> {
    const list = this.getData<CandidateDocument>(STORAGE_KEYS.DOCUMENTS);
    this.saveData(STORAGE_KEYS.DOCUMENTS, list.filter(d => d.id !== id));
  }

  async getDashboardMetrics(): Promise<any> {
    const candidates = await this.listCandidates();
    const apps = await this.listApplications();
    const interviews = await this.listInterviews();
    
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
  }

  async getSettings(): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
      companyName: "Realliza Consórcios",
      primaryColor: "#073F3A",
      secondaryColor: "#F49A9D",
      accentColor: "#F49A9D",
      bgColor: "#FFFFFF",
      channels: [
        { id: "1", name: "Mogiconecta", active: true, order: 0 },
        { id: "2", name: "Catho", active: true, order: 1 },
        { id: "3", name: "Indeed", active: true, order: 2 },
        { id: "4", name: "Infojobs", active: true, order: 3 },
        { id: "5", name: "Indicação", active: true, order: 4 },
      ],
      phases: [
        { id: ApplicationPhase.NEW, name: ApplicationPhase.NEW, color: "#BFDBFE", order: 0 },
        { id: ApplicationPhase.SCHEDULING, name: ApplicationPhase.SCHEDULING, color: "#FEF3C7", order: 1 },
        { id: ApplicationPhase.INTERVIEW, name: ApplicationPhase.INTERVIEW, color: "#DDD6FE", order: 2 },
        { id: ApplicationPhase.HIRING, name: ApplicationPhase.HIRING, color: "#BBF7D0", order: 3 },
        { id: ApplicationPhase.ONBOARDING, name: ApplicationPhase.ONBOARDING, color: "#C7D2FE", order: 4 },
        { id: ApplicationPhase.ARCHIVE, name: ApplicationPhase.ARCHIVE, color: "#E5E7EB", order: 5 },
      ],
      statuses: [
        { id: "1", name: ApplicationStatus.NEW, color: "#94A3B8", associatedPhases: [ApplicationPhase.NEW] },
        { id: "2", name: ApplicationStatus.SCREENING, color: "#60A5FA", associatedPhases: [ApplicationPhase.NEW] },
        { id: "3", name: ApplicationStatus.SCHEDULED, color: "#FBBF24", associatedPhases: [ApplicationPhase.SCHEDULING] },
        { id: "4", name: ApplicationStatus.HIRED, color: "#10B981", associatedPhases: [ApplicationPhase.HIRING] },
      ],
      rejectionReasons: ["Falta de experiência", "Perfil incompatível", "Não compareceu", "Outro"],
      documentCategories: ["Currículo", "Documento pessoal", "Comprovante", "Outro"],
      leaders: [],
      sectors: []
    };
    
    if (typeof window === "undefined") return defaultSettings;
    
    try {
      const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!settings || settings === "undefined" || settings === "null") return defaultSettings;
      return JSON.parse(settings);
    } catch (e) {
      console.error("LocalDatabase: Error parsing settings:", e);
      return defaultSettings;
    }
  }

  async updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...data };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    }
    return updated;
  }

  async listUsers(): Promise<User[]> {
    return this.getData<User>(STORAGE_KEYS.USERS);
  }

  async createUser(data: Omit<User, "createdAt"> & { id?: string }): Promise<User> {
    const list = await this.listUsers();
    const newUser: User = {
      ...data,
      id: data.id || Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    list.push(newUser);
    this.saveData(STORAGE_KEYS.USERS, list);
    return newUser;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const list = await this.listUsers();
    const index = list.findIndex(u => u.id === id);
    if (index === -1) throw new Error("Usuário não encontrado");
    list[index] = { ...list[index], ...data };
    this.saveData(STORAGE_KEYS.USERS, list);
    return list[index];
  }

  async deleteUser(id: string): Promise<void> {
    const list = await this.listUsers();
    this.saveData(STORAGE_KEYS.USERS, list.filter(u => u.id !== id));
  }

  async searchDuplicates(name: string, phone: string): Promise<Candidate[]> {
    const list = await this.listCandidates();
    return list.filter(c => 
      c.name.toLowerCase() === name.toLowerCase() || 
      c.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')
    );
  }

  async seedInitialData(): Promise<void> {
    const candidates = await this.listCandidates();
    if (candidates.length > 0) return;

    // Optional: Add some mock data if needed for first run
    // For now, staying empty to follow "Datos mockados só devem ser criados na primeira execução, se não houver dados salvos"
  }
}

// export const db = new LocalDatabaseAdapter();
// export const supabaseAdapterPrepared = null;
