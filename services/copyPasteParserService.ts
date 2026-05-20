import { Candidate, Gender } from "../types";
import { parse, differenceInYears, isValid } from "date-fns";

export interface ParsedCandidate extends Partial<Candidate> {
  confidence: number;
  experience1?: string;
  experience2?: string;
  experience3?: string;
  indicationFrom?: string;
}

export const copyPasteParserService = {
  normalizePhone(phone: string): string {
    if (!phone) return "Não localizei";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) return cleaned;
    if (cleaned.length === 11) return cleaned;
    if (cleaned.length === 13 && cleaned.startsWith("55")) return cleaned.substring(2);
    if (cleaned.length > 11) return cleaned.slice(-11);
    return cleaned || "Não localizei";
  },

  normalizeValue(value: string | undefined): string {
    if (!value) return "Não localizei";
    const lower = value.trim().toLowerCase();
    const informal = ["não informado", "não localizei", "não consta", "não possui", "vazio", "nd", "n/a", "-"];
    if (informal.includes(lower) || value.trim() === "") return "Não localizei";
    return value.trim();
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

  extractGender(text: string): Gender {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("feminino") || lowerText.includes("mulher") || lowerText.includes("f")) return Gender.FEMALE;
    if (lowerText.includes("masculino") || lowerText.includes("homem") || lowerText.includes("m")) return Gender.MALE;
    return Gender.UNKNOWN;
  },

  parseStructuredCandidateBlock(block: string): ParsedCandidate {
    const lines = block.split("\n");
    const labelMap: Record<string, string> = {};
    
    // Primary strategy: Label matching
    lines.forEach(line => {
      // Split by — in case labels are in the same line
      const segments = line.split("—").map(s => s.trim());
      segments.forEach(segment => {
        const match = segment.match(/^([^:]+):(.*)$/);
        if (match) {
          const label = match[1].trim().toLowerCase();
          const value = match[2].trim();
          labelMap[label] = value;
        }
      });
    });

    const findValue = (keys: string[]) => {
      for (const key of keys) {
        const lowerKey = key.toLowerCase();
        if (labelMap[lowerKey]) return labelMap[lowerKey];
        const similar = Object.keys(labelMap).find(k => k.includes(lowerKey));
        if (similar) return labelMap[similar];
      }
      return "";
    };

    let name = this.normalizeValue(findValue(["nome completo", "nome", "candidato"]));
    let email = findValue(["e-mail", "email"]).toLowerCase();
    let gender = this.extractGender(findValue(["sexo"]));
    let city = this.normalizeValue(findValue(["cidade"]));
    let phone = this.normalizePhone(findValue(["telefone", "whatsapp"]));
    let whatsapp = this.normalizePhone(findValue(["whatsapp", "telefone"]));
    
    const birthDateRaw = findValue(["data de nascimento", "nascimento", "dn"]);
    const birthDateMatch = birthDateRaw.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
    const birthDate = birthDateMatch ? birthDateMatch[0].replace(/[\-\.]/g, "/") : undefined;
    
    const ageRaw = findValue(["idade"]);
    let age: number | string = "Não localizei";

    // Fallback: Dash-separated parsing if name or phone not found
    if (name === "Não localizei" || phone === "Não localizei") {
      const parts = block.split(/[—\-\|]/).map(p => p.trim()).filter(p => p.length > 2);
      if (parts.length > 2) {
        if (name === "Não localizei") name = this.normalizeValue(parts[0]);
        if (gender === Gender.UNKNOWN) gender = this.extractGender(parts[1] || "");
        if (phone === "Não localizei") {
          const foundPhone = parts.find(p => p.match(/\d{8,}/));
          if (foundPhone) phone = this.normalizePhone(foundPhone);
        }
        if (city === "Não localizei") {
          const cities = ["Mogi", "Suzano", "Poá", "Itaquá", "Ferraz", "Arujá", "São Paulo"];
          const foundCity = parts.find(p => cities.some(c => p.includes(c)));
          if (foundCity) city = foundCity;
        }
      }
    }

    if (birthDate) {
      age = this.calculateAgeFromBirthDate(birthDate);
    } else if (ageRaw) {
      const ageMatch = ageRaw.match(/(\d{1,2})/);
      age = ageMatch ? parseInt(ageMatch[0]) : "Não localizei";
    } else {
       // Try to find age in plain text if not labeled
       const agePlainMatch = block.match(/(\d{1,2})\s*anos/i);
       if (agePlainMatch) age = parseInt(agePlainMatch[1]);
    }

    let exp1 = this.normalizeValue(findValue(["1ª experiência", "1° experiência", "primeira experiência", "experiencia 1"]));
    let exp2 = this.normalizeValue(findValue(["2ª experiência", "2° experiência", "segunda experiência", "experiencia 2"]));
    let exp3 = this.normalizeValue(findValue(["3ª experiência", "3° experiência", "terceira experiência", "experiencia 3"]));

    if (exp1 === "Não localizei") {
      const segments = block.split(/[—\-\|]/).map(p => p.trim()).filter(p => p.length > 10 && !p.includes(":"));
      const careerKeywords = ["vendedor", "atendente", "auxiliar", "gerente", "operador", "promotor", "recepcionista", "consultor"];
      const careerSegments = segments.filter(s => careerKeywords.some(kw => s.toLowerCase().includes(kw)));
      if (careerSegments.length > 0) exp1 = careerSegments[0];
      if (careerSegments.length > 1) exp2 = careerSegments[1];
      if (careerSegments.length > 2) exp3 = careerSegments[2];
    }

    const experiences = [exp1, exp2, exp3].filter(e => e !== "Não localizei");

    const candidate: ParsedCandidate = {
      name,
      normalizedName: name !== "Não localizei" ? name.toUpperCase() : "NÃO LOCALIZEI",
      phone,
      whatsapp,
      email: this.normalizeValue(email),
      gender,
      city,
      birthDate,
      age,
      experience1: exp1,
      experience2: exp2,
      experience3: exp3,
      experiences: experiences.length > 0 ? experiences : ["Não localizei"],
      confidence: 0
    };

    candidate.confidence = this.calculateConfidence(candidate);
    return candidate;
  },

  calculateConfidence(c: Partial<ParsedCandidate>): number {
    let confidence = 0;
    if (c.name && c.name !== "Não localizei") confidence += 20;
    if (c.phone && c.phone !== "Não localizei") confidence += 25;
    if (c.experience1 && c.experience1 !== "Não localizei") confidence += 20;
    if (c.city && c.city !== "Não localizei") confidence += 15;
    if (c.age && c.age !== "Não localizei") confidence += 10;
    if (c.gender && c.gender !== Gender.UNKNOWN) confidence += 5;
    if (c.email && c.email !== "Não localizei") confidence += 5;
    return confidence;
  },

  splitMultipleCandidates(text: string): string[] {
    // Regex for start of blocks
    const startLabels = ["Nome completo:", "Nome:", "Candidato:"];
    const regex = new RegExp(`(?=${startLabels.join("|")})`, "i");
    
    const blocks = text.split(regex).map(b => b.trim()).filter(b => b.length > 20);
    
    // If no labels found, try double newline
    if (blocks.length <= 1) {
      const doubleNewlineBlocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length > 20);
      if (doubleNewlineBlocks.length > 1) return doubleNewlineBlocks;
    }

    return blocks;
  },

  parseText(text: string): ParsedCandidate[] {
    const blocks = this.splitMultipleCandidates(text);
    return blocks.map(block => this.parseStructuredCandidateBlock(block));
  }
};
