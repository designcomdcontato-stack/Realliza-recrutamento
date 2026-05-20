import { db } from "@/database/db";
import { compatibilityService, CompatibilityResult } from "./compatibilityService";
import { Application, Candidate, Job } from "@/types";

export const applicationService = {
  async recalculateAndSaveCompatibility(applicationId: string): Promise<CompatibilityResult> {
    const application = await db.getApplication(applicationId);
    if (!application) throw new Error("Inscrição não encontrada");

    const candidate = await db.getCandidate(application.candidateId);
    if (!candidate) {
      console.warn(`[applicationService] Limpando inscrição órfã ${applicationId} porque o candidato ${application.candidateId} não existe.`);
      try {
        await db.deleteApplication(applicationId);
      } catch (e) {
        console.error(`Erro ao deletar inscrição órfã ${applicationId}:`, e);
      }
      throw new Error("Candidato não encontrado");
    }

    const job = await db.getJob(application.jobId);
    if (!job) {
      console.warn(`[applicationService] Limpando inscrição órfã ${applicationId} porque a vaga ${application.jobId} não existe.`);
      try {
        await db.deleteApplication(applicationId);
      } catch (e) {
        console.error(`Erro ao deletar inscrição órfã ${applicationId}:`, e);
      }
      throw new Error("Vaga não encontrada");
    }

    const result = compatibilityService.calculateCandidateJobCompatibility(candidate, job);

    const previousScore = application.compatibilityScore;
    const previousLevel = application.compatibilityLevel;

    const updatedApp = await db.updateApplication(applicationId, {
      compatibilityScore: result.score,
      compatibilityLevel: result.level,
      compatibilityReasons: result.explanation,
      compatibilityExplanation: result.explanation,
      matchedKeywords: result.matchedKeywords,
      missingKeywords: result.missingKeywords,
      partialMatches: result.partialMatches,
      compatibilityDetails: result.details,
      experienceInArea: result.experienceInArea,
      compatibilityCalculatedAt: new Date().toISOString()
    });

    // Registrar no histórico se houver mudança relevante ou se for a primeira vez
    if (previousScore !== result.score || previousLevel !== result.level) {
      const details = [
        `Vaga: ${job.title}`,
        `Score: ${previousScore}% -> ${result.score}%`,
        `Nível: ${previousLevel} -> ${result.level}`,
        `Palavras encontradas: ${result.matchedKeywords.join(", ") || "Nenhuma"}`,
        `Palavras não localizadas: ${result.missingKeywords.join(", ") || "Nenhuma"}`,
        `Explicação: ${result.explanation}`
      ].join("\n");

      await db.addHistory({
        candidateId: candidate.id,
        applicationId: applicationId,
        type: "Compatibilidade",
        description: `Compatibilidade recalculada para a vaga ${job.title}`,
        details,
        user: "Sistema",
        previousValue: `${previousScore}% (${previousLevel})`,
        newValue: `${result.score}% (${result.level})`
      });
    }

    return result;
  },

  async recalculateAll(): Promise<void> {
    const applications = await db.listApplications();
    for (const app of applications) {
      try {
        await this.recalculateAndSaveCompatibility(app.id);
      } catch (error: any) {
        if (error?.message === "Candidato não encontrado" || error?.message === "Vaga não encontrada") {
          // Já processado e silenciado
          continue;
        }
        console.error(`Erro ao recalcular compatibilidade para app ${app.id}:`, error);
      }
    }
  },

  async recalculateAllForJob(jobId: string): Promise<void> {
    const applications = await db.getApplicationsByJob(jobId);
    for (const app of applications) {
      try {
        await this.recalculateAndSaveCompatibility(app.id);
      } catch (error: any) {
        if (error?.message === "Candidato não encontrado" || error?.message === "Vaga não encontrada") {
          // Já processado e silenciado
          continue;
        }
        console.error(`Erro ao recalcular compatibilidade para app ${app.id}:`, error);
      }
    }
  },

  async recalculateAllForCandidate(candidateId: string): Promise<void> {
    const applications = await db.getApplicationsByCandidate(candidateId);
    for (const app of applications) {
      try {
        await this.recalculateAndSaveCompatibility(app.id);
      } catch (error: any) {
        if (error?.message === "Candidato não encontrado" || error?.message === "Vaga não encontrada") {
          // Já processado e silenciado
          continue;
        }
        console.error(`Erro ao recalcular compatibilidade para app ${app.id}:`, error);
      }
    }
  }
};
