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
        description?: string | null;
      } | null;
    }>;
  };
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
  softSkills?: string; // Ulepszony tekst umiejętności miękkich (2-3 zdania)
  projectDescriptions?: Array<{ // Opisy projektów
    projectName: string;
    description: string;
  }>;
}

function buildCVDataForAI(cvData: CVData): string {
  const { employee, cv } = cvData;
  
  const firstName = employee.firstName;
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
    // Opis z CV jest ignorowany - używamy tylko opisu z bazy danych
    const projectDescription = (proj as any).project?.description || ""; // Opis z głównej tabeli projects
    const dates = proj.startDate && proj.endDate
      ? `${formatDate(proj.startDate)} - ${formatDate(proj.endDate)}`
      : proj.startDate
      ? `Od ${formatDate(proj.startDate)}`
      : "obecnie";
    const techs = proj.technologies || "";
    
    // Zbuduj informacje o projekcie dla AI
    let projectInfo = `Projekt: ${projectName}
Rola: ${role}
Okres: ${dates}`;
    
    // Dodaj opis projektu z głównej tabeli projects (jeśli istnieje) - JEDYNE źródło informacji
    if (projectDescription) {
      projectInfo += `\n\nOpis projektu z bazy danych (użyj jako źródła informacji o projekcie):
${projectDescription}

ZADANIE: Na podstawie powyższego opisu projektu, wygeneruj szczegółowy, atrakcyjny opis (3-4 zdania) o ROLI PRACOWNIKA w tym projekcie.
- Opis powyżej jest o PROJEKCIE - Ty musisz napisać o ROLI PRACOWNIKA w tym projekcie
- Użyj informacji z opisu projektu jako kontekstu, aby zrozumieć o czym jest projekt
- Napisz CAŁKOWICIE NOWY opis o tym, co pracownik robił w projekcie, jakie miał zadania i odpowiedzialności
- Skup się na roli, odpowiedzialności i osiągnięciach pracownika, nie na ogólnym opisie projektu
- NIE kopiuj słowo w słowo opisu projektu - przekształć go w opis roli pracownika
- Użyj innych słów i konstrukcji zdań niż w opisie projektu`;
    } else {
      projectInfo += `\n\nBrak opisu projektu w bazie danych - wygeneruj szczegółowy, atrakcyjny opis (3-4 zdania) o roli pracownika na podstawie roli i technologii.`;
    }
    
    if (techs) {
      projectInfo += `\nTechnologie używane w projekcie: ${techs}`;
    }
    
    return projectInfo;
  }).join("\n\n");
  
  const softSkills = cv.skills.map(s => s.skillName).join(", ");
  
  return `DANE PRACOWNIKA:
- Imię: ${firstName}
- Stanowisko: ${position}
- Poziom: ${seniorityLevel}
- Lata doświadczenia: ${cv.yearsOfExperience}

${cv.tagline ? `OBECNY TAGLINE (do ulepszenia - NIE KOPIUJ, stwórz NOWY, lepszy):\n${cv.tagline}\n\nZADANIE: Wygeneruj NOWY, bardziej atrakcyjny tagline (2-3 zdania) - nie kopiuj starego!` : "TAGLINE: Brak - wygeneruj krótki, zachęcający opis (2-3 zdania) na podstawie stanowiska, poziomu i technologii"}

${cv.summary ? `OBECNY OPIS PROFILU (do ulepszenia - NIE KOPIUJ, stwórz NOWY, lepszy):\n${cv.summary}\n\n${cv.tagline ? `UWAGA: Masz również dostęp do tagline pracownika, który zawiera kluczowe informacje:\n${cv.tagline}\n\nUżyj tych informacji, aby stworzyć spójny i bardziej szczegółowy opis profilu.` : ""}\n\nZADANIE: Wygeneruj NOWY, bardziej atrakcyjny opis profilu (3-4 zdania) - nie kopiuj starego!` : `OPIS PROFILU: Brak - wygeneruj atrakcyjny opis profilu (3-4 zdania)${cv.tagline ? `\n\nUWAGA: Masz dostęp do tagline pracownika, który zawiera kluczowe informacje:\n${cv.tagline}\n\nUżyj tych informacji, aby stworzyć spójny i szczegółowy opis profilu.` : ""}`}

UMIEJĘTNOŚCI MIĘKKIE (obecna lista - przekształć w atrakcyjny tekst 2-3 zdania):
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
  
  return `Jesteś ekspertem w tworzeniu profesjonalnych, atrakcyjnych opisów do CV dla firm bodyleasingowych. Twoim zadaniem jest wygenerowanie ulepszonych opisów tekstowych, które zachęcają klientów do współpracy z pracownikiem.

DANE PRACOWNIKA:
${dataForAI}

ZADANIE:
Wygeneruj ulepszone, atrakcyjne opisy tekstowe w formacie JSON. Zwróć TYLKO JSON bez dodatkowych komentarzy.

Format odpowiedzi (JSON):
{
  "tagline": "Krótki, zachęcający opis pracownika (2-3 zdania) - główny stack, typ projektów, kluczowe kompetencje, wartość biznesowa",
  "summary": "Atrakcyjny opis profilu pracownika (3-4 zdania) - doświadczenie, specjalizacja, umiejętności, korzyści dla klienta",
  "softSkills": "Ulepszona lista umiejętności miękkich - sformatowana jako naturalny tekst (2-3 zdania) zamiast suchej listy",
  "projectDescriptions": [
    {
      "projectName": "Nazwa projektu",
      "description": "Atrakcyjny, szczegółowy opis projektu (3-4 zdania) - rola, osiągnięcia, wartość biznesowa, technologie, wpływ na projekt"
    }
  ]
}

INSTRUKCJE (WAŻNE - CZYTAJ UWAŻNIE):
1. TAGLINE: ZAWSZE wygeneruj NOWY, krótki, zachęcający opis (2-3 zdania), który podkreśla wartość pracownika dla klienta. NIE KOPIUJ istniejącego tagline - stwórz lepszy! Użyj dynamicznego języka, który pokazuje kompetencje i gotowość do pracy.

2. SUMMARY: ZAWSZE stwórz NOWY, atrakcyjny opis profilu (3-4 zdania). NIE KOPIUJ istniejącego opisu - stwórz lepszy! 
   - Jeśli masz dostęp do tagline pracownika - użyj go jako źródła informacji, aby stworzyć spójny i bardziej szczegółowy opis profilu
   - Opis powinien podkreślać doświadczenie i specjalizację
   - Wskazywać na korzyści dla klienta
   - Pokazywać gotowość do wyzwań
   - Używać profesjonalnego, ale przystępnego języka
   - Opis profilu powinien być rozwinięciem i uzupełnieniem tagline, ale nie jego kopią

3. SOFT SKILLS: ZAWSZE przekształć listę umiejętności miękkich w NOWY, naturalny, atrakcyjny tekst (2-3 zdania), który pokazuje jak te umiejętności przekładają się na wartość dla klienta. Np. zamiast "Komunikacja, Praca zespołowa" napisz "Doskonale komunikuje się z zespołem i klientami, skutecznie zarządza czasem i priorytetami, co przekłada się na terminowe realizowanie projektów."

4. PROJECT DESCRIPTIONS: Dla każdego projektu ZAWSZE wygeneruj NOWY, szczegółowy, atrakcyjny opis (3-4 zdania) o ROLI PRACOWNIKA w projekcie.
   
   WAŻNE - RÓŻNICA:
   - "Opis projektu z bazy danych" = ogólny opis PROJEKTU (co to za projekt, co robi, jakie ma funkcjonalności)
   - Twoje zadanie = napisać opis ROLI PRACOWNIKA w tym projekcie (co pracownik robił, jakie miał zadania, odpowiedzialności, osiągnięcia)
   
   INSTRUKCJE:
   - Użyj "Opisu projektu z bazy danych" TYLKO jako kontekstu, aby zrozumieć o czym jest projekt
   - NIE kopiuj słowo w słowo opisu projektu - on jest o projekcie, a Ty piszesz o roli pracownika!
   - Przekształć informacje z opisu projektu w opis roli pracownika
   - Opis powinien podkreślać rolę i odpowiedzialność pracownika w kontekście całego projektu
   - Wskazywać na konkretne osiągnięcia i wartości dodane
   - Pokazywać użyte technologie i ich zastosowanie
   - Demonstrować wpływ na sukces projektu
   - Używać dynamicznego języka biznesowego
   - Skup się na tym, co pracownik robił, nie na ogólnym opisie projektu
   
   PRZYKŁADY:
   - Jeśli opis projektu z bazy to "Working on the entire architecture of the portal, responsibility for implementing commission mechanisms..."
   - NIE kopiuj tego!
   - Zamiast tego napisz np. "Odpowiedzialny za projektowanie i implementację architektury portalu, w tym mechanizmów rozliczeniowych dla kupujących i sprzedających zintegrowanych z modułem Stripe. Zarządzał zespołem junior developerów, odpowiadał za budowę mechanizmu kont użytkowników z wykorzystaniem technologii WebSocket oraz przygotowanie warstwy komunikacyjnej API umożliwiającej pełną współpracę backendu z frontendem opartym na Vue3."
   - Pokazuj ROLĘ i ODPOWIEDZIALNOŚĆ pracownika, nie ogólny opis projektu!

5. STYL PISANIA:
   - Używaj aktywnego języka (np. "Zrealizował", "Zoptymalizował", "Wprowadził")
   - Podkreślaj wartość biznesową i konkretne rezultaty
   - Używaj profesjonalnego, ale przystępnego języka
   - Unikaj ogólników - bądź konkretny
   - Pisz z perspektywy korzyści dla klienta

6. WAŻNE - OBOWIĄZKOWE: 
   - ZAWSZE generuj NOWE opisy - NIE KOPIUJ istniejących!
   - Jeśli widzisz "OBECNY TAGLINE" lub "OBECNY OPIS PROFILU" lub "Obecny opis" - to są stare opisy do ulepszenia, NIE do kopiowania!
   - Każde wygenerowanie CV powinno tworzyć NOWE, lepsze opisy niż poprzednie
   - Wszystkie opisy powinny być atrakcyjne, profesjonalne i zachęcające do współpracy
   - Pokazuj wartość pracownika, nie tylko listę technologii

Zwróć TYLKO JSON, bez dodatkowych komentarzy ani wyjaśnień.`;
}

function buildCVPromptLegacy(cvData: CVData): string {
  const { employee, cv } = cvData;
  
  const firstName = employee.firstName;
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
- Imię: ${firstName}
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
      temperature: 1.0, // Maksymalna temperatura = najbardziej kreatywne i różnorodne opisy (zapobiega kopiowaniu)
      response_format: { type: "json_object" },
      max_tokens: 2500, // Więcej tokenów dla dłuższych opisów
    });
    
    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error("Nie udało się wygenerować opisów. Model nie zwrócił treści.");
    }
    
    console.log('[generateCVHTML] Descriptions generated, tokens used:', completion.usage?.total_tokens);
    console.log('[generateCVHTML] AI Response:', responseContent.substring(0, 500)); // Loguj pierwsze 500 znaków odpowiedzi
    
    // Parsuj odpowiedź JSON
    let improvedDescriptions: ImprovedDescriptions;
    try {
      improvedDescriptions = JSON.parse(responseContent);
      console.log('[generateCVHTML] Parsed descriptions:', {
        hasTagline: !!improvedDescriptions.tagline,
        hasSummary: !!improvedDescriptions.summary,
        hasSoftSkills: !!improvedDescriptions.softSkills,
        projectCount: improvedDescriptions.projectDescriptions?.length || 0
      });
    } catch (parseError) {
      console.error('[generateCVHTML] Error parsing JSON response:', parseError);
      console.error('[generateCVHTML] Raw response:', responseContent);
      throw new Error(`Błąd parsowania odpowiedzi AI: ${parseError instanceof Error ? parseError.message : 'Nieznany błąd'}`);
    }
    
    // KROK 3: Wstaw ulepszone opisy do szablonu (OBOWIĄZKOWE - zawsze muszą być nowe opisy)
    let finalHTML = filledTemplate;
    
    // Tagline - zawsze wymagany
    if (improvedDescriptions.tagline) {
      finalHTML = finalHTML.replace(/\{\{TAGLINE\}\}/g, improvedDescriptions.tagline);
      console.log('[generateCVHTML] Użyto nowego tagline z AI');
    } else {
      console.warn('[generateCVHTML] Brak tagline z AI - używam fallback');
      finalHTML = finalHTML.replace(/\{\{TAGLINE\}\}/g, cvDataWithProjects.cv.tagline || "Specjalista z doświadczeniem w nowoczesnych technologiach.");
    }
    
    // Summary - zawsze wymagany
    if (improvedDescriptions.summary) {
      finalHTML = finalHTML.replace(/\{\{SUMMARY\}\}/g, improvedDescriptions.summary);
      console.log('[generateCVHTML] Użyto nowego summary z AI');
    } else {
      console.warn('[generateCVHTML] Brak summary z AI - używam fallback');
      finalHTML = finalHTML.replace(/\{\{SUMMARY\}\}/g, cvDataWithProjects.cv.summary || "Doświadczony specjalista gotowy do wyzwań.");
    }
    
    // Soft Skills - zawsze wymagany
    if (improvedDescriptions.softSkills) {
      finalHTML = finalHTML.replace(/\{\{SOFT_SKILLS\}\}/g, improvedDescriptions.softSkills);
      // Usuń warunkowe znaczniki jeśli były
      finalHTML = finalHTML.replace(/\{\{#IF_SOFT_SKILLS\}\}/g, "");
      finalHTML = finalHTML.replace(/\{\{\/IF_SOFT_SKILLS\}\}/g, "");
      console.log('[generateCVHTML] Użyto nowych softSkills z AI');
    } else {
      console.warn('[generateCVHTML] Brak softSkills z AI - używam fallback');
      const fallbackSoftSkills = cvDataWithProjects.cv.skills.map((s: { skillName: string }) => s.skillName).join(", ");
      finalHTML = finalHTML.replace(/\{\{SOFT_SKILLS\}\}/g, fallbackSoftSkills || "Komunikacja, praca zespołowa, zarządzanie czasem");
      finalHTML = finalHTML.replace(/\{\{#IF_SOFT_SKILLS\}\}/g, "");
      finalHTML = finalHTML.replace(/\{\{\/IF_SOFT_SKILLS\}\}/g, "");
    }
    
    // Opisy projektów - zawsze wymagane
    // Najpierw zbierz wszystkie nazwy projektów z CV, aby sprawdzić, które zostały przetworzone przez AI
    const allProjectNames = cvDataWithProjects.cv.projects.map(p => (p.project?.name || "").trim()).filter(Boolean);
    console.log('[generateCVHTML] Wszystkie projekty w CV:', allProjectNames);
    
    if (improvedDescriptions.projectDescriptions && improvedDescriptions.projectDescriptions.length > 0) {
      console.log('[generateCVHTML] AI zwróciło opisy dla projektów:', improvedDescriptions.projectDescriptions.map(p => p.projectName));
      
      improvedDescriptions.projectDescriptions.forEach((improved: { projectName: string; description: string }) => {
        // Znajdź dokładną nazwę projektu z CV (case-insensitive, ignoruj białe znaki)
        const matchingProject = cvDataWithProjects.cv.projects.find(p => {
          const cvProjectName = (p.project?.name || "").trim();
          const aiProjectName = improved.projectName.trim();
          return cvProjectName.toLowerCase() === aiProjectName.toLowerCase();
        });
        
        if (matchingProject) {
          const exactProjectName = matchingProject.project?.name || improved.projectName;
          const placeholder = `{{PROJECT_DESC_${exactProjectName}}}`;
          const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          finalHTML = finalHTML.replace(new RegExp(escapedPlaceholder, 'g'), improved.description);
          console.log(`[generateCVHTML] Zastąpiono opis projektu z AI: "${exactProjectName}" (dopasowano z "${improved.projectName}")`);
        } else {
          console.warn(`[generateCVHTML] Nie znaleziono projektu w CV dla nazwy z AI: "${improved.projectName}"`);
          // Spróbuj zastąpić bezpośrednio używając nazwy z AI
          const placeholder = `{{PROJECT_DESC_${improved.projectName}}}`;
          const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          finalHTML = finalHTML.replace(new RegExp(escapedPlaceholder, 'g'), improved.description);
          console.log(`[generateCVHTML] Zastąpiono opis projektu z AI (bez dopasowania): "${improved.projectName}"`);
        }
      });
    } else {
      console.warn('[generateCVHTML] Brak projectDescriptions z AI - sprawdzam czy są projekty do przetworzenia');
      console.log('[generateCVHTML] Liczba projektów w CV:', cvDataWithProjects.cv.projects.length);
      cvDataWithProjects.cv.projects.forEach((proj, idx) => {
        console.log(`[generateCVHTML] Projekt ${idx + 1}: "${proj.project?.name || 'Brak nazwy'}", opis z bazy: ${proj.project?.description ? 'TAK' : 'NIE'}, opis z CV: ${proj.projectDescription ? 'TAK' : 'NIE'}`);
      });
    }
    
    // Usuń wszystkie pozostałe placeholdery projektów (jeśli AI nie zwróciło opisu dla jakiegoś projektu)
    // Użyj opisu projektu z bazy danych jako fallback TYLKO jeśli AI nie zwróciło opisu
    finalHTML = finalHTML.replace(/\{\{PROJECT_DESC_([^}]+)\}\}/g, (match, projectName) => {
      console.warn(`[generateCVHTML] AI nie zwróciło opisu dla projektu: "${projectName}" - używam fallback`);
      // Znajdź projekt w danych (case-insensitive)
      const project = cvDataWithProjects.cv.projects.find(p => {
        const cvProjectName = (p.project?.name || "").trim();
        const placeholderName = projectName.trim();
        return cvProjectName.toLowerCase() === placeholderName.toLowerCase();
      });
      
      if (!project) {
        console.warn(`[generateCVHTML] Fallback: Nie znaleziono projektu dla: "${projectName}"`);
        return "Opis projektu w przygotowaniu.";
      }
      
      // Priorytet: użyj opisu z CV (jeśli istnieje), potem z bazy danych
      if (project.projectDescription) {
        console.log(`[generateCVHTML] Fallback: Używam opisu z CV dla: "${projectName}"`);
        return project.projectDescription;
      }
      if (project.project?.description) {
        console.log(`[generateCVHTML] Fallback: Używam opisu projektu z bazy danych dla: "${projectName}"`);
        return project.project.description;
      }
      console.warn(`[generateCVHTML] Fallback: Brak opisu dla projektu: "${projectName}"`);
      return "Opis projektu w przygotowaniu.";
    });
    
    // Usuń wszystkie pozostałe placeholder-y (jeśli jakieś zostały)
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
  
  // Tylko imię, bez nazwiska
  const firstName = employee.firstName;
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
      
      // Zawsze używaj placeholder-a dla opisu projektu, aby AI mógł go zastąpić
      return `      <article class="project">
        <div class="project-top">
          <div class="project-name">${projectName}</div>
          <div class="project-period">${dates}</div>
        </div>
        <div class="project-role">Rola: ${role}</div>
        <div class="project-desc">{{PROJECT_DESC_${projectName}}}</div>
        ${techs ? `<div class="project-tech">\n          Technologie: ${techs}\n        </div>` : ""}
      </article>`;
    }).join("\n\n      ");
  } else {
    projectsHTMLFormatted = `      <p class="section-text">Brak projektów</p>`;
  }
  
  // Formatuj umiejętności miękkie
  const softSkills = cv.skills.map(s => s.skillName).join(", ");
  
  // Wypełnij szablon danymi (ZAWSZE zostaw placeholder-y dla opisów które będą ulepszone przez AI)
  template = template.replace(/\{\{FULL_NAME\}\}/g, firstName);
  template = template.replace(/\{\{POSITION\}\}/g, position);
  template = template.replace(/\{\{SENIORITY_LEVEL\}\}/g, seniorityLevel);
  // ZAWSZE zostaw placeholder-y dla opisów - AI je zastąpi
  template = template.replace(/\{\{TAGLINE\}\}/g, "{{TAGLINE}}");
  template = template.replace(/\{\{SUMMARY\}\}/g, "{{SUMMARY}}");
  template = template.replace(/\{\{TECHNOLOGIES_TABLE\}\}/g, technologiesTableRows.trim());
  template = template.replace(/\{\{SOFT_SKILLS\}\}/g, "{{SOFT_SKILLS}}");
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

