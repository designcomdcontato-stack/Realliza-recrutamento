import { db } from "../database/db";

export const seedDatabase = async () => {
  // Não criamos mais nenhum dado fictício para garantir que apenas cadastros reais existam no sistema.
  // Em vez disso, detectamos e limpamos qualquer candidato fictício remanescente (com origin === "Mock").
  try {
    const candidates = await db.listCandidates();
    const mockCandidates = candidates.filter(c => c.origin === "Mock" || c.origin === "mock");
    
    if (mockCandidates.length > 0) {
      console.log(`[seedDatabase] Limpando ${mockCandidates.length} cadastros de candidatos fictícios...`);
      for (const candidate of mockCandidates) {
        await db.deleteCandidate(candidate.id);
      }
      console.log(`[seedDatabase] Limpeza de dados fictícios concluída com sucesso.`);
    }

    // Se houver vagas fictícias do seed inicial que não têm nenhuma inscrição real vinculada, podemos limpá-las opcionalmente.
    const jobs = await db.listJobs();
    const mockJobTitles = ["Vendas", "Pós-Vendas", "Auxiliar Administrativo"];
    const apps = await db.listApplications();
    
    for (const job of jobs) {
      if (mockJobTitles.includes(job.title)) {
        // Verifica se há alguma aplicação real para essa vaga
        const hasRealApps = apps.some(app => app.jobId === job.id);
        if (!hasRealApps) {
          console.log(`[seedDatabase] Removendo vaga fictícia sem inscrições reais: ${job.title}`);
          await db.deleteJob(job.id);
        }
      }
    }
  } catch (error) {
    console.error("Erro ao limpar dados fictícios no seedDatabase:", error);
  }
};
