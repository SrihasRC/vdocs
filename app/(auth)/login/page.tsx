import { db, user } from "@/lib/db";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your private vdocs vault",
};

export const instant = false;

export default async function LoginPage() {
  const userCount = await db.$count(user);
  const isFirstUser = userCount === 0;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-fd-background relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

      <div className="relative w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-2xl border border-fd-border bg-fd-card shadow-xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-2.5 rounded-2xl bg-fd-secondary border border-fd-border shadow-inner">
            <Logo />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-fd-foreground mt-2">
            {isFirstUser ? "Welcome to vdocs" : "Unlock Your Vault"}
          </h1>
          <p className="text-xs text-fd-muted-foreground max-w-xs">
            {isFirstUser
              ? "Create your personal owner account to secure and initialize your vault."
              : "Private, single-user encrypted documentation and knowledge store."}
          </p>
        </div>

        <LoginForm isFirstUser={isFirstUser} />

        <div className="pt-4 border-t border-fd-border/60 text-center">
          <p className="text-[11px] text-fd-muted-foreground">
            vdocs · Neon Postgres + Fumadocs + Better Auth
          </p>
        </div>
      </div>
    </div>
  );
}
