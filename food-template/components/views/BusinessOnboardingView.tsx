"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Check, Store, Utensils } from "lucide-react";
import { apiRequest } from "@/services/apiClient";

export function BusinessOnboardingView() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const business = await apiRequest<{ id: string }>("businesses", { method: "POST", body: JSON.stringify({ legalName: form.get("legalName"), displayName: form.get("displayName"), slug: form.get("slug"), defaultCurrency: form.get("currency"), timezone: form.get("timezone"), taxRegistrationNo: form.get("taxRegistrationNo") || undefined }) });
      router.push(`/business/${business.id}/branches`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the business."); setPending(false);
    }
  }

  return <main className="onboarding-page"><header><Link href="/"><span className="portal-brand-mark"><Utensils size={19} /></span><strong>Culinara</strong></Link><span>Business setup</span><Link href="/business/login">Switch account</Link></header>
    <div className="onboarding-shell"><aside><p>LAUNCH CHECKLIST</p><button className="active"><span><Store size={15} /></span><div><strong>1. Business</strong><small>Core identity</small></div></button><button><span><Check size={15} /></span><div><strong>2. Add data</strong><small>Branches and menu</small></div></button></aside>
      <section className="onboarding-card"><div className="onboarding-progress"><span style={{ width: "50%" }} /></div><small>STEP 1 OF 2</small><h1>Create your business</h1><p>This creates the tenant and makes your signed-in account its owner. You’ll add branches, hours, menu items, inventory, coupons, and staff from the portal next.</p>
        <form className="onboarding-form" onSubmit={create}>
          <div><label>Legal name<input name="legalName" required minLength={2} placeholder="Culinara Foods (Pvt.) Ltd." /></label><label>Display name<input name="displayName" required minLength={2} placeholder="Culinara" /></label></div>
          <label>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="culinara" /></label>
          <div><label>Currency<input name="currency" defaultValue="PKR" required minLength={3} maxLength={3} /></label><label>Timezone<input name="timezone" defaultValue="Asia/Karachi" required /></label></div>
          <label>Tax registration number <span>(optional)</span><input name="taxRegistrationNo" maxLength={80} /></label>
          {error && <div className="portal-inline-error" role="alert">{error}</div>}
          <footer><span /><button className="primary" disabled={pending}>{pending ? "Creating…" : <>Create business <ArrowRight size={15} /></>}</button></footer>
        </form>
      </section></div></main>;
}
