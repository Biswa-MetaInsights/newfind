"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import type { AuthTokens } from "@eventmind/types";
import { isAxiosError } from "@eventmind/api";
import { BrandLogo } from "@/components/brand";
import { SocialSignIn } from "@/components/SocialSignIn";

export default function AuthPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When a sign-in fails because the email has no account, we flip to the
  // sign-up form (keeping the entered email/password) and drop the cursor into
  // the Full Name field — the only thing left for the user to fill in.
  const nameRef = useRef<HTMLInputElement>(null);
  const focusNameOnSignup = useRef(false);

  useEffect(() => {
    if (!isLogin && focusNameOnSignup.current) {
      nameRef.current?.focus();
      focusNameOnSignup.current = false;
    }
  }, [isLogin]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        const { data } = await authApi.login(email, password);
        setAuth(email, data as AuthTokens);
        router.push("/");
      } else {
        await authApi.register(email, password, name);
        // auto-login after register (mirrors Flutter behaviour)
        const { data } = await authApi.login(email, password);
        setAuth(email, data as AuthTokens);
        router.push("/");
      }
    } catch (err) {
      console.error("[Auth error]", isAxiosError(err) ? err.response?.status ?? "network" : "unexpected");
      if (isAxiosError(err)) {
        if (!err.response) {
          setError("Unable to connect. Please try again.");
        } else if (isLogin && err.response.data?.detail === "email_not_registered") {
          // No account for this email — carry the entered credentials into the
          // sign-up form so the user only needs to add their name.
          setIsLogin(false);
          focusNameOnSignup.current = true;
          setError("This email isn't registered with us. Please sign up to continue.");
        } else {
          setError(typeof err.response.data?.detail === "string" ? err.response.data.detail : "Please check the form and try again.");
        }
      } else {
        setError(String(err));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col" style={{ backgroundColor: "var(--brand-bg)" }}>
      {/* Top bar and panel photo removed 2026-11-17 (Gautham): a page used for ~10 s should be simple
          and reliable. "Back to home" floats top-right; the logo stays the way home. */}
      <Link href="/" className="absolute right-4 top-4 z-20 inline-flex min-h-11 items-center rounded-lg px-2 text-[18px] font-bold text-[var(--brand-text)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-green)] sm:right-6 lg:right-20">
        Back to home
      </Link>
      <div className="flex flex-1">
      <div className="relative hidden overflow-hidden lg:flex lg:flex-1 items-center justify-center p-16"
        style={{ backgroundColor: "var(--brand-green)", color: "var(--brand-on-green)" }}>
        <div className="relative z-10 max-w-md">
          <Link href="/" aria-label="NewFind — home" className="inline-block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4">
            <BrandLogo markSize={70} gap={14} className="mb-10" />
          </Link>
          <h1 className="text-[42px] font-extrabold leading-tight mb-6">
            Unlock Your Next<br />Great Experience.
          </h1>
          <p className="text-xl leading-relaxed">
            Discover AI summits, tech workshops, and networking events near you.
          </p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 py-12 lg:px-20" style={{ backgroundColor: "var(--brand-bg)" }}>
        <div className="w-full max-w-md">
          <Link href="/" aria-label="NewFind — home" className="mb-8 inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-green)] lg:hidden">
            <BrandLogo markSize={44} gap={12} style={{ color: "var(--brand-logo)" }} />
          </Link>
          <h2 className="text-3xl font-bold text-[var(--brand-text)] mb-3">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-[var(--brand-hint)] mb-10">
            {/* PARKED 2026-08-14 (MVP) — the sign-up line read "Join the EventMind
                community to start your journey." One edit drops both the word
                community (deferred to Phase 2) and the retired internal brand
                name. */}
            {isLogin
              ? "Sign in to access your dashboard and event tickets."
              : "Create an account to start joining events."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <Field label="Full Name" htmlFor="auth-name">
                <input
                  id="auth-name"
                  name="name"
                  autoComplete="name"
                  ref={nameRef}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className={inputCls}
                />
              </Field>
            )}

            <Field label="Email Address" htmlFor="auth-email">
              <input
                id="auth-email"
                name="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </Field>

            <Field label="Password" htmlFor="auth-password">
              <input
                id="auth-password"
                name="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                type="password"
                required
                minLength={isLogin ? 8 : 10}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
            </Field>

            {error && (
              <p role="alert" className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-lg bg-[var(--brand-green)] text-[var(--brand-on-green)] text-lg font-bold
                         hover:bg-[var(--brand-green-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Please wait…" : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>
          {isLogin&&<Link href="/forgot-password" className="block mt-5 text-[15px] underline">Forgot your password?</Link>}

          <div className="mt-8 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-[var(--brand-hint)] font-semibold hover:text-[var(--brand-green)] transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </button>
          </div>

          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-[var(--brand-border)]" />
            <span className="text-[var(--brand-hint)] font-semibold text-sm">OR</span>
            <div className="flex-1 h-px bg-[var(--brand-border)]" />
          </div>

          {sessionExpired && <p role="alert" className="mb-4 text-[var(--brand-text)]">Your session has expired. Please sign in again to continue.</p>}
          <SocialSignIn disabled={isLoading} />
        </div>
      </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full text-base px-4 py-3 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] text-[var(--brand-text)] " +
  "placeholder:text-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/30 " +
  "focus:border-[var(--brand-green)] transition-colors";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-bold text-[var(--brand-text)]">{label}</label>
      {children}
    </div>
  );
}
