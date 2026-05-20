import { db } from "@/database/db";
import { Gender, ApplicationPhase, ApplicationStatus, Candidate, AppSettings } from "@/types";
import { historyService } from "./historyService";

export const importSpreadsheetService = {
  async processRows(rows: any[], settings: AppSettings) {
    const results = {
      total: rows.length,
      imported: 0,
      duplicates: 0,
      errors: 0,
      details: [] as string[]
    };

    const jobs = await db.listJobs();
    const candidates = await db.listCandidates();

    for (const row of rows) {
      try {
        const name = row["Nome"] || row["nome"] || "";
        const email = row["E-mail"] || row["Email"] || row["email"] || "";
        const phone = String(row["Telefone"] || row["telefone"] || row["phone"] || "");
        
        if (!name) {
          results.details.push(`Linha ignorada: Nome não encontrado.`);
          results.errors++;
          continue;
        }

        // Duplicate detection by email or phone
        const duplicate = candidates.find(c => 
          (email && c.email.toLowerCase() === email.toLowerCase()) || 
          (phone && c.phone === phone)
        );

        let candidateId: string;

        if (duplicate) {
          results.duplicates++;
          candidateId = duplicate.id;
          results.details.push(`Candidato "${name}" já existe. Atualizando/Vinculando nova inscrição.`);
        } else {
          const newCandidate = await db.createCandidate({
            name,
            normalizedName: name.toUpperCase(),
            gender: (row["Sexo"] || row["sexo"]) === "Homem" ? Gender.MALE : (row["Sexo"] || row["sexo"]) === "Mulher" ? Gender.FEMALE : Gender.UNKNOWN,
            email,
            phone,
            whatsapp: row["WhatsApp"] || row["whatsapp"] || phone,
            city: row["Cidade"] || row["cidade"] || "",
            birthDate: row["D.N"] || row["Nascimento"] || "",
            age: row["Idade"] || row["idade"] || "",
            experiences: row["Experiência"] ? [String(row["Experiência"])] : [],
            observations: row["Observação"] || row["observação"] || "",
            origin: "Importação CSV",
          });
          candidateId = newCandidate.id;
          results.imported++;
          
          await historyService.log({
            candidateId,
            type: "Importação",
            description: "Candidato criado via importação de planilha",
          });
        }

        // Handle Application
        const jobTitle = (row["Vaga"] || row["vaga"] || "").toString().trim();
        const job = jobs.find(j => j.title.toLowerCase().trim() === jobTitle.toLowerCase());
        
        const phaseName = row["Fase"] || row["fase"] || "Novo";
        const statusName = row["Status"] || row["status"] || "Novo";
        const channelName = row["Canal"] || row["canal"] || "Importação";
        const leaderName = (row["Líder"] || row["lider"] || "").toString().trim().toLowerCase();
        const sectorName = (row["Setor"] || row["setor"] || "").toString().trim().toLowerCase();
        const vinculo = (row["Vínculo"] || row["vinculo"] || "").toString().trim().toLowerCase();
        const expArea = (row["Experiência na Área"] || row["experiencia_area"] || "Não localizei").toString().trim();

        // Find Phase
        const phase = Object.values(ApplicationPhase).find(p => 
          p.toLowerCase() === phaseName.toLowerCase().trim()
        ) || ApplicationPhase.NEW;

        // Find Status
        let status = Object.values(ApplicationStatus).find(s => 
          s.toLowerCase() === statusName.toLowerCase().trim()
        );

        // Special mappings for common status names that might not match exactly
        if (!status) {
          if (statusName.toLowerCase().trim() === "ativo") status = ApplicationStatus.HIRED;
          if (statusName.toLowerCase().trim() === "em contratação") status = ApplicationStatus.HIRING_PROCESS;
          if (statusName.toLowerCase().trim() === "desistiu") status = ApplicationStatus.WITHDRAWN;
          if (statusName.toLowerCase().trim() === "demitido") status = ApplicationStatus.FIRED;
        }

        if (!status) status = ApplicationStatus.NEW;

        // Determine if employee is active
        let isEmployeeActive = true;
        if (vinculo === "inativo") {
          isEmployeeActive = false;
        } else if (status === ApplicationStatus.FIRED || status === ApplicationStatus.WITHDRAWN || status === ApplicationStatus.RESIGNED || status === ApplicationStatus.INACTIVE) {
          isEmployeeActive = false;
        } else if (vinculo === "ativo") {
          isEmployeeActive = true;
        }

        // Find Leader
        const leader = settings.leaders?.find(l => l.name.toLowerCase().trim() === leaderName);

        // Find Sector
        const sector = settings.sectors?.find(s => s.name.toLowerCase().trim() === sectorName);

        await db.createApplication({
          candidateId,
          jobId: job ? job.id : "NO_JOB",
          channel: channelName,
          currentPhase: phase,
          currentStatus: status,
          responsible: leader ? leader.name : (row["Líder"] || row["lider"] || "Administrador"),
          leaderId: leader ? leader.id : "",
          sectorId: sector ? sector.id : "",
          sectorName: sector ? sector.name : (row["Setor"] || row["setor"] || ""),
          entryDate: new Date().toISOString(),
          isEmployeeActive,
          observations: `Importado via CSV. Vaga Original: ${jobTitle}`,
          compatibilityScore: parseInt(row["Score"]) || 0,
          compatibilityLevel: "Média",
          compatibilityReasons: "Importado via planilha",
          experienceInArea: (["Sim", "Parcial", "Não", "Não localizei"].includes(expArea) ? expArea : "Não localizei") as any,
          origin: "Importação de planilha"
        });

      } catch (e) {
        console.error("Error importing row", e);
        results.errors++;
        results.details.push(`Erro ao importar linha: ${JSON.stringify(row)}`);
      }
    }

    return results;
  }
};
