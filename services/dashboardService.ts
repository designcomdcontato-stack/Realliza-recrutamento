import { db } from "@/database/db";
import { Application, Candidate, Job, ApplicationPhase, ApplicationStatus, Interview, Leader } from "@/types";
import { DashboardFilters, DashboardMetrics } from "@/types/dashboard";

export const dashboardService = {
  async getDashboardData() {
    const [applications, candidates, jobs, interviews, settings] = await Promise.all([
      db.listApplications(),
      db.listCandidates(),
      db.listJobs(),
      db.listInterviews(),
      db.getSettings()
    ]);

    return { applications, candidates, jobs, interviews, settings };
  },

  applyFilters(
    applications: (Application & { candidate?: Candidate; job?: Job })[],
    filters: DashboardFilters,
    leaders: Leader[] = []
  ) {
    return applications.filter(app => {
      if (!app.candidate) return false;
      if (filters.dateStart && app.entryDate < filters.dateStart) return false;
      if (filters.dateEnd && app.entryDate > filters.dateEnd) return false;
      if (filters.horario && app.interviewTime !== filters.horario) return false;
      if (filters.vagaId && app.jobId !== filters.vagaId) return false;
      if (filters.canal && app.channel !== filters.canal) return false;
      if (filters.fase && app.currentPhase !== filters.fase) return false;
      if (filters.status && app.currentStatus !== filters.status) return false;
      if (filters.cidade && app.candidate?.city !== filters.cidade) return false;
      
      if (filters.responsavelId) {
        const leader = leaders.find(l => l.id === filters.responsavelId);
        const leaderName = leader?.name.toLowerCase();
        
        const matchesId = app.leaderId === filters.responsavelId;
        const matchesName = app.responsible?.toLowerCase() === leaderName;
        
        if (!matchesId && !matchesName) return false;
      }
      
      if (filters.compatibilityLevel && app.compatibilityLevel !== filters.compatibilityLevel) return false;
      if (filters.experienciaNaArea && app.experienceInArea !== filters.experienciaNaArea) return false;
      
      if (filters.candidato) {
        const search = filters.candidato.toLowerCase();
        if (!app.candidate?.name?.toLowerCase().includes(search)) return false;
      }

      return true;
    });
  },

  calculateMetrics(
    filteredApps: (Application & { candidate?: Candidate; job?: Job })[],
    allInterviews: Interview[],
    allCandidates: Candidate[]
  ): DashboardMetrics {
    const totalApplications = filteredApps.length;
    const uniqueCandidateIds = new Set(filteredApps.map(app => app.candidateId));
    const totalCandidates = uniqueCandidateIds.size;

    const newCandidates = filteredApps.filter(app => app.currentPhase === ApplicationPhase.NEW).length;
    
    // Interviews for filtered apps
    const filteredAppIds = new Set(filteredApps.map(app => app.id));
    const appInterviews = allInterviews.filter(i => filteredAppIds.has(i.applicationId));
    
    // Standalone interviews mapped by application ID
    const appsWithStandaloneInterview = new Set(appInterviews.map(i => i.applicationId));

    // 1. Scheduled Interviews (Agendados)
    let scheduledInterviews = appInterviews.filter(i => 
      i.status === "Agendado" || i.status === "Reagendado"
    ).length;

    // Plus apps that don't have standalone interviews but have scheduled status
    const scheduledAppsWithoutStandalone = filteredApps.filter(app => 
      !appsWithStandaloneInterview.has(app.id) && 
      (app.currentStatus === ApplicationStatus.SCHEDULED || 
       app.currentStatus === ApplicationStatus.RESCHEDULED ||
       app.currentStatus?.toLowerCase() === "agendado" ||
       app.currentStatus?.toLowerCase() === "reagendado" ||
       (app.interviewDate && app.currentPhase === ApplicationPhase.SCHEDULING))
    );
    scheduledInterviews += scheduledAppsWithoutStandalone.length;

    // 2. Performed Interviews (Realizados)
    let performedInterviews = appInterviews.filter(i => 
      i.status === "Realizado"
    ).length;

    // Plus apps that don't have standalone interviews but have done statuses
    const performedAppsWithoutStandalone = filteredApps.filter(app => 
      !appsWithStandaloneInterview.has(app.id) && 
      (app.currentStatus === ApplicationStatus.INTERVIEW_DONE ||
       app.currentStatus?.toLowerCase() === "entrevista realizada" ||
       [ApplicationStatus.APPROVED, ApplicationStatus.HIRING_PROCESS, ApplicationStatus.HIRED].includes(app.currentStatus) ||
       (app.interviewDate && app.currentPhase !== ApplicationPhase.NEW && app.currentPhase !== ApplicationPhase.SCHEDULING && app.currentStatus !== ApplicationStatus.NO_SHOW))
    );
    performedInterviews += performedAppsWithoutStandalone.length;

    // 3. No Shows (Não compareceram)
    let noShows = appInterviews.filter(i => 
      i.status === "Não Compareceu"
    ).length;

    const noShowsAppsWithoutStandalone = filteredApps.filter(app => 
      !appsWithStandaloneInterview.has(app.id) && 
      (app.currentStatus === ApplicationStatus.NO_SHOW ||
       app.currentStatus?.toLowerCase() === "não compareceu" ||
       app.currentStatus?.toLowerCase() === "nao compareceu")
    );
    noShows += noShowsAppsWithoutStandalone.length;
    
    const rejected = filteredApps.filter(app => app.currentStatus === ApplicationStatus.REJECTED).length;
    const hired = filteredApps.filter(app => app.currentStatus === ApplicationStatus.HIRED).length;
    const talentPool = filteredApps.filter(app => app.currentStatus === ApplicationStatus.TALENT_POOL).length;

    // Previously registered
    const previouslyRegistered = filteredApps.filter(app => {
        const candidateApps = allCandidates.find(c => c.id === app.candidateId);
        // This is simplified, real logic might need more data
        return false; 
    }).length;

    // Rates
    const attendanceRate = (performedInterviews + noShows) > 0 
      ? (performedInterviews / (performedInterviews + noShows)) * 100 
      : 0;
    
    const approvedCandidatesCount = filteredApps.filter(app => 
      [ApplicationStatus.APPROVED, ApplicationStatus.HIRING_PROCESS, ApplicationStatus.HIRED].includes(app.currentStatus)
    ).length;

    const approvalRate = performedInterviews > 0 
      ? Math.min(100, (approvedCandidatesCount / performedInterviews) * 100)
      : 0;
      
    const hiringRate = totalApplications > 0 ? (hired / totalApplications) * 100 : 0;

    const appsWithScore = filteredApps.filter(app => app.compatibilityScore > 0);
    const averageCompatibility = appsWithScore.length > 0
      ? appsWithScore.reduce((acc, app) => acc + app.compatibilityScore, 0) / appsWithScore.length
      : 0;

    return {
      totalCandidates,
      totalApplications,
      newCandidates,
      scheduledInterviews,
      performedInterviews,
      noShows,
      rejected,
      hired,
      talentPool,
      attendanceRate,
      approvalRate,
      hiringRate,
      averageCompatibility,
      previouslyRegistered
    };
  }
};
