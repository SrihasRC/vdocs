"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, authClient } from "@/lib/auth-client";
import { KeyRound, Lock, Mail, User, Fingerprint, Loader2 } from "lucide-react";

interface LoginFormProps {
  isFirstUser: boolean;
}

export function LoginForm({ isFirstUser }: LoginFormProps) {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(isFirstUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        const res = await signUp.email({
          email,
          password,
          name: name || "Vault Owner",
        });

        if (res.error) {
          setError(res.error.message || "Failed to create owner account");
          setLoading(false);
          return;
        }
      } else {
        const res = await signIn.email({
          email,
          password,
        });

        if (res.error) {
          setError(res.error.message || "Invalid credentials");
          setLoading(false);
          return;
        }
      }

      router.push("/docs");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      setLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await authClient.signIn.passkey();
      if (res?.error) {
        setError(res.error.message || "Passkey authentication failed");
        setLoading(false);
        return;
      }
      router.push("/docs");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey verification failed");
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {error && (
        <div className="p-3 text-xs rounded-xl bg-red-950/60 border border-red-800/60 text-red-300">
          {error}
        </div>
      )}

      {isFirstUser && (
        <div className="p-3 text-xs rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2">
          <KeyRound className="size-4 shrink-0 mt-0.5" />
          <span>
            Initial vault setup: You are creating the primary owner account. Public sign-up will be disabled afterward.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegistering && (
          <div>
            <label className="block text-xs font-medium text-fd-muted-foreground mb-1.5">
              Owner Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 size-4 text-fd-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Srihas"
                required
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl bg-fd-secondary border border-fd-border text-fd-foreground placeholder:text-fd-muted-foreground focus:outline-none focus:ring-1 focus:ring-fd-primary transition-colors"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-fd-muted-foreground mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 size-4 text-fd-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@vdocs.vault"
              required
              className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl bg-fd-secondary border border-fd-border text-fd-foreground placeholder:text-fd-muted-foreground focus:outline-none focus:ring-1 focus:ring-fd-primary transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-fd-muted-foreground mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 size-4 text-fd-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl bg-fd-secondary border border-fd-border text-fd-foreground placeholder:text-fd-muted-foreground focus:outline-none focus:ring-1 focus:ring-fd-primary transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-fd-primary text-fd-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          <span>{isRegistering ? "Create Owner Account" : "Sign In to Vault"}</span>
        </button>
      </form>

      {!isRegistering && (
        <>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-fd-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-fd-card px-2 text-fd-muted-foreground font-mono">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePasskeySignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-fd-border bg-fd-secondary hover:bg-fd-accent text-fd-foreground font-medium text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Fingerprint className="size-4 text-fd-primary" />
            <span>Sign in with Passkey</span>
          </button>
        </>
      )}
    </div>
  );
}
