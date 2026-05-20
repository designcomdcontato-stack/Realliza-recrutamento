import { Candidate, Job } from "@/types";

export type CompatibilityDetail = {
  keyword: string;
  weight: number;
  match: "exata" | "forte" | "media" | "fraca" | "nenhuma";
  points: number;
  foundTerms: string[];
};

export type CompatibilityResult = {
  score: number;
  level: "Alta" | "Média" | "Baixa";
  matchedKeywords: string[];
  missingKeywords: string[];
  partialMatches: string[];
  explanation: string;
  experienceInArea?: "Sim" | "Parcial" | "Não" | "Não localizei";
  details?: CompatibilityDetail[];
};

const SALES_TERMS = [
  "venda", "vendedor", "vendedora", "vendedores", "vendedoras",
  "vendedor interno", "vendedora interna", "vendedor externo", "vendedora externa",
  "consultor de venda", "consultora de venda", "consultor comercial", "consultora comercial",
  "comercial", "atendente de venda", "atendimento comercial", "promotor de venda",
  "promotora de venda", "telemarketing", "televenda", "prospeccao", "prospecção",
  "consorcio", "consórcio", "consorcios", "consórcios", "consultor de consorcio",
  "consultora de consorcio", "vendedor de consorcio", "vendedora de consorcio",
  "vendedor de consórcio", "vendedora de consórcio", "consultor de consórcio",
  "consultora de consórcio", "venda de consorcio", "venda de consórcio",
  "vendedor de loja", "atendente de loja"
];

const CONSORTIUM_KEYWORDS = [
  "consorcio", "consórcio", "consorcios", "consórcios", "venda de consorcio", "venda de consórcio",
  "vendedor de consorcio", "vendedor de consórcio", "vendedora de consorcio", "vendedora de consórcio",
  "consultor de consorcio", "consultor de consórcio", "consultora de consorcio", "consultora de consórcio",
  "administradora de consorcio", "administradora de consórcios", "cota de consorcio", "cota de consórcio",
  "cotas de consorcio", "cotas de consórcio", "carta de credito", "carta de crédito", "venda de quota", "puro sangue"
];

const STOP_WORDS = ["de", "da", "do", "das", "dos", "em", "na", "no", "para", "com", "a", "o", "e", "ao", "aos", "as", "os", "ao", "aos"];

const SINONIMOS: Record<string, string[]> = {
  "venda": ["vendedor", "vendedora", "comercial", "atendente de venda", "consultor de venda", "consultora de venda", "vendedor interno", "vendedora interna", "vendedor externo", "vendedora externa", "promotor de venda", "promotora de venda", "atendimento", "atendente"],
  "consorcio": ["cota", "cotas", "carta de credito", "carta de crédito"],
  "atendimento": ["atendente", "suporte", "recepcao", "recepcionista", "auxiliar administrativo"],
  "telemarketing": ["televenda", "call center", "operador de telemarketing", "ativo", "receptivo", "vendedor interno"],
  "meta": ["resultados", "objetivos", "performance", "desempenho"]
};

export const compatibilityService = {
  normalizeCompatibilityText(text: string): string {
    if (!text) return "";
    
    // Initial clean: lowercase, remove accents, punctuation to spaces
    const clean = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Map each word for normalization
    return clean.split(" ").map(word => {
      if (word.length <= 2) return word;
      
      let w = word;
      
      // Gender/Plural normalization (word-specific)
      w = w.replace(/as$/g, "a")     // vendedoras -> vendedora
           .replace(/es$/g, "")      // vendedores -> vendedor
           .replace(/ora$/g, "or")    // vendedora -> vendedor
           .replace(/iro$/g, "ira")   // just in case (internal consistency)
           .replace(/oes$/g, "ao")    // acoes -> acao
           .replace(/s$/g, "");      // vendas -> venda

      // Specific normalizations
      if (w === "consorcio" || w === "consorcios") return "consorcio";
      if (w === "prospeccao" || w === "prospeccao") return "prospeccao";
      
      return w;
    }).join(" ");
  },

  hasExperienceInJobArea(candidate: Candidate, job: Job): "Sim" | "Parcial" | "Não" | "Não localizei" {
    const experiences = Array.isArray(candidate.experiences) ? candidate.experiences : [];
    if (experiences.length === 0) return "Não localizei";

    const normJobTitle = this.normalizeCompatibilityText(job.title);
    const isSalesJob = normJobTitle.includes("venda") || normJobTitle.includes("comercial") || normJobTitle.includes("consorcio") || normJobTitle.includes("atendimento") || normJobTitle.includes("telemarketing");

    if (!isSalesJob) return "Não localizei";

    let matchCount = 0;
    const allSalesTerms = SALES_TERMS.map(t => this.normalizeCompatibilityText(t));

    experiences.forEach(exp => {
      const normExp = this.normalizeCompatibilityText(exp);
      // Check for broad match in the experience description
      if (allSalesTerms.some(term => normExp.includes(term))) {
        matchCount++;
      }
    });

    if (matchCount >= 2) return "Sim";
    if (matchCount === 1) return "Parcial";
    return "Não";
  },

  calculateAreaExperienceScore(candidate: Candidate, job: Job): number {
    const status = this.hasExperienceInJobArea(candidate, job);
    
    // Re-count matches for point calculation
    let matchCount = 0;
    const normJobTitle = this.normalizeCompatibilityText(job.title);
    const isSalesJob = normJobTitle.includes("venda") || normJobTitle.includes("comercial") || normJobTitle.includes("consorcio") || normJobTitle.includes("atendimento") || normJobTitle.includes("telemarketing");
    
    if (!isSalesJob) return 0;

    const experiences = Array.isArray(candidate.experiences) ? candidate.experiences : [];
    const allSalesTerms = SALES_TERMS.map(t => this.normalizeCompatibilityText(t));
    experiences.forEach(exp => {
      const normExp = this.normalizeCompatibilityText(exp);
      if (allSalesTerms.some(term => normExp.includes(term))) {
        matchCount++;
      }
    });

    if (matchCount >= 3) return 15;
    if (matchCount === 2) return 10;
    if (matchCount === 1) return 5;
    return 0;
  },

  tokenizeText(text: string): string[] {
    const clean = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ").trim();
    return clean
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.includes(word));
  },

  expandKeywordWithSynonyms(term: string): string[] {
    const normTerm = this.normalizeCompatibilityText(term);
    const results = new Set<string>([normTerm]);

    for (const [main, list] of Object.entries(SINONIMOS)) {
      const normMain = this.normalizeCompatibilityText(main);
      const normList = list.map(s => this.normalizeCompatibilityText(s));

      if (normMain === normTerm || normList.includes(normTerm)) {
        results.add(normMain);
        normList.forEach(s => results.add(s));
      }
    }

    return Array.from(results).filter(Boolean);
  },

  calculateKeywordMatch(keyword: string, candidateText: string): { level: "exata" | "forte" | "media" | "fraca" | "nenhuma"; foundTerms: string[] } {
    if (!keyword) return { level: "nenhuma", foundTerms: [] };

    const rawCandidateText = candidateText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");
    const normCandidateText = this.normalizeCompatibilityText(candidateText);
    const normalizedKeyword = this.normalizeCompatibilityText(keyword);
    const rawKeyword = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();

    // 1. Full phrase match (Exact)
    if (rawCandidateText.includes(rawKeyword) || normCandidateText.includes(normalizedKeyword)) {
      return { level: "exata", foundTerms: [keyword] };
    }

    // Expand search if it's a consortium keyword
    const isConsortiumSearch = CONSORTIUM_KEYWORDS.some(t => this.normalizeCompatibilityText(keyword).includes(this.normalizeCompatibilityText(t)));
    if (isConsortiumSearch) {
       const consortiumSyns = CONSORTIUM_KEYWORDS.map(t => this.normalizeCompatibilityText(t));
       if (consortiumSyns.some(syn => normCandidateText.includes(syn))) {
         return { level: "forte", foundTerms: [keyword] };
       }
    }

    // 2. Term by term match
    const terms = this.tokenizeText(keyword);
    if (terms.length === 0) return { level: "nenhuma", foundTerms: [] };

    let matchedCount = 0;
    const foundTerms: string[] = [];

    for (const term of terms) {
      const termSynonyms = this.expandKeywordWithSynonyms(term);
      let termMatched = false;
      for (const syn of termSynonyms) {
        if (normCandidateText.includes(syn)) {
          termMatched = true;
          if (!foundTerms.includes(syn)) foundTerms.push(syn);
          break;
        }
      }
      if (termMatched) matchedCount++;
    }

    const ratio = matchedCount / terms.length;

    if (ratio >= 1.0) return { level: "forte", foundTerms };
    if (ratio >= 0.5) return { level: "media", foundTerms };
    if (ratio > 0) return { level: "fraca", foundTerms };

    return { level: "nenhuma", foundTerms: [] };
  },

  getCompatibilityLevel(score: number): "Alta" | "Média" | "Baixa" {
    if (score >= 75) return "Alta";
    if (score >= 45) return "Média";
    return "Baixa";
  },

  calculateCandidateJobCompatibility(candidate: Candidate, job: Job): CompatibilityResult {
    const KEYWORD_WEIGHTS = [68, 20, 8, 3, 1];
    const MATCH_FACTORS = {
      exata: 1.0,
      forte: 0.9,
      media: 0.7,
      fraca: 0.4,
      nenhuma: 0
    };

    const areaExperienceScore = this.calculateAreaExperienceScore(candidate, job);
    const experienceInArea = this.hasExperienceInJobArea(candidate, job);

    const experiences = Array.isArray(candidate.experiences) ? candidate.experiences : [];
    const candidateText = [
      ...experiences,
      candidate.observations || "",
      candidate.name 
    ].join(" ");
    
    if (!job || !job.compatibilityKeywords) {
      const matchData = this.calculateKeywordMatch(job?.title || "", candidateText);
      const rankingScore = Math.round(100 * MATCH_FACTORS[matchData.level]);
      const finalScore = Math.min(100, rankingScore + areaExperienceScore);
      const level = this.getCompatibilityLevel(finalScore);
      
      return {
        score: finalScore,
        level,
        matchedKeywords: matchData.level === "exata" || matchData.level === "forte" ? [job?.title || ""] : [],
        missingKeywords: matchData.level === "nenhuma" ? [job?.title || ""] : [],
        partialMatches: matchData.level === "media" || matchData.level === "fraca" ? [job?.title || ""] : [],
        explanation: `Compatibilidade baseada no título da vaga e experiência na área.`,
        experienceInArea,
        details: [{
          keyword: job?.title || "Título da Vaga",
          weight: 100,
          match: matchData.level,
          points: rankingScore,
          foundTerms: matchData.foundTerms
        }]
      };
    }

    const { key_1, key_2, key_3, key_4, key_5 } = job.compatibilityKeywords;
    const keywordList = [key_1, key_2, key_3, key_4, key_5];

    let rankingScore = 0;
    const matched: string[] = [];
    const missing: string[] = [];
    const partials: string[] = [];
    const details: CompatibilityDetail[] = [];

    keywordList.forEach((text, index) => {
      if (!text) return;
      
      const { level, foundTerms } = this.calculateKeywordMatch(text, candidateText);
      const weight = KEYWORD_WEIGHTS[index] || 0;
      const factor = MATCH_FACTORS[level];
      const points = weight * factor;
      
      rankingScore += points;
      details.push({ 
        keyword: text, 
        weight, 
        match: level, 
        points: Math.round(points * 10) / 10, 
        foundTerms 
      });

      if (level === "exata" || level === "forte") {
        matched.push(text);
      } else if (level === "media" || level === "fraca") {
        partials.push(text);
      } else {
        missing.push(text);
      }
    });

    const finalScore = Math.min(100, Math.round(rankingScore + areaExperienceScore));
    const level = this.getCompatibilityLevel(finalScore);

    return {
      score: finalScore,
      level,
      matchedKeywords: matched,
      missingKeywords: missing,
      partialMatches: partials,
      explanation: `O candidato possui ${finalScore}% de compatibilidade técnica. Experiência na área: ${experienceInArea}.`,
      details,
      experienceInArea
    };
  },

  calculate(candidate: Candidate, job: Job): CompatibilityResult {
    return this.calculateCandidateJobCompatibility(candidate, job);
  }
};
