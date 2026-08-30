import type { Metadata } from "next";
import { Suspense } from "react";
import { BusinessLoginForm } from "@/components/business/BusinessLoginForm";

export const metadata: Metadata = { title: "Business sign in — Culinara" };

export default function BusinessLoginPage() {
  return <Suspense fallback={<main className="business-auth-page"><div className="portal-loader" /></main>}><BusinessLoginForm /></Suspense>;
}
