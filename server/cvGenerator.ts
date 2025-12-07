import OpenAI from "openai";
import { ENV } from "./_core/env";
import { getEmployeeCVWithDetails } from "./db";
import { getEmployeeById } from "./db";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: ENV.openaiApiKey || undefined,
});

export interface CVData {
  employee: {
    firstName: string;
    lastName: string;
    position: string | null;
  };
  cv: {
    yearsOfExperience: number;
    summary: string | null;
    tagline: string | null;
    seniorityLevel: string | null;
    skills: Array<{ skillName: string }>;
    technologies: Array<{
      technologyName: string;
      category: string | null;
      proficiency: string;
    }>;
    languages: Array<{
      languageName: string;
      level: string | null;
    }>;
    projects: Array<{
      projectId: number;
      projectDescription: string | null;
      role: string | null;
      startDate: Date | null;
      endDate: Date | null;
      technologies: string | null;
      project?: {
        name: string;
        clientId: number | null;
      } | null;
    }>;
  };
}

interface ImprovedDescriptions {
  tagline?: string; // Krótki opis (2-3 zdania)
  summary?: string; // Opis profilu (3-4 zdania)
  projectDescriptions?: Array<{ // Opisy projektów
    projectName: string;
    description: string;
  }>;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
  });
}

function loadCVDraftTemplate(): string {
  try {
    // Spróbuj różnych ścieżek - serwer może być uruchomiony z różnych katalogów
    const possiblePaths = [
      path.join(process.cwd(), 'shared', 'cvdraft.html'),
      path.resolve(process.cwd(), 'shared', 'cvdraft.html'),
      path.resolve(process.cwd(), '..', 'shared', 'cvdraft.html'),
    ];
    
    // Jeśli __dirname jest dostępne (CommonJS), dodaj też te ścieżki
    try {
      // @ts-ignore - __dirname może nie być dostępne w ES modules
      if (typeof __dirname !== 'undefined') {
        // @ts-ignore
        possiblePaths.push(path.resolve(__dirname, '..', 'shared', 'cvdraft.html'));
        // @ts-ignore
        possiblePaths.push(path.resolve(__dirname, '..', '..', 'shared', 'cvdraft.html'));
      }
    } catch {
      // Ignoruj jeśli __dirname nie jest dostępne
    }
    
    console.log('[loadCVDraftTemplate] process.cwd():', process.cwd());
    console.log('[loadCVDraftTemplate] Trying paths:', possiblePaths);
    
    for (const templatePath of possiblePaths) {
      try {
        const normalizedPath = path.normalize(templatePath);
        if (fs.existsSync(normalizedPath)) {
          console.log('[loadCVDraftTemplate] Found template at:', normalizedPath);
          const content = fs.readFileSync(normalizedPath, 'utf-8');
          if (!content || content.trim().length === 0) {
            console.warn('[loadCVDraftTemplate] Template file is empty');
            continue;
          }
          return content;
        } else {
          console.log('[loadCVDraftTemplate] Path does not exist:', normalizedPath);
        }
      } catch (e: any) {
        console.log('[loadCVDraftTemplate] Error checking path:', e.message);
        continue;
      }
    }
    
    const errorMsg = `Template file not found. Tried paths: ${possiblePaths.join(', ')}`;
    console.error('[loadCVDraftTemplate]', errorMsg);
    throw new Error(errorMsg);
  } catch (error: any) {
    console.error('[loadCVDraftTemplate] Error loading template:', error.message);
    throw new Error(`Nie udało się wczytać szablonu CV: ${error.message}`);
  }
}

interface ImprovedDescriptions {
  tagline?: string; // Krótki opis (2-3 zdania)
  summary?: string; // Opis profilu (3-4 zdania)
  projectDescriptions?: Array<{ // Opisy projektów
    projectName: string;
    description: string;
  }>;
}

function buildCVDataForAI(cvData: CVData): string {
  const { employee, cv } = cvData;
  
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const position = employee.position || "Pracownik";
  const seniorityLevel = cv.seniorityLevel || (cv.yearsOfExperience >= 5 ? "Senior" : cv.yearsOfExperience >= 2 ? "Mid" : "Junior");
  
  // Formatuj technologie
  const technologiesByCategory: Record<string, Array<{ name: string; proficiency: string }>> = {};
  cv.technologies.forEach(tech => {
    const category = tech.category || "Inne";
    if (!technologiesByCategory[category]) {
      technologiesByCategory[category] = [];
    }
    technologiesByCategory[category].push({
      name: tech.technologyName,
      proficiency: tech.proficiency,
    });
  });
  
  const techText = Object.entries(technologiesByCategory)
    .map(([cat, techs]) => {
      const proficiencyMap: Record<string, string> = {
        beginner: "podstawowy",
        intermediate: "średnio zaawansowany",
        advanced: "zaawansowany",
        expert: "ekspert",
      };
      return `${cat}: ${techs.map(t => `${t.name} (${proficiencyMap[t.proficiency] || t.proficiency})`).join(", ")}`;
    })
    .join("\n");
  
  // Formatuj języki
  const languagesText = cv.languages && cv.languages.length > 0
    ? cv.languages.map(l => `${l.languageName}${l.level ? ` - ${l.level}` : ""}`).join("\n")
    : "Polski - ojczysty\nAngielski - B2 / C1";
  
  // Formatuj projekty
  const projectsText = cv.projects.map((proj, idx) => {
    const projectName = proj.project?.name || `Projekt ${idx + 1}`;
    const role = proj.role || "Developer";
    const description = proj.projectDescription || "";
    const dates = proj.startDate && proj.endDate
      ? `${formatDate(proj.startDate)} - ${formatDate(proj.endDate)}`
      : proj.startDate
      ? `Od ${formatDate(proj.startDate)}`
      : "obecnie";
    const techs = proj.technologies || "";
    
    return `Projekt: ${projectName}
Rola: ${role}
Okres: ${dates}
${description ? `Obecny opis: ${description}` : "Brak opisu"}
${techs ? `Technologie: ${techs}` : ""}`;
  }).join("\n\n");
  
  const softSkills = cv.skills.map(s => s.skillName).join(", ");
  
  return `DANE PRACOWNIKA:
- Imię i nazwisko: ${fullName}
- Stanowisko: ${position}
- Poziom: ${seniorityLevel}
- Lata doświadczenia: ${cv.yearsOfExperience}

${cv.tagline ? `OBECNY TAGLINE (krótki opis 2-3 zdania):\n${cv.tagline}` : "TAGLINE: Brak - wygeneruj krótki opis (2-3 zdania) na podstawie stanowiska, poziomu i technologii"}

${cv.summary ? `OBECNY OPIS PROFILU:\n${cv.summary}` : "OPIS PROFILU: Brak - wygeneruj opis profilu (3-4 zdania)"}

UMIEJĘTNOŚCI MIĘKKIE:
${softSkills || "Brak"}

TECHNOLOGIE:
${techText || "Brak"}

JĘZYKI:
${languagesText}

PROJEKTY:
${projectsText || "Brak projektów"}`;
}

function buildCVPrompt(cvData: CVData): string {
  const dataForAI = buildCVDataForAI(cvData);
  
  return `Jesteś ekspertem w tworzeniu profesjonalnych opisów do CV. Twoim zadaniem jest wygenerowanie ulepszonych opisów tekstowych na podstawie danych pracownika.

DANE PRACOWNIKA:
${dataForAI}

ZADANIE:
Wygeneruj ulepszone opisy tekstowe w formacie JSON. Zwróć TYLKO JSON bez dodatkowych komentarzy.

Format odpowiedzi (JSON):
{
  "tagline": "Krótki opis pracownika (2-3 zdania) - główny stack, typ projektów, kluczowe kompetencje",
  "summary": "Opis profilu pracownika (3-4 zdania) - doświadczenie, specjalizacja, umiejętności",
  "projectDescriptions": [
    {
      "projectName": "Nazwa projektu",
      "description": "Ulepszony opis projektu z rolą i osiągnięciami (2-3 zdania)"
    }
  ]
}

INSTRUKCJE:
1. Jeśli tagline jest zbyt krótki lub brakuje - wygeneruj profesjonalny tagline (2-3 zdania)
2. Jeśli summary jest zbyt krótkie lub brakuje - wygeneruj profesjonalny opis profilu (3-4 zdania)
3. Dla każdego projektu bez opisu lub z krótkim opisem - wygeneruj profesjonalny opis (2-3 zdania) z rolą i osiągnięciami
4. Używaj profesjonalnego języka biznesowego
5. Opisy powinny być konkretne i merytoryczne

Zwróć TYLKO JSON, bez dodatkowych komentarzy ani wyjaśnień.`;
}

function buildCVPromptLegacy(cvData: CVData): string {
  const { employee, cv } = cvData;
  
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const position = employee.position || "Pracownik";
  
  // Formatuj technologie według kategorii
  const technologiesByCategory: Record<string, Array<{ name: string; proficiency: string }>> = {};
  cv.technologies.forEach(tech => {
    const category = tech.category || "Inne";
    if (!technologiesByCategory[category]) {
      technologiesByCategory[category] = [];
    }
    technologiesByCategory[category].push({
      name: tech.technologyName,
      proficiency: tech.proficiency,
    });
  });
  
  // Formatuj projekty
  const projectsText = cv.projects.map((proj, idx) => {
    const projectName = proj.project?.name || `Projekt ${idx + 1}`;
    const role = proj.role || "Developer";
    const description = proj.projectDescription || "";
    const dates = proj.startDate && proj.endDate
      ? `${formatDate(proj.startDate)} - ${formatDate(proj.endDate)}`
      : proj.startDate
      ? `Od ${formatDate(proj.startDate)}`
      : "";
    const techs = proj.technologies || "";
    
    return `- ${projectName} (${role})${dates ? ` - ${dates}` : ""}${description ? `\n  ${description}` : ""}${techs ? `\n  Technologie: ${techs}` : ""}`;
  }).join("\n");
  
  // Formatuj technologie według kategorii
  const techCategoriesText = Object.entries(technologiesByCategory)
    .map(([category, techs]) => {
      const techList = techs.map(t => {
        const proficiencyMap: Record<string, string> = {
          beginner: "Podstawowy",
          intermediate: "Średni",
          advanced: "Zaawansowany",
          expert: "Ekspert",
        };
        return `${t.name} (${proficiencyMap[t.proficiency] || t.proficiency})`;
      }).join(", ");
      return `${category}: ${techList}`;
    })
    .join("\n");
  
  const skillsText = cv.skills.map(s => s.skillName).join(", ");
  
  return `Wygeneruj profesjonalne CV w formacie HTML dla następującego pracownika:

DANE OSOBOWE:
- Imię i nazwisko: ${fullName}
- Stanowisko: ${position}

DOŚWIADCZENIE:
- Lata doświadczenia: ${cv.yearsOfExperience}
${cv.summary ? `- Podsumowanie: ${cv.summary}` : ""}

UMIEJĘTNOŚCI MIĘKKIE:
${skillsText || "Brak"}

TECHNOLOGIE (UMIEJĘTNOŚCI TWARDE):
${techCategoriesText || "Brak"}

PROJEKTY:
${projectsText || "Brak"}

WYMAGANIA:
1. Wygeneruj kompletne CV w HTML (z pełną strukturą <!DOCTYPE html>, <head>, <body>)
2. Użyj nowoczesnego, profesjonalnego designu z CSS inline lub w <style>
3. CV powinno być atrakcyjne wizualnie, czytelne i profesjonalne
4. Użyj kolorów firmowych (np. niebieski, szary) - unikaj zbyt jaskrawych kolorów
5. Sekcje: Nagłówek z danymi osobowymi, Doświadczenie, Umiejętności, Technologie (pogrupowane według kategorii), Projekty
6. Dla każdego projektu dodaj opis roli i osiągnięć (jeśli nie ma opisu, stwórz profesjonalny opis na podstawie nazwy projektu i technologii)
7. Użyj polskich nazw dla poziomów zaawansowania (Podstawowy, Średni, Zaawansowany, Ekspert)
8. CV powinno być gotowe do wydruku (A4, odpowiednie marginesy)
9. Dodaj responsywny design, ale zoptymalizowany pod wydruk
10. Użyj profesjonalnej typografii (np. Arial, Helvetica, sans-serif)

Wygeneruj TYLKO kod HTML, bez dodatkowych komentarzy ani wyjaśnień.`;
}

export async function generateCVHTML(employeeId: number): Promise<{ html: string; historyId: number }> {
  if (!ENV.openaiApiKey) {
    throw new Error("OPENAI_API_KEY nie jest skonfigurowany. Dodaj OPENAI_API_KEY do zmiennych środowiskowych.");
  }
  
  // Pobierz dane pracownika i CV
  const employee = await getEmployeeById(employeeId);
  if (!employee) {
    throw new Error("Pracownik nie został znaleziony");
  }
  
  const cvData = await getEmployeeCVWithDetails(employeeId);
  if (!cvData) {
    throw new Error("CV nie zostało znalezione. Najpierw utwórz CV dla pracownika.");
  }
  
  // Pobierz pełne dane projektów
  const { getEmployeeCVProjects } = await import("./db");
  const cvProjects = await getEmployeeCVProjects(cvData.id);
  
  const cvDataWithProjects: CVData = {
    employee: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      position: employee.position,
    },
    cv: {
      yearsOfExperience: cvData.yearsOfExperience,
      summary: cvData.summary,
      tagline: cvData.tagline,
      seniorityLevel: cvData.seniorityLevel,
      skills: cvData.skills,
      technologies: cvData.technologies,
      languages: cvData.languages || [],
      projects: cvProjects.map(p => ({
        ...p.cvProject,
        project: p.project,
      })),
    },
  };
  
  // KROK 1: Wypełnij szablon danymi w kodzie (bez AI)
  const filledTemplate = fillCVTemplate(cvDataWithProjects);
  
  // KROK 2: Wyślij tylko dane tekstowe do AI z prośbą o ulepszenie opisów
  const prompt = buildCVPrompt(cvDataWithProjects);
  
  try {
    console.log('[generateCVHTML] Generating improved descriptions for employee:', employeeId);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Jesteś ekspertem w tworzeniu profesjonalnych opisów do CV. Zwracasz tylko JSON z ulepszonymi opisami tekstowymi.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });
    
    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error("Nie udało się wygenerować opisów. Model nie zwrócił treści.");
    }
    
    console.log('[generateCVHTML] Descriptions generated, tokens used:', completion.usage?.total_tokens);
    
    // Parsuj odpowiedź JSON
    let improvedDescriptions: ImprovedDescriptions;
    try {
      improvedDescriptions = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('[generateCVHTML] Error parsing JSON response:', parseError);
      // Jeśli nie udało się sparsować, użyj oryginalnych opisów
      improvedDescriptions = {};
    }
    
    // KROK 3: Wstaw ulepszone opisy do szablonu
    let finalHTML = filledTemplate;
    
    if (improvedDescriptions.tagline) {
      finalHTML = finalHTML.replace(/\{\{TAGLINE\}\}/g, improvedDescriptions.tagline);
    }
    
    if (improvedDescriptions.summary) {
      finalHTML = finalHTML.replace(/\{\{SUMMARY\}\}/g, improvedDescriptions.summary);
    }
    
    if (improvedDescriptions.projectDescriptions && improvedDescriptions.projectDescriptions.length > 0) {
      // Zaktualizuj opisy projektów w HTML
      improvedDescriptions.projectDescriptions.forEach(improved => {
        const projectRegex = new RegExp(
          `(<article class="project">[\\s\\S]*?<div class="project-name">${improved.projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</div>[\\s\\S]*?<div class="project-role">[\\s\\S]*?)(<div class="project-desc">[\\s\\S]*?</div>)?([\\s\\S]*?</article>)`,
          'i'
        );
        finalHTML = finalHTML.replace(projectRegex, (match, before, existingDesc, after) => {
          const newDesc = `        <div class="project-desc">\n          ${improved.description}\n        </div>`;
          return before + newDesc + after;
        });
      });
    }
    
    // Usuń wszystkie pozostałe placeholder-y
    finalHTML = finalHTML.replace(/\{\{[^}]+\}\}/g, "");
    
    console.log('[generateCVHTML] CV generated successfully');
    
    // Zapisz do historii
    const { saveCVHistory } = await import("./db");
    const historyId = await saveCVHistory(employeeId, cvData.id, finalHTML);
    console.log('[generateCVHTML] CV saved to history with id:', historyId);
    
    return { html: finalHTML, historyId };
  } catch (error: any) {
    console.error('[generateCVHTML] Error:', error);
    throw new Error(`Błąd podczas generowania CV: ${error.message || "Nieznany błąd"}`);
  }
}

function fillCVTemplate(cvData: CVData): string {
  const { employee, cv } = cvData;
  
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const position = employee.position || "Pracownik";
  const seniorityLevel = cv.seniorityLevel || (cv.yearsOfExperience >= 5 ? "Senior" : cv.yearsOfExperience >= 2 ? "Mid" : "Junior");
  
  // Wczytaj szablon
  let template = loadCVDraftTemplate();
  
  if (!template) {
    throw new Error("Nie udało się wczytać szablonu CV");
  }
  
  // Formatuj technologie według kategorii do tabeli HTML
  const technologiesByCategory: Record<string, Array<{ name: string; proficiency: string }>> = {};
  cv.technologies.forEach(tech => {
    const category = tech.category || "Inne";
    if (!technologiesByCategory[category]) {
      technologiesByCategory[category] = [];
    }
    technologiesByCategory[category].push({
      name: tech.technologyName,
      proficiency: tech.proficiency,
    });
  });
  
  const proficiencyMap: Record<string, string> = {
    beginner: "podstawowy",
    intermediate: "średnio zaawansowany",
    advanced: "zaawansowany",
    expert: "ekspert",
  };
  
  const categoryLabels: Record<string, string> = {
    backend: "Języki / backend",
    frontend: "Frontend",
    database: "Bazy danych",
    devops: "DevOps / chmura",
    mobile: "Mobile",
    tools: "Inne",
    testing: "Testowanie",
  };
  
  // Formatuj technologie do tabeli HTML
  let technologiesTableRows = "";
  Object.entries(technologiesByCategory).forEach(([category, techs]) => {
    const categoryLabel = categoryLabels[category] || category;
    const techRows = techs.map(tech => {
      const proficiency = proficiencyMap[tech.proficiency] || tech.proficiency;
      return `<span class="tech-level">${tech.name} – ${proficiency}</span>`;
    }).join("<br />");
    technologiesTableRows += `        <tr>
          <th>${categoryLabel}</th>
          <td>
            ${techRows}
          </td>
        </tr>
`;
  });
  
  if (!technologiesTableRows) {
    technologiesTableRows = "        <tr><th>Brak</th><td>-</td></tr>\n";
  }
  
  // Formatuj języki do HTML
  let languagesHTML = "";
  if (cv.languages && cv.languages.length > 0) {
    languagesHTML = cv.languages.map(lang => {
      return `      <div class="lang-row">
        <span>${lang.languageName}</span>
        <span class="lang-level">${lang.level || ""}</span>
      </div>`;
    }).join("\n");
  } else {
    // Domyślne języki
    languagesHTML = `      <div class="lang-row">
        <span>Polski</span>
        <span class="lang-level">ojczysty</span>
      </div>
      <div class="lang-row">
        <span>Angielski</span>
        <span class="lang-level">B2 / C1 – swobodna komunikacja w projektach</span>
      </div>`;
  }
  
  // Formatuj projekty do HTML
  let projectsHTMLFormatted = "";
  if (cv.projects.length > 0) {
    projectsHTMLFormatted = cv.projects.map((proj) => {
      const projectName = proj.project?.name || "Projekt";
      const role = proj.role || "Developer";
      const description = proj.projectDescription || "";
      const dates = proj.startDate && proj.endDate
        ? `${formatDate(proj.startDate)} – ${formatDate(proj.endDate)}`
        : proj.startDate
        ? `Od ${formatDate(proj.startDate)}`
        : "obecnie";
      const techs = proj.technologies || "";
      
      return `      <article class="project">
        <div class="project-top">
          <div class="project-name">${projectName}</div>
          <div class="project-period">${dates}</div>
        </div>
        <div class="project-role">Rola: ${role}</div>
        ${description ? `<div class="project-desc">\n          ${description}\n        </div>` : `<div class="project-desc">\n          {{PROJECT_DESC_${projectName}}}\n        </div>`}
        ${techs ? `<div class="project-tech">\n          Technologie: ${techs}\n        </div>` : ""}
      </article>`;
    }).join("\n\n      ");
  } else {
    projectsHTMLFormatted = `      <p class="section-text">Brak projektów</p>`;
  }
  
  // Formatuj umiejętności miękkie
  const softSkills = cv.skills.map(s => s.skillName).join(", ");
  
  // Wypełnij szablon danymi (zostaw placeholder-y dla opisów które będą ulepszone przez AI)
  template = template.replace(/\{\{FULL_NAME\}\}/g, fullName);
  template = template.replace(/\{\{POSITION\}\}/g, position);
  template = template.replace(/\{\{SENIORITY_LEVEL\}\}/g, seniorityLevel);
  template = template.replace(/\{\{TAGLINE\}\}/g, cv.tagline || "{{TAGLINE}}"); // Placeholder jeśli brak
  template = template.replace(/\{\{SUMMARY\}\}/g, cv.summary || "{{SUMMARY}}"); // Placeholder jeśli brak
  template = template.replace(/\{\{TECHNOLOGIES_TABLE\}\}/g, technologiesTableRows.trim());
  template = template.replace(/\{\{SOFT_SKILLS\}\}/g, softSkills || "Brak");
  template = template.replace(/\{\{LANGUAGES\}\}/g, languagesHTML);
  template = template.replace(/\{\{PROJECTS\}\}/g, projectsHTMLFormatted);
  
  // Usuń sekcję umiejętności miękkich jeśli nie ma danych
  if (!softSkills || softSkills === "Brak") {
    template = template.replace(/\{\{#IF_SOFT_SKILLS\}\}[\s\S]*?\{\{\/IF_SOFT_SKILLS\}\}/g, "");
  } else {
    template = template.replace(/\{\{#IF_SOFT_SKILLS\}\}/g, "");
    template = template.replace(/\{\{\/IF_SOFT_SKILLS\}\}/g, "");
  }
  
  return template;
}

