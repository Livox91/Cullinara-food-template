"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, MailCheck, ShieldCheck, Utensils } from "lucide-react";
import { apiRequest } from "@/services/apiClient";

interface Membership {
  business: { id: string; displayName: string };
  membership: { id: string; role: string; status: string };
}
interface SessionUser { email: string | null; phone: string | null; emailVerifiedAt: string | null; phoneVerifiedAt: string | null }

export function BusinessInvitations() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [rows, currentUser] = await Promise.all([
      apiRequest<Membership[]>("businesses"),
      apiRequest<SessionUser>("auth/me"),
    ]);
    setMemberships(rows);
    setUser(currentUser);
    setLoading(false);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((reason) => { setError(reason instanceof Error ? reason.message : "Unable to load invitations."); setLoading(false); });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const invited = memberships.filter((entry) => entry.membership.status === "INVITED");
  const verified = Boolean(user?.emailVerifiedAt || user?.phoneVerifiedAt);
  const channel = user?.email ? "EMAIL" : "PHONE";

  async function requestCode() {
    setPending(true); setError("");
    try {
      const result = await apiRequest<{ maskedTarget: string; delivery: "SENT" | "QUEUED" }>("auth/verification/request", { method: "POST", body: JSON.stringify({ channel }) });
      setMessage(result.delivery === "SENT" ? `Verification code sent to ${result.maskedTarget}.` : `Verification email is queued for ${result.maskedTarget}; SMTP delivery is not available yet.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to request a code."); }
    finally { setPending(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    try {
      await apiRequest(`auth/${channel === "EMAIL" ? "verify-email" : "verify-phone"}`, { method: "POST", body: JSON.stringify({ code }) });
      setMessage("Identity verified. You can now accept the invitation.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Verification failed."); }
    finally { setPending(false); }
  }

  async function accept(businessId: string) {
    setPending(true); setError("");
    try {
      await apiRequest(`businesses/${businessId}/members/invitations/accept`, { method: "POST" });
      router.replace(`/business/${businessId}`); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to accept the invitation."); setPending(false); }
  }

  if (loading) return <div className="portal-loading"><div className="portal-loader"/><p>Loading invitations…</p></div>;
  return <main className="business-auth-page"><section className="business-auth-card invitation-card">
    <Link className="business-auth-brand" href="/"><span className="portal-brand-mark"><Utensils size={20}/></span><strong>Culinara</strong></Link>
    <span className="auth-icon"><MailCheck size={23}/></span><small>TEAM ONBOARDING</small><h1>Business invitations</h1><p>Verify your account once, then accept the restaurant role assigned to you.</p>
    {!verified && invited.length > 0 && <section className="invitation-verification"><div><ShieldCheck size={18}/><strong>Verify your {channel.toLowerCase()}</strong></div><p>The invitation cannot be accepted until you request the code, enter it below, and verify this account.</p><button className="module-button secondary" disabled={pending} onClick={() => void requestCode()}>{pending ? "Sending…" : "Send verification code"}</button><form onSubmit={verify}><input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit code" required/><button className="module-button primary" disabled={pending}>{pending ? "Checking…" : "Verify code"}</button></form></section>}
    <div className="invitation-list">{invited.map((entry) => <article key={entry.membership.id}><span><Utensils size={18}/></span><div><strong>{entry.business.displayName}</strong><small>Role: {entry.membership.role.replaceAll("_", " ")}</small></div><button className="module-button primary" disabled={pending || !verified} title={!verified ? "Verify your account with the code above first" : undefined} onClick={() => void accept(entry.business.id)}><Check size={14}/>{verified ? "Accept invitation" : "Verify first"}</button></article>)}</div>
    {!invited.length && <div className="portal-empty"><MailCheck size={28}/><h3>No pending invitations</h3><p>Ask the business owner to invite the same email or phone used for this account.</p></div>}
    {message && <div className="module-notice success">{message}</div>}{error && <div className="portal-inline-error" role="alert">{error}</div>}
  </section></main>;
}
