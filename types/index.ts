export enum Gender {
  MALE = "Homem",
  FEMALE = "Mulher",
  OTHER = "Outro",
  UNKNOWN = "Não localizei"
}

export enum ApplicationPhase {
  NEW = "Novo",
  SCHEDULING = "Agendamento",
  INTERVIEW = "Entrevista",
  HIRING = "Contratação",
  ONBOARDING = "Colaboradores",
  ARCHIVE = "Arquivo"
}

export enum ApplicationStatus {
  NEW = "Novo",
  SCREENING = "Em triagem",
  COMPATIBLE = "Compatível",
  SCARCELY_COMPATIBLE = "Pouco compatível",
  NO_RESPONSE = "Não respondeu",
  SCHEDULED = "Agendado",
  RESCHEDULED = "Reagendado",
  NO_SHOW = "Não compareceu",
  INTERVIEW_DONE = "Entrevista realizada",
  APPROVED = "Aprovado",
  REJECTED = "Reprovado",
  HIRING_PROCESS = "Em contratação",
  PENDING_DOCS = "Documentação pendente",
  HIRED = "Contratado",
  FIRED = "Demitido",
  RESIGNED = "Pediu as contas",
  EXPERIENCE_FAILED = "Reprovado na Experiência",
  TALENT_POOL = "Banco de talentos",
  WITHDRAWN = "Desistiu",
  INACTIVE = "Inativo"
}

export enum JobStatus {
  DRAFT = "Rascunho",
  OPEN = "Aberta",
  PAUSED = "Pausada",
  CLOSED = "Encerrada"
}

export interface Candidate {
  id: string;
  name: string;
  normalizedName: string;
  gender: Gender;
  birthDate?: string;
  age?: number | string;
  city: string;
  phone: string;
  whatsapp: string;
  email: string;
  experiences: string[];
  observations: string;
  origin: string;
  isAnonymous?: boolean;
  originalText?: string;
  parsingConfidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  mandatoryKeywords: string[];
  desirableKeywords: string[];
  valuedExperiences: string[];
  department?: string;
  location?: string;
  status: JobStatus;
  responsible: string;
  responsibleId?: string;
  compatibilityKeywords?: {
    key_1: string;
    key_2: string;
    key_3: string;
    key_4: string;
    key_5: string;
  };
  createdAt: string;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  channel: string;
  whoIndicated?: string;
  currentPhase: ApplicationPhase;
  currentStatus: ApplicationStatus;
  responsible: string;
  entryDate: string;
  interviewDate?: string;
  interviewTime?: string;
  observations: string;
  compatibilityScore: number;
  compatibilityLevel: "Baixa" | "Média" | "Alta";
  compatibilityReasons: string;
  matchedKeywords?: string[];
  missingKeywords?: string[];
  partialMatches?: string[];
  compatibilityExplanation?: string;
  experienceInArea?: "Sim" | "Parcial" | "Não" | "Não localizei";
  compatibilityDetails?: {
    keyword: string;
    weight: number;
    match: string;
    points: number;
    foundTerms: string[];
  }[];
  compatibilityCalculatedAt?: string;
  hiringDate?: string;
  leaderId?: string;
  sectorId?: string;
  sectorName?: string;
  isEmployeeActive?: boolean;
  terminationDate?: string;
  origin: "Manual" | "Copia e cola" | "Lista colada" | "Texto de currículo" | "Importação de planilha";
  createdAt: string;
  updatedAt: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  jobId: string;
  applicationId: string;
  date: string;
  time: string;
  responsible: string;
  status: "Agendado" | "Realizado" | "Cancelado" | "Não Compareceu" | "Reagendado";
  type: "Presencial" | "Remoto" | "Telefone";
  feedback?: string;
  observations?: string;
  createdAt: string;
}

export interface HistoryEvent {
  id: string;
  candidateId: string;
  applicationId?: string;
  type: "Criação" | "Edição" | "Fase" | "Status" | "Entrevista" | "Documento" | "Anonimização" | "Importação" | "Compatibilidade";
  description: string;
  title?: string;
  action?: string;
  details?: string | any;
  metadata?: any;
  user: string;
  previousValue?: string;
  newValue?: string;
  userId?: string;
  createdAt: string;
}

export interface CandidateDocument {
  id: string;
  candidateId: string;
  fileName: string;
  fileType: string;
  fileFormat: string;
  fileSize: number;
  category: "Currículo" | "Documento pessoal" | "Comprovante" | "Outro";
  observations: string;
  user: string;
  contentUrl?: string; // Base64 or Blob URL
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Administrador" | "RH" | "Líder" | "Visualizador";
  position: string;
  status: "Ativo" | "Inativo";
  createdAt: string;
}

export interface ConfigPhase {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface ConfigStatus {
  id: string;
  name: string;
  color: string;
  associatedPhases: string[];
}

export interface Leader {
  id: string;
  name: string;
  active: boolean;
}

export interface Sector {
  id: string;
  name: string;
  active: boolean;
}

export interface AppSettings {
  companyName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  channels: { id: string, name: string, active: boolean, order: number }[];
  phases: ConfigPhase[];
  statuses: ConfigStatus[];
  rejectionReasons: string[];
  documentCategories: string[];
  leaders?: Leader[];
  sectors?: Sector[];
}
