import { Candidate, Gender } from "../types";
import { parse, differenceInYears, isValid } from "date-fns";

export interface ParsedCandidate extends Partial<Candidate> {
  confidence: number;
}

export const copyPasteParserService = {
  normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) return cleaned;
    if (cleaned.length === 11) return cleaned;
    if (cleaned.length === 13 && cleaned.startsWith("55")) return cleaned.substring(2);
    if (cleaned.length > 11) return cleaned.slice(-11);
    return cleaned || "Não localizei";
  },

  normalizeEmail(email: string): string {
    if (!email || email.toLowerCase().includes("não informado") || email.toLowerCase().includes("não localizei")) return "Não localizei";
    return email.trim().toLowerCase();
  },

  normalizeName(name: string): string {
    if (!name || name.toLowerCase().includes("não informado")) return "Não localizei";
    return name
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  },

  extractPhone(text: string): string {
    const telMatch = text.match(/Telefone:\s?([\d\s\(\)\-\+]+)/i);
    const source = telMatch ? telMatch[1] : text;
    
    const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s\.]?\d{4}/g;
    const matches = source.match(phoneRegex);
    if (matches && matches.length > 0) {
      return this.normalizePhone(matches[0]);
    }
    return "Não localizei";
  },

  extractEmail(text: string): string {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    return matches ? this.normalizeEmail(matches[0]) : "Não localizei";
  },

  extractBirthDate(text: string): string | undefined {
    if (!text) return undefined;
    const lowerText = text.toLowerCase();
    
    // Labels to look near
    const birthDateLabels = ["nascimento", "nasc", "data de nasc", "dn", "nascido em"];
    
    // Pattern for DD/MM/YYYY
    const dateRegex = /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/g;
    let match;
    const candidates: { date: string, score: number }[] = [];
    
    while ((match = dateRegex.exec(text)) !== null) {
      const dateStr = match[0].replace(/[\-\.]/g, "/");
      let score = 0;
      
      const pos = match.index;
      const context = lowerText.substring(Math.max(0, pos - 30), Math.min(text.length, pos + 30));
      
      if (birthDateLabels.some(label => context.includes(label))) score += 50;
      
      const year = parseInt(match[3]);
      const currentYear = new Date().getFullYear();
      if (year < currentYear - 14 && year > currentYear - 100) score += 20;

      candidates.push({ date: dateStr, score });
    }

    if (candidates.length === 0) return undefined;
    
    // Return candidate with highest score
    return candidates.sort((a, b) => b.score - a.score)[0].date;
  },

  calculateAgeFromBirthDate(birthDate: string): number | string {
    try {
      const dateToParse = birthDate.replace(/[.-]/g, "/");
      const parsedDate = parse(dateToParse, "dd/MM/yyyy", new Date());
      if (!isValid(parsedDate)) return "Não localizei";
      const age = differenceInYears(new Date(), parsedDate);
      if (age < 0 || age > 110) return "Não localizei";
      return age;
    } catch {
      return "Não localizei";
    }
  },

  extractAge(text: string): number | string {
    if (text.toLowerCase().includes("não informado") || text.toLowerCase().includes("não localizei")) return "Não localizei";
    
    // Look for "Idade: 25"
    const ageLabelMatch = text.match(/(?:Idade|Anos):\s?(\d{1,2})/i);
    if (ageLabelMatch) return parseInt(ageLabelMatch[1]);

    // Look for "25 anos"
    const ageRegex = /(\d{1,2})\s?anos/i;
    const match = text.match(ageRegex);
    if (match) return parseInt(match[1]);

    return "Não localizei";
  },

  extractGender(text: string): Gender {
    const lowerText = text.toLowerCase();
    // Prioritize clear labels
    if (lowerText.includes("sexo: f") || lowerText.includes("sexo feminino")) return Gender.FEMALE;
    if (lowerText.includes("sexo: m") || lowerText.includes("sexo masculino")) return Gender.MALE;
    
    // Fallback to keywords
    if (lowerText.includes("feminino") || lowerText.includes("mulher")) return Gender.FEMALE;
    if (lowerText.includes("masculino") || lowerText.includes("homem")) return Gender.MALE;
    return Gender.UNKNOWN;
  },

  extractCity(text: string): string {
    const cityMatch = text.match(/(?:Cidade|Moro em|Resido em|Localidade):\s?([^—\-\n,;]+)/i);
    if (cityMatch) return cityMatch[1].trim();

    const cities = [
      "Mogi das Cruzes", "Suzano", "Itaquaquecetuba", "São Paulo", "Poá", 
      "Ferraz de Vasconcelos", "Guarulhos", "Santo André", "São Bernardo", 
      "Campinas", "Santos", "Biritiba Mirim", "Salesópolis", "Arujá", "Santa Isabel"
    ];
    for (const city of cities) {
      if (text.toLowerCase().includes(city.toLowerCase())) return city;
    }
    return "Não localizei";
  },

  extractExperiences(text: string): string[] {
    const sectionKeywords = ["experiência", "histórico", "empresas", "trabalhos", "antecedentes", "atividades"];
    const experienceKeywords = [
      "vendedor", "vendas", "atendente", "auxiliar", "operador", "consultor", 
      "administrativo", "recepcionista", "gerente", "estagio", "ajudante", 
      "vigilante", "porteiro", "motorista", "tecnico", "analista", "caixa",
      "promotor", "estoquista", "repositor", "conferente", "limpeza", "garçom"
    ];

    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    
    let experiences: string[] = [];

    // Strategy 1: Section identification
    let inExperienceSection = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      if (sectionKeywords.some(kw => lowerLine.includes(kw) && line.length < 30)) {
        inExperienceSection = true;
        continue;
      }

      if (inExperienceSection) {
        const stopKeywords = ["formação", "escolaridade", "curso", "idioma", "objetivo", "habilidade", "competência"];
        if (stopKeywords.some(kw => lowerLine.includes(kw) && line.length < 30)) break;
        if (line.length > 3) experiences.push(line);
      }
      if (experiences.length >= 6) break;
    }

    // Strategy 2: Keyword scanning if section search failed
    if (experiences.length === 0) {
      for (const line of lines) {
        if (experienceKeywords.some(k => line.toLowerCase().includes(k)) && line.length > 5) {
          experiences.push(line);
          if (experiences.length >= 5) break;
        }
      }
    }

    // Strategy 3: Handle single line with delimiters (Common in the user's screenshots)
    if (experiences.length <= 1) {
      // Split by common delimiters and look for items that match experience keywords
      const parts = text.split(/[—\-|•]/).map(p => p.trim()).filter(p => p.length > 8);
      const delimitersFound = parts.length > 3;
      
      if (delimitersFound) {
        const newExps = parts.filter(p => {
          const lp = p.toLowerCase();
          // Must have an experience keyword and not be a field label
          const isExp = experienceKeywords.some(kw => lp.includes(kw));
          const isLabel = ["cidade", "telefone", "idade", "nascimento", "email", "sexo"].some(f => lp.includes(f + ":") || lp.includes(f + " :"));
          return isExp && !isLabel;
        });
        if (newExps.length > 0) experiences = newExps;
      }
    }

    // Strategy 4: Handle items that look like "Role at Company - Period" in a long text
    if (experiences.length > 0) {
       const refined: string[] = [];
       experiences.forEach(exp => {
         // If a part is very long and has "Data Atual" or month names, try to split it further
         if (exp.length > 80 && exp.match(/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|atual/i)) {
           const sub = exp.split(/\s+-\s+/).map(s => s.trim()).filter(s => s.length > 10);
           if (sub.length > 1) {
             sub.forEach(s => {
               if (experienceKeywords.some(kw => s.toLowerCase().includes(kw))) refined.push(s);
             });
           } else {
             refined.push(exp);
           }
         } else {
           refined.push(exp);
         }
       });
       if (refined.length > 0) experiences = refined;
    }
    
    // Final cleanup and formatting
    const final = [...new Set(experiences)]
      .map(exp => exp.replace(/^[-\[\]\(\)•\d\.\s]+/, "").trim())
      .filter(exp => exp.length > 5);
      
    return final.length > 0 ? final.slice(0, 5) : ["Não localizei"];
  },

  extractName(text: string): string {
    const nameLabels = ["Nome:", "Candidato:", "Nome completo:"];
    for (const label of nameLabels) {
      const regex = new RegExp(`${label}\\s?([^\\n—]+)`, "i");
      const match = text.match(regex);
      if (match) return this.normalizeName(match[1].trim());
    }
    
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const ignoreList = ["currículo", "dados pessoais", "experiência", "formação", "objetivo", "resumo"];
    for (const line of lines) {
      if (!ignoreList.some(ignore => line.toLowerCase().includes(ignore)) && line.length > 3 && line.split(" ").length >= 2) {
        const cleanLine = line.split(/[—\-]/)[0].trim();
        return this.normalizeName(cleanLine);
      }
    }
    
    return "Não localizei";
  },

  calculateConfidence(c: Partial<ParsedCandidate>): number {
    let confidence = 0;
    if (c.name && c.name !== "Não localizei") confidence += 20;
    if (c.phone && c.phone !== "Não localizei") confidence += 25;
    if (c.experiences && c.experiences[0] !== "Não localizei") confidence += 20;
    if (c.city && c.city !== "Não localizei") confidence += 15;
    if ((c.age && c.age !== "Não localizei") || c.birthDate) confidence += 10;
    if (c.gender && c.gender !== Gender.UNKNOWN) confidence += 5;
    if (c.email && c.email !== "Não localizei") confidence += 5;
    return confidence;
  },

  parseStructuredCandidateText(text: string): ParsedCandidate | null {
    const lines = text.split("\n");
    const labelMap: Record<string, string> = {};
    
    const relevantLabels = [
      "nome completo", "nome", "candidato", "e-mail", "email", "sexo", "cidade", 
      "telefone", "whatsapp", "data de nascimento", "nascimento", "dn", "idade", 
      "canal", "1ª experiencia", "2ª experiencia", "3ª experiencia",
      "experiencia 1", "experiencia 2", "experiencia 3"
    ];
    
    let hasLabels = false;
    lines.forEach(line => {
      const match = line.match(/^([^:]+):(.*)$/);
      if (match) {
        const label = match[1].trim().toLowerCase();
        const value = match[2].trim();
        if (relevantLabels.some(rl => label.includes(rl))) {
          labelMap[label] = value;
          hasLabels = true;
        }
      }
    });
    
    if (!hasLabels) return null;
    
    const findValue = (keys: string[]) => {
      for (const key of keys) {
        const lowerKey = key.toLowerCase();
        // Look for exact match first
        if (labelMap[lowerKey]) return labelMap[lowerKey];
        // Look for partial match
        const foundKey = Object.keys(labelMap).find(k => k.includes(lowerKey));
        if (foundKey) return labelMap[foundKey];
      }
      return "";
    };

    const nameValue = findValue(["nome completo", "nome", "candidato"]);
    const name = this.normalizeName(nameValue);
    const email = this.normalizeEmail(findValue(["e-mail", "email"]));
    const gender = this.extractGender(findValue(["sexo"]));
    const city = findValue(["cidade"]) || "Não localizei";
    const phoneValue = findValue(["telefone"]);
    const phone = this.normalizePhone(phoneValue);
    const whatsappValue = findValue(["whatsapp"]);
    const whatsapp = whatsappValue ? this.normalizePhone(whatsappValue) : phone;
    
    const birthDateStr = findValue(["data de nascimento", "nascimento", "dn"]);
    const birthDate = this.extractBirthDate(birthDateStr);
    const ageValue = findValue(["idade"]);
    const age = birthDate ? this.calculateAgeFromBirthDate(birthDate) : this.extractAge(ageValue);
    
    const experiences = [
       findValue(["1ª experiencia", "experiencia 1"]),
       findValue(["2ª experiencia", "experiencia 2"]),
       findValue(["3ª experiencia", "experiencia 3"])
    ].filter(e => e && e.toLowerCase() !== "não localizei" && e.length > 3);

    const candidate: Partial<ParsedCandidate> = {
      name,
      normalizedName: name.toUpperCase(),
      phone,
      whatsapp,
      email,
      gender,
      city,
      birthDate,
      age: age || "Não localizei",
      experiences: experiences.length > 0 ? experiences : ["Não localizei"]
    };

    return {
      ...candidate,
      confidence: this.calculateConfidence(candidate)
    } as ParsedCandidate;
  },

  parseDashSeparatedCandidateLine(line: string): ParsedCandidate {
    // Better split using multiple common separators
    const parts = line.split(/\s?[—\-|•]\s?/).map(p => p.trim()).filter(p => !!p);
    
    const name = this.normalizeName(parts[0].replace(/Nome:|Candidato:|Nome completo:/i, "").trim());
    
    const genderPart = parts.find(p => ["homem", "mulher", "masculino", "feminino"].includes(p.toLowerCase()));
    const gender = genderPart ? this.extractGender(genderPart) : Gender.UNKNOWN;

    const phone = this.extractPhone(line);
    const city = this.extractCity(line);
    const email = this.extractEmail(line);
    const birthDate = this.extractBirthDate(line);
    const age = birthDate ? this.calculateAgeFromBirthDate(birthDate) : this.extractAge(line);

    const labels = ["data de nascimento", "idade", "cidade", "telefone", "email", "sexo", "nascimento", "dn"];
    const experienceKeywords = [
      "vendedor", "vendas", "atendente", "auxiliar", "operador", "consultor", 
      "administrativo", "recepcionista", "gerente", "estagio", "ajudante", 
      "vigilante", "porteiro", "motorista", "tecnico", "analista", "caixa",
      "balconista", "repositor", "promotor", "estoquista"
    ];

    const experiencePartsRaw = parts.filter((p, i) => {
      if (i === 0) return false;
      if (p === genderPart) return false;
      
      const lp = p.toLowerCase();
      if (labels.some(l => lp.includes(l))) return false;
      if (p.length < 5) return false;
      if (p === phone || p === email) return false;
      
      return true;
    });

    const experiences: string[] = [];
    for (let i = 0; i < experiencePartsRaw.length; i++) {
      const p = experiencePartsRaw[i];
      const lp = p.toLowerCase();
      const hasJobKw = experienceKeywords.some(kw => lp.includes(kw));
      const hasDateMarkers = lp.match(/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|atual|\d{4}/i);
      
      if (hasJobKw && i + 1 < experiencePartsRaw.length) {
        const nextP = experiencePartsRaw[i+1];
        const nextLp = nextP.toLowerCase();
        const nextHasDate = nextLp.match(/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|atual|\d{4}/i);
        if (nextHasDate) {
          experiences.push(`${p} (${nextP})`);
          i++; // Skip next part as it was joined
          continue;
        }
      }
      
      if (hasJobKw || hasDateMarkers) {
        experiences.push(p);
      }
    }

    const finalExperiences = experiences.length > 0 ? experiences.slice(0, 3) : ["Não localizei"];

    const candidate: Partial<ParsedCandidate> = {
      name,
      normalizedName: name.toUpperCase(),
      phone,
      whatsapp: phone,
      email,
      gender,
      birthDate,
      age: age || "Não localizei",
      city,
      experiences: finalExperiences,
    };

    return {
      ...candidate,
      confidence: this.calculateConfidence(candidate)
    } as ParsedCandidate;
  },

  parseSingleCandidateText(text: string): ParsedCandidate {
    // Try structured parsing first
    const structured = this.parseStructuredCandidateText(text);
    if (structured && structured.confidence > 20) {
      return structured;
    }

    if (text.includes("—") || (text.includes("-") && text.includes("Telefone:"))) {
      return this.parseDashSeparatedCandidateLine(text);
    }

    const name = this.extractName(text);
    const phone = this.extractPhone(text);
    const email = this.extractEmail(text);
    const gender = this.extractGender(text);
    const birthDate = this.extractBirthDate(text);
    const age = birthDate ? this.calculateAgeFromBirthDate(birthDate) : this.extractAge(text);
    const city = this.extractCity(text);
    const experiences = this.extractExperiences(text);
    
    const candidate: Partial<ParsedCandidate> = {
      name,
      normalizedName: name !== "Não localizei" ? name.toUpperCase() : "NÃO LOCALIZEI",
      phone,
      whatsapp: phone,
      email,
      gender,
      birthDate,
      age,
      city,
      experiences,
    };

    return {
      ...candidate,
      confidence: this.calculateConfidence(candidate)
    } as ParsedCandidate;
  },

  parseCandidateListText(text: string): ParsedCandidate[] {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 15);
    
    if (lines.length > 1) {
      const likelyList = lines.every(l => l.includes("Telefone:") || l.match(/\d{8,}/) || l.includes("—"));
      if (likelyList) {
        return lines.map(line => this.parseSingleCandidateText(line));
      }
    }

    const chunks = text.split(/\n\s*\n|\r\n\s*\r\n/).filter(c => c.trim().length > 10);
    if (chunks.length <= 1) {
      return lines.map(line => this.parseSingleCandidateText(line));
    }
    return chunks.map(chunk => this.parseSingleCandidateText(chunk));
  }
};
