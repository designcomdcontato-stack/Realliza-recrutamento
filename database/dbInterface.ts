import { Candidate, Job, Application, HistoryEvent, CandidateDocument, User, AppSettings, Interview } from "../types";

export interface DatabaseAdapter {
  // Candidates
  listCandidates(): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | undefined>;
  createCandidate(data: Omit<Candidate, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Candidate>;
  updateCandidate(id: string, data: Partial<Candidate>): Promise<Candidate>;
  deleteCandidate(id: string): Promise<void>;
  bulkDeleteCandidates(ids: string[]): Promise<void>;
  searchDuplicates(name: string, phone: string): Promise<Candidate[]>;
  
  // Jobs
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  createJob(data: Omit<Job, "id" | "createdAt"> & { id?: string }): Promise<Job>;
  updateJob(id: string, data: Partial<Job>): Promise<Job>;
  deleteJob(id: string): Promise<void>;
  
  // Applications
  listApplications(): Promise<Application[]>;
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationsByCandidate(candidateId: string): Promise<Application[]>;
  getApplicationsByJob(jobId: string): Promise<Application[]>;
  createApplication(data: Omit<Application, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Application>;
  updateApplication(id: string, data: Partial<Application>): Promise<Application>;
  bulkUpdateApplications(ids: string[], data: Partial<Application>): Promise<void>;
  deleteApplication(id: string): Promise<void>;
  
  // Interviews
  listInterviews(): Promise<Interview[]>;
  getInterview(id: string): Promise<Interview | undefined>;
  getInterviewsByCandidate(candidateId: string): Promise<Interview[]>;
  createInterview(data: Omit<Interview, "id" | "createdAt"> & { id?: string }): Promise<Interview>;
  updateInterview(id: string, data: Partial<Interview>): Promise<Interview>;
  deleteInterview(id: string): Promise<void>;
  
  // History
  listHistory(candidateId: string): Promise<HistoryEvent[]>;
  addHistory(data: Omit<HistoryEvent, "id" | "createdAt"> & { id?: string }): Promise<HistoryEvent>;
  
  // Documents
  listDocuments(candidateId: string): Promise<CandidateDocument[]>;
  listAllDocuments(): Promise<CandidateDocument[]>;
  attachDocument(data: Omit<CandidateDocument, "id" | "createdAt"> & { id?: string }): Promise<CandidateDocument>;
  deleteDocument(id: string): Promise<void>;
  
  // Dashboard & Reports
  getDashboardMetrics(): Promise<any>;
  
  // Settings
  getSettings(): Promise<AppSettings>;
  updateSettings(data: Partial<AppSettings>): Promise<AppSettings>;
  
  // Users
  listUsers(): Promise<User[]>;
  createUser(data: Omit<User, "id" | "createdAt"> & { id?: string }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Seed
  seedInitialData(): Promise<void>;
}
