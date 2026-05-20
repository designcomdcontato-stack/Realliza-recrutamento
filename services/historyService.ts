import { db } from "@/database/db";
import { HistoryEvent, Candidate } from "@/types";

export const historyService = {
  async log(params: {
    candidateId: string;
    applicationId?: string;
    type: HistoryEvent["type"];
    description: string;
    details?: string;
    previousValue?: string;
    newValue?: string;
  }) {
    // In a real app, user would come from auth context
    const currentUser = "Administrador"; 
    
    return db.addHistory({
      ...params,
      user: currentUser,
    });
  },

  async logCandidateCreation(candidateId: string, origin: string = "Manual") {
    return this.log({
      candidateId,
      type: "Criação",
      description: `Candidato criado via ${origin}`,
    });
  },

  async logCandidateEdit(candidateId: string) {
    return this.log({
      candidateId,
      type: "Edição",
      description: "Cadastro editado",
    });
  },

  async logPhaseChange(candidateId: string, previousValue: string, newValue: string, applicationId?: string) {
    return this.log({
      candidateId,
      applicationId,
      type: "Fase",
      description: `Fase alterada de ${previousValue} para ${newValue}`,
      previousValue,
      newValue
    });
  },

  async logStatusChange(candidateId: string, applicationId: string, previousValue: string, newValue: string) {
    return this.log({
      candidateId,
      applicationId,
      type: "Status",
      description: `Status alterado de ${previousValue} para ${newValue}`,
      previousValue,
      newValue
    });
  },

  async logInterviewScheduled(candidateId: string, applicationId: string, date: string, time: string) {
    return this.log({
      candidateId,
      applicationId,
      type: "Entrevista",
      description: `Entrevista agendada para ${date} às ${time}`,
    });
  },

  async logCompatibilityCalculated(candidateId: string, applicationId: string, score: number, level: string) {
    return this.log({
      candidateId,
      applicationId,
      type: "Compatibilidade",
      description: `Compatibilidade calculada: ${score}% (${level})`,
    });
  },

  async logCompatibilityRecalculated(candidateId: string, applicationId: string, score: number, level: string) {
    return this.log({
      candidateId,
      applicationId,
      type: "Compatibilidade",
      description: `Compatibilidade recalculada após alteração da vaga: ${score}% (${level})`,
    });
  },

  async logDocumentAttached(candidateId: string, fileName: string) {
    return this.log({
      candidateId,
      type: "Documento",
      description: `Documento anexado manualmente: ${fileName}`,
    });
  },

  async logApplicationCreated(candidateId: string, jobId: string) {
    return this.log({
      candidateId,
      type: "Criação",
      description: `Inscrição realizada em nova vaga`,
      details: `Vaga ID: ${jobId}`,
    });
  }
};
