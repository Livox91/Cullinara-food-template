"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Utensils } from "lucide-react";

export function BusinessLoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const identity = String(form.get("identity") ?? "").trim();
    const intent = String(form.get("intent") ?? "OWNER");
    const response = await fetch(`/api/session/${mode === "login" ? "login" : "register"}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...(identity.includes("@") ? { email: identity } : { phone: identity }), password: String(form.get("password") ?? ""), ...(mode === "register" ? { firstName: String(form.get("firstName") ?? "").trim(), lastName: String(form.get("lastName") ?? "").trim() || undefined } : {}) }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error?.message ?? "Sign in failed. Check your credentials and backend connection.");
      setPending(false);
      return;
    }
    const destination = params.get("next");
    if (mode === "register") {
      router.push(intent === "STAFF" ? "/business/invitations" : "/business/new");
      return;
    }
    if (destination?.startsWith("/")) {
      router.push(destination);
      return;
    }
    const membershipsResponse = await fetch("/api/backend/businesses", { cache: "no-store" });
    const membershipsPayload = await membershipsResponse.json().catch(() => null);
    const memberships = membershipsPayload?.data ?? [];
    const active = memberships.find((entry: { membership?: { status?: string } }) => entry.membership?.status === "ACTIVE");
    const invited = memberships.some((entry: { membership?: { status?: string } }) => entry.membership?.status === "INVITED");
    router.push(active?.business?.id ? `/business/${active.business.id}` : invited ? "/business/invitations" : "/business/new");
  }

  return <main className="business-auth-page"><section className="business-auth-card">
    <Link className="business-auth-brand" href="/"><span className="portal-brand-mark"><Utensils size={20} /></span><strong>Culinara</strong></Link>
    <span className="auth-icon"><LockKeyhole size={23} /></span><small>BUSINESS PORTAL</small><h1>{mode === "login" ? "Welcome back" : "Create account"}</h1><p>{mode === "login" ? "Sign in to manage your restaurant workspace." : "Create an account as an owner or invited staff member."}</p>
    <div className="auth-mode-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button></div>
    <form onSubmit={submit}>
      {mode === "register" && <div className="auth-name-grid"><label>First name<input name="firstName" autoComplete="given-name" required /></label><label>Last name<input name="lastName" autoComplete="family-name" /></label></div>}
      {mode === "register" && <label>I’m joining as<select name="intent" defaultValue="OWNER"><option value="OWNER">A business owner</option><option value="STAFF">An invited team member</option></select></label>}
      <label>Email or phone<input name="identity" autoComplete="username" required placeholder="owner@restaurant.pk" /></label>
      <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={10} required /><small>At least 10 characters</small></label>
      {error && <div className="portal-inline-error" role="alert">{error}</div>}
      <button className="module-button primary" disabled={pending}>{pending ? (mode === "login" ? "Signing in…" : "Creating account…") : <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16} /></>}</button>
    </form>
    <p className="auth-help">{mode === "login" ? <>First time here? <button type="button" onClick={() => setMode("register")}>Create an owner account</button>.</> : "After registration, you’ll continue directly to business setup."}</p>
  </section></main>;
}
