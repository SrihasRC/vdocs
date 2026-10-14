import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function seed() {
  console.log("Checking existing pages in Neon...");
  const existing = await sql`SELECT count(*) as count FROM pages`;
  const count = parseInt(existing[0]?.count ?? "0", 10);

  if (count > 0) {
    console.log(`Pages already exist in Neon (${count} rows). Skipping seed.`);
    return;
  }

  console.log("Seeding initial documents into Neon Postgres...");

  // 1. Quick Start
  await sql`
    INSERT INTO pages (
      slug, path, title, template, position, tags, status, blocks, search_text
    ) VALUES (
      'quickstart',
      'quickstart',
      'Quick Start',
      'index',
      1,
      ARRAY['getting-started', 'core'],
      'published',
      ${JSON.stringify([
        {
          id: "intro-note",
          type: "note",
          data: {
            markdown:
              "Welcome to **vdocs** — your personal, private knowledge vault.\n\nEverything here is saved directly to your **Neon Postgres** database with instant search and typed structured blocks.",
          },
        },
        {
          id: "first-command",
          type: "command",
          data: {
            title: "Connect to Neon Database",
            description: "Pull your environment variables and branch configurations",
            shell: "bash",
            command: "npx neonctl branches list",
            sudo: false,
            os: ["Linux", "macOS"],
            notes: "Requires Neon CLI installed.",
          },
        },
        {
          id: "sample-steps",
          type: "steps",
          data: {
            title: "Quick Capture Workflow",
            steps: [
              {
                text: "Press Cmd+K or click the search box to open the command palette.",
              },
              {
                text: "Choose 'New Command' or 'New Q&A' to capture an entry.",
                command: "vdocs capture --type command",
              },
              {
                text: "Copy commands or answers with one click anytime you need them.",
              },
            ],
          },
        },
      ])}::jsonb,
      'Quick Start Welcome to vdocs. Everything here is saved directly to Neon Postgres.'
    );
  `;

  // 2. Commands & Runbooks
  await sql`
    INSERT INTO pages (
      slug, path, title, template, position, tags, status, blocks, search_text
    ) VALUES (
      'commands',
      'commands',
      'Commands & Runbooks',
      'command',
      2,
      ARRAY['cli', 'terminal'],
      'published',
      ${JSON.stringify([
        {
          id: "system-update-cmd",
          type: "command",
          data: {
            title: "System Update & Clean Packages",
            description: "Full system upgrade with orphan package cleanup",
            shell: "bash",
            command: "sudo pacman -Syu && sudo pacman -Rns $(pacman -Qtdq)",
            sudo: true,
            os: ["Arch Linux"],
            notes: "Run weekly or before major driver updates.",
          },
        },
        {
          id: "docker-cleanup",
          type: "command",
          data: {
            title: "Docker Prune Unused Containers & Images",
            description: "Frees up local disk space from dangling images and volumes",
            shell: "bash",
            command: "docker system prune -a --volumes -f",
            sudo: false,
            os: ["Linux", "macOS"],
          },
        },
      ])}::jsonb,
      'Commands & Runbooks System Update Docker Prune'
    );
  `;

  // 3. Applications / Q&A
  await sql`
    INSERT INTO pages (
      slug, path, title, template, position, tags, status, blocks, search_text
    ) VALUES (
      'job-answers',
      'applications/job-answers',
      'Job Applications & Q&A',
      'qa',
      3,
      ARRAY['career', 'applications'],
      'published',
      ${JSON.stringify([
        {
          id: "qa-intro",
          type: "qa",
          data: {
            question: "Tell me about a complex technical challenge you solved.",
            short:
              "Architected a real-time collaborative documentation vault with Neon Postgres, optimistic locking, and presigned Cloudflare R2 uploads.",
            long:
              "Faced with high egress fees and scattered developer notes, I built a structured vault that stores typed content blocks in Postgres jsonb with pg_trgm fuzzy matching. Browser downloads stream directly from R2 using short-lived presigned URLs, keeping application server overhead near zero.",
          },
        },
      ])}::jsonb,
      'Job Applications & Q&A Tell me about a complex technical challenge you solved.'
    );
  `;

  console.log("Seeding complete! 3 initial pages successfully inserted into Neon Postgres.");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
