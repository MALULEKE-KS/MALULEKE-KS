// lib/guide/tech-lexicon.ts
// Names of technologies the verifier recognises (lib/guide/verify.ts). When an
// answer says something about Kurhula's work that names one of these and the
// site's data never mentions it, the answer is flagged — "he uses Kubernetes"
// when no system's stack lists Kubernetes. It is classifier vocabulary, not
// content: it recognises what could be a made-up claim; it never decides what
// his stack is (that is the data).
//
// Ambiguous English words (Go, Swift, Spring, Express, Next, Dart, R, C) are left
// out on purpose — a verifier that flags the verb "go" is worse than none.

const LOOSE = [
  // cloud and infrastructure
  "Kubernetes", "Docker", "Terraform", "Ansible", "Jenkins", "AWS", "Amazon Web Services", "Azure", "GCP", "Google Cloud", "Firebase", "Supabase",
  "Heroku", "Netlify", "Cloudflare", "DigitalOcean", "Vercel", "Nginx", "Linux",
  // data
  "Redis", "MongoDB", "MySQL", "PostgreSQL", "Postgres", "SQLite", "Cassandra", "DynamoDB", "Elasticsearch", "Kafka", "RabbitMQ", "Snowflake", "BigQuery",
  "GraphQL", "gRPC", "Prisma", "TypeORM", "Sequelize", "Drizzle", "Neon",
  // web
  "React", "React Native", "Vue", "Angular", "Svelte", "SvelteKit", "Next.js", "Nuxt", "Remix", "Astro", "Node.js", "Deno", "Bun", "Tailwind", "Bootstrap",
  "Webpack", "Vite", "tRPC", "Zod", "Redux", "jQuery",
  // backend frameworks
  "Django", "Flask", "FastAPI", "Laravel", "Ruby on Rails", "Spring Boot", ".NET", "ASP.NET", "NestJS",
  // machine learning and data science
  "TensorFlow", "PyTorch", "Keras", "scikit-learn", "Hugging Face", "LangChain", "OpenAI", "Pandas", "NumPy", "Spark", "Hadoop", "Airflow", "YOLOv8", "OpenCV",
  // tooling and testing
  "Figma", "Jest", "Vitest", "Cypress", "Playwright", "Selenium", "GitHub Actions", "GitLab", "Bitbucket", "Jira", "Tableau", "Power BI",
  // languages
  "TypeScript", "JavaScript", "Python", "Java", "Kotlin", "Golang", "Scala", "Elixir", "Haskell", "Perl", "PHP", "Flutter", "MATLAB", "C++", "C#", "Solidity",
  // game and mobile
  "Unity", "Unreal Engine", "SwiftUI", "Jetpack Compose",
] as const;

/** Names that are also ordinary words: only counted with exactly this capitalisation. */
const EXACT = ["Rust", "Ruby", "Julia"] as const;

export const TECH_NAMES: readonly string[] = [...LOOSE, ...EXACT];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// \b doesn't work before "." or "+" or "#" — use look-arounds on word characters instead.
const boundary = (term: string, flags: string) => new RegExp(`(?<![\\w.+#])${escape(term)}(?![\\w+#]|\\.\\w)`, flags);

const LOOSE_RES = LOOSE.map((t) => ({ term: t, re: boundary(t, "i") }));
const EXACT_RES = EXACT.map((t) => ({ term: t, re: boundary(t, "") }));

/** The technology names mentioned in a piece of text, as written in the lexicon. */
export function techMentions(text: string): string[] {
  const found = new Set<string>();
  for (const { term, re } of LOOSE_RES) if (re.test(text)) found.add(term);
  for (const { term, re } of EXACT_RES) if (re.test(text)) found.add(term);
  // "Postgres" and "PostgreSQL" are one thing; "Java" must not be reported for "JavaScript" (the boundary already prevents it).
  return [...found];
}
