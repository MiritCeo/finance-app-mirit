/**
 * Predefiniowane technologie dla CV developerów
 * Podzielone na kategorie
 */

export interface Technology {
  name: string;
  category: string;
}

export const CV_TECHNOLOGIES: Record<string, Technology[]> = {
  // Backend
  backend: [
    { name: "Node.js", category: "backend" },
    { name: "Python", category: "backend" },
    { name: "Java", category: "backend" },
    { name: "C#", category: "backend" },
    { name: "PHP", category: "backend" },
    { name: "Ruby", category: "backend" },
    { name: "Go", category: "backend" },
    { name: "Rust", category: "backend" },
    { name: "Scala", category: "backend" },
    { name: "Kotlin", category: "backend" },
    { name: "Spring Boot", category: "backend" },
    { name: "Django", category: "backend" },
    { name: "Flask", category: "backend" },
    { name: "FastAPI", category: "backend" },
    { name: "Express.js", category: "backend" },
    { name: "NestJS", category: "backend" },
    { name: "ASP.NET", category: "backend" },
    { name: "Laravel", category: "backend" },
    { name: "Symfony", category: "backend" },
    { name: "Rails", category: "backend" },
    { name: "GraphQL", category: "backend" },
    { name: "REST API", category: "backend" },
    { name: "Microservices", category: "backend" },
    { name: "Serverless", category: "backend" },
  ],
  
  // Frontend
  frontend: [
    { name: "React", category: "frontend" },
    { name: "Vue.js", category: "frontend" },
    { name: "Angular", category: "frontend" },
    { name: "Next.js", category: "frontend" },
    { name: "Nuxt.js", category: "frontend" },
    { name: "Svelte", category: "frontend" },
    { name: "TypeScript", category: "frontend" },
    { name: "JavaScript", category: "frontend" },
    { name: "HTML5", category: "frontend" },
    { name: "CSS3", category: "frontend" },
    { name: "SASS/SCSS", category: "frontend" },
    { name: "Tailwind CSS", category: "frontend" },
    { name: "Bootstrap", category: "frontend" },
    { name: "Material-UI", category: "frontend" },
    { name: "Redux", category: "frontend" },
    { name: "Zustand", category: "frontend" },
    { name: "MobX", category: "frontend" },
    { name: "Webpack", category: "frontend" },
    { name: "Vite", category: "frontend" },
    { name: "Jest", category: "frontend" },
    { name: "Cypress", category: "frontend" },
    { name: "Playwright", category: "frontend" },
  ],
  
  // Mobile
  mobile: [
    { name: "React Native", category: "mobile" },
    { name: "Flutter", category: "mobile" },
    { name: "Swift", category: "mobile" },
    { name: "Kotlin (Android)", category: "mobile" },
    { name: "Java (Android)", category: "mobile" },
    { name: "Ionic", category: "mobile" },
    { name: "Xamarin", category: "mobile" },
    { name: "Expo", category: "mobile" },
  ],
  
  // Databases
  database: [
    { name: "MySQL", category: "database" },
    { name: "PostgreSQL", category: "database" },
    { name: "MongoDB", category: "database" },
    { name: "Redis", category: "database" },
    { name: "Elasticsearch", category: "database" },
    { name: "Cassandra", category: "database" },
    { name: "SQLite", category: "database" },
    { name: "MariaDB", category: "database" },
    { name: "Oracle", category: "database" },
    { name: "SQL Server", category: "database" },
    { name: "DynamoDB", category: "database" },
    { name: "Firebase", category: "database" },
    { name: "Prisma", category: "database" },
    { name: "TypeORM", category: "database" },
    { name: "Sequelize", category: "database" },
  ],
  
  // DevOps & Cloud
  devops: [
    { name: "Docker", category: "devops" },
    { name: "Kubernetes", category: "devops" },
    { name: "AWS", category: "devops" },
    { name: "Azure", category: "devops" },
    { name: "GCP", category: "devops" },
    { name: "Terraform", category: "devops" },
    { name: "Ansible", category: "devops" },
    { name: "Jenkins", category: "devops" },
    { name: "GitLab CI/CD", category: "devops" },
    { name: "GitHub Actions", category: "devops" },
    { name: "CircleCI", category: "devops" },
    { name: "Travis CI", category: "devops" },
    { name: "Nginx", category: "devops" },
    { name: "Apache", category: "devops" },
    { name: "Linux", category: "devops" },
    { name: "Bash", category: "devops" },
    { name: "Shell Scripting", category: "devops" },
  ],
  
  // Tools & Other
  tools: [
    { name: "Git", category: "tools" },
    { name: "GitHub", category: "tools" },
    { name: "GitLab", category: "tools" },
    { name: "Bitbucket", category: "tools" },
    { name: "Jira", category: "tools" },
    { name: "Confluence", category: "tools" },
    { name: "Trello", category: "tools" },
    { name: "Asana", category: "tools" },
    { name: "Slack", category: "tools" },
    { name: "VS Code", category: "tools" },
    { name: "IntelliJ IDEA", category: "tools" },
    { name: "Postman", category: "tools" },
    { name: "Swagger", category: "tools" },
    { name: "Figma", category: "tools" },
    { name: "Adobe XD", category: "tools" },
  ],
  
  // Testing
  testing: [
    { name: "Jest", category: "testing" },
    { name: "Mocha", category: "testing" },
    { name: "Chai", category: "testing" },
    { name: "JUnit", category: "testing" },
    { name: "Pytest", category: "testing" },
    { name: "Selenium", category: "testing" },
    { name: "Cypress", category: "testing" },
    { name: "Playwright", category: "testing" },
    { name: "Vitest", category: "testing" },
    { name: "Testing Library", category: "testing" },
  ],
};

export const TECHNOLOGY_CATEGORIES = [
  { value: "backend", label: "Backend" },
  { value: "frontend", label: "Frontend" },
  { value: "mobile", label: "Mobile" },
  { value: "database", label: "Bazy danych" },
  { value: "devops", label: "DevOps & Cloud" },
  { value: "tools", label: "Narzędzia" },
  { value: "testing", label: "Testowanie" },
];

export function getAllTechnologies(): Technology[] {
  return Object.values(CV_TECHNOLOGIES).flat();
}

export function getTechnologiesByCategory(category: string): Technology[] {
  return CV_TECHNOLOGIES[category] || [];
}

