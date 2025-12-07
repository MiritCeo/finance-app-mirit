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

function buildCVDataForAI(cvData: CVData, language: "pl" | "en" = "pl"): string {
  const { employee, cv } = cvData;
  
  // Tłumaczenia dla danych
  const translations = {
    pl: {
      proficiency: {
        beginner: "podstawowy",
        intermediate: "średnio zaawansowany",
        advanced: "zaawansowany",
        expert: "ekspert",
      },
      labels: {
        employee: "Pracownik",
        project: "Projekt",
        role: "Rola",
        period: "Okres",
        from: "Od",
        currently: "obecnie",
        projectDescription: "Opis projektu z bazy danych (użyj jako źródła informacji o projekcie):",
        technologiesUsed: "Technologie używane przez pracownika w tym projekcie:",
        important: "WAŻNE: Użyj powyższych technologii w opisie, aby pokazać konkretne umiejętności techniczne pracownika.",
        task: "ZADANIE: Na podstawie powyższego opisu projektu i technologii, wygeneruj szczegółowy, atrakcyjny opis (3-4 zdania) o ROLI PRACOWNIKA w tym projekcie.",
        taskInstructions: [
          "- Opis projektu powyżej jest o PROJEKCIE - Ty musisz napisać o ROLI PRACOWNIKA w tym projekcie",
          "- Użyj informacji z opisu projektu jako kontekstu, aby zrozumieć o czym jest projekt",
          "- WYKORZYSTAJ technologie wymienione powyżej - użyj ich nazw w opisie, aby pokazać konkretne umiejętności techniczne",
          "- Napisz CAŁKOWICIE NOWY opis o tym, co pracownik robił w projekcie, jakie miał zadania i odpowiedzialności",
          "- Użyj naturalnego, technicznego języka - wymieniaj technologie, frameworki, narzędzia, które pracownik używał",
          "- Skup się na roli, odpowiedzialności i osiągnięciach pracownika, nie na ogólnym opisie projektu",
          "- NIE kopiuj słowo w słowo opisu projektu - przekształć go w opis roli pracownika z użyciem technologii",
          "- Użyj innych słów i konstrukcji zdań niż w opisie projektu",
          '- Przykład: "Odpowiedzialny za implementację mechanizmów rozliczeniowych z wykorzystaniem Stripe API i Laravel..."',
        ],
        noProjectDescription: "Brak opisu projektu w bazie danych - wygeneruj szczegółowy, atrakcyjny opis (3-4 zdania) o roli pracownika na podstawie roli i technologii wymienionych powyżej.",
      },
    },
    en: {
      proficiency: {
        beginner: "beginner",
        intermediate: "intermediate",
        advanced: "advanced",
        expert: "expert",
      },
      labels: {
        employee: "Employee",
        project: "Project",
        role: "Role",
        period: "Period",
        from: "From",
        currently: "currently",
        projectDescription: "Project description from database (use as source of information about the project):",
        technologiesUsed: "Technologies used by employee in this project:",
        important: "IMPORTANT: Use the above technologies in the description to show specific technical skills of the employee.",
        task: "TASK: Based on the above project description and technologies, generate a detailed, attractive description (3-4 sentences) about the EMPLOYEE'S ROLE in this project.",
        taskInstructions: [
          "- The project description above is about the PROJECT - you must write about the EMPLOYEE'S ROLE in this project",
          "- Use information from the project description as context to understand what the project is about",
          "- USE the technologies listed above - mention their names in the description to show specific technical skills",
          "- Write a COMPLETELY NEW description about what the employee did in the project, what tasks and responsibilities they had",
          "- Use natural, technical language - mention technologies, frameworks, tools that the employee used",
          "- Focus on the employee's role, responsibility and achievements, not on the general project description",
          "- DO NOT copy the project description word for word - transform it into an employee role description using technologies",
          "- Use different words and sentence structures than in the project description",
          '- Example: "Responsible for implementing commission mechanisms using Stripe API and Laravel..."',
        ],
        noProjectDescription: "No project description in database - generate a detailed, attractive description (3-4 sentences) about the employee's role based on the role and technologies listed above.",
      },
    },
  };
  
  const t = translations[language];
  
  const firstName = employee.firstName;
  const position = employee.position || t.labels.employee;
  const seniorityLevel = cv.seniorityLevel || (cv.yearsOfExperience >= 5 ? "Senior" : cv.yearsOfExperience >= 2 ? "Mid" : "Junior");
  
  // Formatuj technologie
  const technologiesByCategory: Record<string, Array<{ name: string; proficiency: string }>> = {};
  cv.technologies.forEach(tech => {
    const category = tech.category || (language === "en" ? "Other" : "Inne");
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
      return `${cat}: ${techs.map(tech => `${tech.name} (${(t.proficiency as Record<string, string>)[tech.proficiency] || tech.proficiency})`).join(", ")}`;
    })
    .join("\n");
  
  // Formatuj języki
  const languagesText = cv.languages && cv.languages.length > 0
    ? cv.languages.map(l => `${l.languageName}${l.level ? ` - ${l.level}` : ""}`).join("\n")
    : language === "en" 
      ? "Polish - native\nEnglish - B2 / C1"
      : "Polski - ojczysty\nAngielski - B2 / C1";
  
  // Formatuj projekty
  const projectsText = cv.projects.map((proj, idx) => {
    const projectName = proj.project?.name || (language === "en" ? `Project ${idx + 1}` : `Projekt ${idx + 1}`);
    const role = proj.role || "Developer";
    // Opis z CV jest ignorowany - używamy tylko opisu z bazy danych
    const projectDescription = (proj as any).project?.description || ""; // Opis z głównej tabeli projects
    
    // Loguj jeśli brak informacji o projekcie
    if (!proj.project) {
      console.warn(`[buildCVDataForAI] Projekt ${idx + 1} (${projectName}): Brak obiektu project w danych`);
    } else if (!projectDescription) {
      console.warn(`[buildCVDataForAI] Projekt ${idx + 1} (${projectName}): Brak opisu projektu w bazie danych`);
    }
    const dates = proj.startDate && proj.endDate
      ? `${formatDate(proj.startDate)} - ${formatDate(proj.endDate)}`
      : proj.startDate
      ? `${t.labels.from} ${formatDate(proj.startDate)}`
      : t.labels.currently;
    const techs = proj.technologies || "";
    const keywords = (proj as any).keywords || "";
    
    // Zbuduj informacje o projekcie dla AI
    let projectInfo = `${t.labels.project}: ${projectName}
${t.labels.role}: ${role}
${t.labels.period}: ${dates}`;
    
    // Dodaj opis projektu z głównej tabeli projects (jeśli istnieje) - JEDYNE źródło informacji
    if (projectDescription) {
      projectInfo += `\n\n${t.labels.projectDescription}
${projectDescription}`;
    }
    
    // Dodaj technologie używane przez pracownika w projekcie - WAŻNE dla naturalnego, technicznego języka
    if (techs) {
      projectInfo += `\n\n${t.labels.technologiesUsed} ${techs}`;
      projectInfo += `\n\n${t.labels.important}`;
    }
    
    // Dodaj słowa kluczowe - WAŻNE dla lepszego opisu projektu i roli pracownika
    if (keywords) {
      const keywordsLabel = language === "en" 
        ? "KEYWORDS (use these to better describe the project and employee's role):"
        : "SŁOWA KLUCZOWE (użyj ich, aby lepiej opisać projekt i rolę pracownika):";
      projectInfo += `\n\n${keywordsLabel} ${keywords}`;
      const keywordsInstruction = language === "en"
        ? "\n\nIMPORTANT: Use these keywords naturally in the description to highlight key aspects, achievements, and value delivered by the employee. Integrate them into the text, don't just list them."
        : "\n\nWAŻNE: Użyj tych słów kluczowych naturalnie w opisie, aby podkreślić kluczowe aspekty, osiągnięcia i wartość dostarczoną przez pracownika. Wpleć je w tekst, nie tylko je wymieniaj.";
      projectInfo += keywordsInstruction;
    }
    
    // Dodaj instrukcje zadania z wyraźnym przypomnieniem o języku
    const languageReminder = language === "en"
      ? "\n\nCRITICAL: This description MUST be written in ENGLISH. Do not use Polish or any other language."
      : "\n\nKRYTYCZNE: Ten opis MUSI być napisany w języku POLSKIM. Nie używaj angielskiego ani żadnego innego języka.";
    
    if (projectDescription) {
      projectInfo += `\n\n${t.labels.task}${languageReminder}`;
      t.labels.taskInstructions.forEach(instruction => {
        projectInfo += `\n${instruction}`;
      });
    } else {
      if (techs) {
        projectInfo += `\n\n${t.labels.noProjectDescription}
${t.labels.task}:${languageReminder}
- ${language === "en" ? "Use the technologies listed above - mention their names in the description" : "Wykorzystaj technologie wymienione powyżej - użyj ich nazw w opisie"}
- ${language === "en" ? "Write a natural, technical description showing specific employee skills" : "Napisz naturalny, techniczny opis pokazujący konkretne umiejętności pracownika"}
- ${language === "en" ? "Focus on the employee's role and responsibility using technologies" : "Skup się na roli i odpowiedzialności pracownika z użyciem technologii"}`;
      } else {
        projectInfo += `\n\n${t.labels.noProjectDescription}${languageReminder}`;
      }
    }
    
    return projectInfo;
  }).join("\n\n");
  
  const softSkills = cv.skills.map(s => s.skillName).join(", ");
  
  if (language === "en") {
    return `EMPLOYEE DATA:
- First name: ${firstName}
- Position: ${position}
- Level: ${seniorityLevel}
- Years of experience: ${cv.yearsOfExperience}

${cv.tagline ? `CURRENT TAGLINE (to improve - DO NOT COPY, create a NEW, better one):\n${cv.tagline}\n\nTASK: Generate a NEW, more attractive tagline (2-3 sentences) - do not copy the old one!` : "TAGLINE: None - generate a short, engaging description (2-3 sentences) based on position, level and technologies"}

${cv.summary ? `CURRENT PROFILE DESCRIPTION (to improve - DO NOT COPY, create a NEW, better one):\n${cv.summary}\n\n${cv.tagline ? `NOTE: You also have access to the employee's tagline, which contains key information:\n${cv.tagline}\n\nUse this information to create a consistent and more detailed profile description.` : ""}\n\nTASK: Generate a NEW, more attractive profile description (3-4 sentences) - do not copy the old one!` : `PROFILE DESCRIPTION: None - generate an attractive profile description (3-4 sentences)${cv.tagline ? `\n\nNOTE: You have access to the employee's tagline, which contains key information:\n${cv.tagline}\n\nUse this information to create a consistent and detailed profile description.` : ""}`}

SOFT SKILLS (current list - transform into attractive text 2-3 sentences):
${softSkills || "None"}

TECHNOLOGIES:
${techText || "None"}

LANGUAGES:
${languagesText}

PROJECTS:
${projectsText || "No projects"}`;
  }
  
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

function buildCVPrompt(cvData: CVData, language: "pl" | "en" = "pl"): string {
  const dataForAI = buildCVDataForAI(cvData, language);
  
  if (language === "en") {
    return `You are an expert in creating professional, attractive CV descriptions for bodyleasing companies. Your task is to generate improved text descriptions that encourage clients to work with the employee.

CRITICAL - LANGUAGE REQUIREMENT:
ALL descriptions (tagline, summary, soft skills, and ALL project descriptions) MUST be written in ENGLISH. Do not mix languages. Every single description must be in English.

EMPLOYEE DATA:
${dataForAI}

TASK:
Generate improved, attractive text descriptions in JSON format. Return ONLY JSON without additional comments. ALL descriptions must be in ENGLISH.

Response format (JSON):
{
  "tagline": "Short, engaging employee description (2-3 sentences) - main stack, project types, key competencies, business value",
  "summary": "Attractive employee profile description (3-4 sentences) - experience, specialization, skills, benefits for the client",
  "softSkills": "Improved soft skills list - formatted as natural text (2-3 sentences) instead of a dry list",
  "projectDescriptions": [
    {
      "projectName": "Project name",
      "description": "Attractive, detailed project description (3-4 sentences) - role, achievements, business value, technologies, impact on the project"
    }
  ]
}

INSTRUCTIONS (IMPORTANT - READ CAREFULLY):
1. TAGLINE: ALWAYS generate a NEW, short, engaging description (2-3 sentences) that highlights the employee's value to the client. DO NOT COPY the existing tagline - create a better one! Use dynamic language that shows competencies and readiness to work.

2. SUMMARY: ALWAYS create a NEW, attractive profile description (3-4 sentences). DO NOT COPY the existing description - create a better one!
   - If you have access to the employee's tagline - use it as a source of information to create a consistent and more detailed profile description
   - The description should emphasize experience and specialization
   - Indicate benefits for the client
   - Show readiness for challenges
   - Use professional but accessible language
   - The profile description should be an expansion and complement to the tagline, but not a copy of it

3. SOFT SKILLS: ALWAYS transform the soft skills list into a NEW, natural, attractive text (2-3 sentences) that shows how these skills translate into value for the client. For example, instead of "Communication, Teamwork" write "Excellent communication with team and clients, effective time and priority management, which translates into timely project completion."

4. PROJECT DESCRIPTIONS: For each project ALWAYS generate a NEW, detailed, attractive description (3-4 sentences) about the EMPLOYEE'S ROLE in the project.
   
   CRITICAL - LANGUAGE: ALL project descriptions MUST be written in ENGLISH. Do not mix languages. Every project description must be in English.
   
   IMPORTANT - DIFFERENCE:
   - "Project description from database" = general PROJECT description (what the project is, what it does, what functionalities it has)
   - "Technologies used by employee" = specific technologies, frameworks, tools that the employee used
   - Your task = write a description of the EMPLOYEE'S ROLE in this project (what the employee did, what tasks, responsibilities, achievements they had)
   
   INSTRUCTIONS:
   - Use "Project description from database" ONLY as context to understand what the project is about
   - USE "Technologies used by employee" - mention them in the description to show specific technical skills
   - USE "KEYWORDS" if provided - integrate them naturally into the description to highlight key aspects, achievements, challenges solved, and business value delivered
   - DO NOT copy the project description word for word - it's about the project, and you're writing about the employee's role!
   - Transform information from the project description into an employee role description using technologies and keywords
   - Use natural, technical language - mention technologies, frameworks, tools in the context of the employee's tasks
   - The description should emphasize the employee's role and responsibility in the context of the entire project
   - Indicate specific achievements and added value (use keywords to highlight these)
   - Show technologies used and their practical application in the project
   - Demonstrate impact on project success
   - Use dynamic business language with technical elements
   - Focus on what the employee did, using specific technologies and keywords naturally
   
   EXAMPLES:
   - If the project description from database is "Working on the entire architecture of the portal, responsibility for implementing commission mechanisms..."
   - And technologies are "PHP, Laravel, Vue, Rest API, Websocket, Redis"
   - DO NOT copy the project description!
   - Instead write e.g. "Responsible for designing and implementing the portal architecture in Laravel, including commission mechanisms for buyers and sellers integrated with Stripe API module. Managed a team of junior developers, was responsible for building the user account mechanism using WebSocket and preparing the communication layer REST API enabling full cooperation between backend (Laravel) and frontend based on Vue3. Used Redis to optimize system performance."
   - Show the EMPLOYEE'S ROLE and RESPONSIBILITY using specific technologies!

5. WRITING STYLE:
   - Use active language (e.g. "Implemented", "Optimized", "Introduced")
   - Emphasize business value and concrete results
   - Use professional but accessible language
   - Avoid generalities - be specific
   - Write from the perspective of benefits for the client

6. IMPORTANT - MANDATORY: 
   - ALWAYS generate NEW descriptions - DO NOT COPY existing ones!
   - If you see "CURRENT TAGLINE" or "CURRENT PROFILE DESCRIPTION" or "Current description" - these are old descriptions to improve, NOT to copy!
   - Each CV generation should create NEW, better descriptions than previous ones
   - All descriptions should be attractive, professional and encouraging cooperation
   - Show the employee's value, not just a list of technologies

Return ONLY JSON, without additional comments or explanations.`;
  }
  
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
   
   KRYTYCZNE - JĘZYK: WSZYSTKIE opisy projektów MUSZĄ być napisane w języku POLSKIM. Nie mieszaj języków. Każdy opis projektu musi być po polsku.
   
   WAŻNE - RÓŻNICA:
   - "Opis projektu z bazy danych" = ogólny opis PROJEKTU (co to za projekt, co robi, jakie ma funkcjonalności)
   - "Technologie używane przez pracownika" = konkretne technologie, frameworki, narzędzia, które pracownik używał
   - Twoje zadanie = napisać opis ROLI PRACOWNIKA w tym projekcie (co pracownik robił, jakie miał zadania, odpowiedzialności, osiągnięcia)
   
   INSTRUKCJE:
   - Użyj "Opisu projektu z bazy danych" TYLKO jako kontekstu, aby zrozumieć o czym jest projekt
   - WYKORZYSTAJ "Technologie używane przez pracownika" - wymieniaj je w opisie, aby pokazać konkretne umiejętności techniczne
   - WYKORZYSTAJ "SŁOWA KLUCZOWE" jeśli są podane - wpleć je naturalnie w opis, aby podkreślić kluczowe aspekty, osiągnięcia, rozwiązane wyzwania i wartość biznesową
   - NIE kopiuj słowo w słowo opisu projektu - on jest o projekcie, a Ty piszesz o roli pracownika!
   - Przekształć informacje z opisu projektu w opis roli pracownika z użyciem technologii i słów kluczowych
   - Użyj naturalnego, technicznego języka - wymieniaj technologie, frameworki, narzędzia w kontekście zadań pracownika
   - Opis powinien podkreślać rolę i odpowiedzialność pracownika w kontekście całego projektu
   - Wskazywać na konkretne osiągnięcia i wartości dodane (użyj słów kluczowych, aby to podkreślić)
   - Pokazywać użyte technologie i ich praktyczne zastosowanie w projekcie
   - Demonstrować wpływ na sukces projektu
   - Używać dynamicznego języka biznesowego z elementami technicznymi
   - Skup się na tym, co pracownik robił, używając konkretnych technologii i słów kluczowych naturalnie
   
   PRZYKŁADY:
   - Jeśli opis projektu z bazy to "Working on the entire architecture of the portal, responsibility for implementing commission mechanisms..."
   - I technologie to "PHP, Laravel, Vue, Rest API, Websocket, Redis"
   - NIE kopiuj opisu projektu!
   - Zamiast tego napisz np. "Odpowiedzialny za projektowanie i implementację architektury portalu w Laravel, w tym mechanizmów rozliczeniowych dla kupujących i sprzedających zintegrowanych z modułem Stripe API. Zarządzał zespołem junior developerów, odpowiadał za budowę mechanizmu kont użytkowników z wykorzystaniem WebSocket oraz przygotowanie warstwy komunikacyjnej REST API umożliwiającej pełną współpracę backendu (Laravel) z frontendem opartym na Vue3. Wykorzystywał Redis do optymalizacji wydajności systemu."
   - Pokazuj ROLĘ i ODPOWIEDZIALNOŚĆ pracownika z użyciem konkretnych technologii!

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

export async function generateCVHTML(employeeId: number, language: "pl" | "en" = "pl"): Promise<{ html: string; historyId: number }> {
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
  
  console.log(`[generateCVHTML] Pobrano ${cvProjects.length} projektów z bazy danych`);
  cvProjects.forEach((p, idx) => {
    console.log(`[generateCVHTML] Projekt z bazy ${idx + 1}:`, {
      projectId: p.cvProject.projectId,
      projectName: p.project?.name || 'Brak nazwy',
      hasProjectObject: !!p.project,
      hasDescription: !!(p.project as any)?.description,
      descriptionLength: (p.project as any)?.description?.length || 0
    });
  });
  
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
  const filledTemplate = fillCVTemplate(cvDataWithProjects, language);
  
  // KROK 2: Wyślij tylko dane tekstowe do AI z prośbą o ulepszenie opisów
  const prompt = buildCVPrompt(cvDataWithProjects, language);
  
  try {
    console.log('[generateCVHTML] Generating improved descriptions for employee:', employeeId);
    console.log('[generateCVHTML] Language:', language);
    console.log('[generateCVHTML] Number of projects:', cvDataWithProjects.cv.projects.length);
    
    // Loguj szczegóły projektów dla debugowania
    cvDataWithProjects.cv.projects.forEach((proj, idx) => {
      console.log(`[generateCVHTML] Project ${idx + 1}:`, {
        name: proj.project?.name || 'Brak nazwy',
        hasProjectObject: !!proj.project,
        hasProjectDescription: !!(proj.project as any)?.description,
        hasCVDescription: !!proj.projectDescription,
        role: proj.role,
        technologies: proj.technologies,
        keywords: (proj as any).keywords,
      });
    });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: language === "en" 
            ? "You are an expert in creating professional CV descriptions. You return only JSON with improved text descriptions. CRITICAL: ALL descriptions must be in ENGLISH - do not mix languages."
            : "Jesteś ekspertem w tworzeniu profesjonalnych opisów do CV. Zwracasz tylko JSON z ulepszonymi opisami tekstowymi. KRYTYCZNE: WSZYSTKIE opisy muszą być w języku POLSKIM - nie mieszaj języków.",
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
        projectCount: improvedDescriptions.projectDescriptions?.length || 0,
        projectNames: improvedDescriptions.projectDescriptions?.map(p => p.projectName) || []
      });
      
      // Sprawdź czy wszystkie projekty mają opisy
      if (improvedDescriptions.projectDescriptions) {
        const expectedProjectNames = cvDataWithProjects.cv.projects.map(p => (p.project?.name || "").trim()).filter(Boolean);
        const aiProjectNames = improvedDescriptions.projectDescriptions.map(p => p.projectName.trim());
        const missingProjects = expectedProjectNames.filter(name => 
          !aiProjectNames.some(aiName => aiName.toLowerCase() === name.toLowerCase())
        );
        if (missingProjects.length > 0) {
          console.warn(`[generateCVHTML] AI nie zwróciło opisów dla projektów: ${missingProjects.join(', ')}`);
        }
      }
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
    const historyId = await saveCVHistory(employeeId, cvData.id, finalHTML, language);
    console.log('[generateCVHTML] CV saved to history with id:', historyId);
    
    return { html: finalHTML, historyId };
  } catch (error: any) {
    console.error('[generateCVHTML] Error:', error);
    throw new Error(`Błąd podczas generowania CV: ${error.message || "Nieznany błąd"}`);
  }
}

function fillCVTemplate(cvData: CVData, language: "pl" | "en" = "pl"): string {
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
  
  // Tłumaczenia w zależności od języka
  const translations = {
    pl: {
      proficiency: {
        beginner: "podstawowy",
        intermediate: "średnio zaawansowany",
        advanced: "zaawansowany",
        expert: "ekspert",
      },
      category: {
        backend: "Języki / backend",
        frontend: "Frontend",
        database: "Bazy danych",
        devops: "DevOps / chmura",
        mobile: "Mobile",
        tools: "Inne",
        testing: "Testowanie",
      },
      sections: {
        profile: "Profil",
        technologies: "Technologie",
        softSkills: "Umiejętności miękkie",
        languages: "Języki",
        projects: "Projekty i rola",
      },
      labels: {
        role: "Rola:",
        technologies: "Technologie:",
        noProjects: "Brak projektów",
        bodyleasing: "Bodyleasing – profil wewnętrzny",
        yearsOfExperience: "Lata doświadczenia:",
        native: "ojczysty",
        englishLevel: "B2 / C1 – swobodna komunikacja w projektach",
        currently: "obecnie",
        from: "Od",
        polish: "Polski",
        english: "Angielski",
      },
    },
    en: {
      proficiency: {
        beginner: "beginner",
        intermediate: "intermediate",
        advanced: "advanced",
        expert: "expert",
      },
      category: {
        backend: "Languages / Backend",
        frontend: "Frontend",
        database: "Databases",
        devops: "DevOps / Cloud",
        mobile: "Mobile",
        tools: "Other",
        testing: "Testing",
      },
      sections: {
        profile: "Profile",
        technologies: "Technologies",
        softSkills: "Soft Skills",
        languages: "Languages",
        projects: "Projects and Role",
      },
      labels: {
        role: "Role:",
        technologies: "Technologies:",
        noProjects: "No projects",
        bodyleasing: "Bodyleasing – internal profile",
        yearsOfExperience: "Years of experience:",
        native: "native",
        englishLevel: "B2 / C1 – fluent communication in projects",
        currently: "currently",
        from: "From",
        polish: "Polish",
        english: "English",
      },
    },
  };
  
  const t = translations[language];
  
  const proficiencyMap = t.proficiency;
  const categoryLabels = t.category;
  
  // Formatuj technologie do tabeli HTML
  let technologiesTableRows = "";
  Object.entries(technologiesByCategory).forEach(([category, techs]) => {
    const categoryLabel = (categoryLabels as Record<string, string>)[category] || category;
    const techRows = techs.map(tech => {
      const proficiency = (proficiencyMap as Record<string, string>)[tech.proficiency] || tech.proficiency;
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
        <span>${t.labels.polish}</span>
        <span class="lang-level">${t.labels.native}</span>
      </div>
      <div class="lang-row">
        <span>${t.labels.english}</span>
        <span class="lang-level">${t.labels.englishLevel}</span>
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
        ? `${t.labels.from} ${formatDate(proj.startDate)}`
        : t.labels.currently;
      const techs = proj.technologies || "";
      
      // Zawsze używaj placeholder-a dla opisu projektu, aby AI mógł go zastąpić
      return `      <article class="project">
        <div class="project-top">
          <div class="project-name">${projectName}</div>
          <div class="project-period">${dates}</div>
        </div>
        <div class="project-role">${t.labels.role} ${role}</div>
        <div class="project-desc">{{PROJECT_DESC_${projectName}}}</div>
        ${techs ? `<div class="project-tech">\n          ${t.labels.technologies} ${techs}\n        </div>` : ""}
      </article>`;
    }).join("\n\n      ");
  } else {
    projectsHTMLFormatted = `      <p class="section-text">${t.labels.noProjects}</p>`;
  }
  
  // Formatuj umiejętności miękkie
  const softSkills = cv.skills.map(s => s.skillName).join(", ");
  
  // Wypełnij szablon danymi (ZAWSZE zostaw placeholder-y dla opisów które będą ulepszone przez AI)
  template = template.replace(/\{\{FULL_NAME\}\}/g, firstName);
  template = template.replace(/\{\{POSITION\}\}/g, position);
  template = template.replace(/\{\{SENIORITY_LEVEL\}\}/g, seniorityLevel);
  template = template.replace(/\{\{YEARS_OF_EXPERIENCE\}\}/g, `${t.labels.yearsOfExperience} ${cv.yearsOfExperience}`);
  
  // Tłumacz nagłówki sekcji
  template = template.replace(/<h2 class="section-title">Profil<\/h2>/g, `<h2 class="section-title">${t.sections.profile}</h2>`);
  template = template.replace(/<h2 class="section-title">Technologie<\/h2>/g, `<h2 class="section-title">${t.sections.technologies}</h2>`);
  template = template.replace(/<h2 class="section-title">Umiejętności miękkie<\/h2>/g, `<h2 class="section-title">${t.sections.softSkills}</h2>`);
  template = template.replace(/<h2 class="section-title">Języki<\/h2>/g, `<h2 class="section-title">${t.sections.languages}</h2>`);
  template = template.replace(/<h2 class="section-title">Projekty i rola<\/h2>/g, `<h2 class="section-title">${t.sections.projects}</h2>`);
  
  // Tłumacz "Bodyleasing – profil wewnętrzny"
  template = template.replace(/Bodyleasing – profil wewnętrzny/g, t.labels.bodyleasing);
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

