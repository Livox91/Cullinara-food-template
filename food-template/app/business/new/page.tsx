import type { Metadata } from "next";
import { BusinessOnboardingController } from "@/components/controllers/BusinessOnboardingController";
export const metadata: Metadata = { title: "Create a business — Culinara" };
export default function Page() { return <BusinessOnboardingController />; }
