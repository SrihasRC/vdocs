import { db, documents, sql } from "@/lib/db";
import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
export const instant = false;

async function createDocument(formData: FormData) {
  "use server";
  const title = (formData.get("title") as string)?.trim() || "Untitled Document";
  const content = (formData.get("content") as string)?.trim() || "";

  await db.insert(documents).values({
    title,
    content,
  });

  revalidatePath("/");
}

export default async function Home() {
  let dbInfo: { version: string; current_time: string; database: string } | null = null;
  let docs: (typeof documents.$inferSelect)[] = [];
  let connectionError: string | null = null;

  try {
    const [info] = await sql`SELECT version(), now() as current_time, current_database() as database`;
    dbInfo = info as { version: string; current_time: string; database: string };
    docs = await db.select().from(documents).orderBy(desc(documents.createdAt));
  } catch (err) {
    connectionError = err instanceof Error ? err.message : "Failed to connect to Neon database";
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans">
      <main className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">vdocs</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Neon Connected
              </span>
            </div>
            <p className="text-zinc-400 text-sm mt-1">
              Next.js 16 Documentation &amp; Knowledge Base with Neon Lakebase Postgres &amp; Drizzle ORM
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
              Branch: <strong className="text-emerald-400">{process.env.NEON_BRANCH || "production"}</strong>
            </span>
            <span className="px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
              Database: <strong className="text-white">{dbInfo?.database || "neondb"}</strong>
            </span>
          </div>
        </div>

        {/* Database Health Card */}
        {connectionError ? (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/50 text-red-300">
            <h2 className="font-semibold text-red-200">Database Connection Failed</h2>
            <p className="text-sm mt-1">{connectionError}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-xs text-zinc-400">Database Status</span>
              <p className="text-lg font-semibold text-emerald-400 mt-1">Active (Healthy)</p>
              <p className="text-xs text-zinc-500 mt-1">Pooler: PgBouncer via HTTPS</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-xs text-zinc-400">Server Time (UTC)</span>
              <p className="text-sm font-mono text-zinc-200 mt-1 truncate">
                {dbInfo?.current_time ? new Date(dbInfo.current_time).toUTCString() : "Fetching..."}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Low-latency serverless query</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-xs text-zinc-400">Total Documents</span>
              <p className="text-lg font-semibold text-white mt-1">{docs.length}</p>
              <p className="text-xs text-zinc-500 mt-1">Stored in Neon Postgres</p>
            </div>
          </div>
        )}

        {/* Create Document Section */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
          <h2 className="text-lg font-semibold text-white mb-4">Create New Document in Neon</h2>
          <form action={createDocument} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-xs font-medium text-zinc-400 mb-1">
                Document Title
              </label>
              <input
                id="title"
                name="title"
                required
                placeholder="e.g. Getting Started with Neon"
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-xs font-medium text-zinc-400 mb-1">
                Content
              </label>
              <textarea
                id="content"
                name="content"
                rows={3}
                placeholder="Write your document content or notes here..."
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors cursor-pointer"
            >
              Save to Neon Postgres
            </button>
          </form>
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Documents in Database</h2>
            <span className="text-xs text-zinc-500">Live query via Drizzle ORM</span>
          </div>

          {docs.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-zinc-900/20 border border-zinc-800/50 text-zinc-500">
              <p>No documents found yet. Use the form above to insert your first record into Neon Postgres!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-medium text-white">{doc.title}</h3>
                    <span className="text-xs text-zinc-500 font-mono shrink-0">
                      {new Date(doc.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {doc.content && (
                    <p className="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">{doc.content}</p>
                  )}
                  <div className="mt-3 text-xs text-zinc-600 font-mono">ID: {doc.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
