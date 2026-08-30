import type { Metadata } from "next";
import { BusinessInvitations } from "@/components/business/BusinessInvitations";

export const metadata: Metadata = { title: "Business invitations — Culinara" };

export default function BusinessInvitationsPage() {
  return <BusinessInvitations />;
}

