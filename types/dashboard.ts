import { ApplicationPhase, ApplicationStatus } from "./index";

export interface DashboardFilters {
  dateStart?: string;
  dateEnd?: string;
  horario?: string;
  vagaId?: string;
  canal?: string;
  candidato?: string;
  fase?: ApplicationPhase | string;
  status?: ApplicationStatus | string;
  cidade?: string;
  responsavelId?: string;
  compatibilityLevel?: "Baixa" | "Média" | "Alta";
  tipoInscricao?: string;
  comCurriculo?: boolean;
  experienciaNaArea?: "Sim" | "Parcial" | "Não" | "Não localizei";
}

export interface DashboardMetrics {
  totalCandidates: number;
  totalApplications: number;
  newCandidates: number;
  scheduledInterviews: number;
  performedInterviews: number;
  noShows: number;
  rejected: number;
  hired: number;
  talentPool: number;
  attendanceRate: number;
  approvalRate: number;
  hiringRate: number;
  averageCompatibility: number;
  previouslyRegistered: number;
}
