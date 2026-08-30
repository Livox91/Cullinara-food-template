"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BusinessOnboardingView } from "@/components/views/BusinessOnboardingView";
import { apiRequest } from "@/services/apiClient";

export function BusinessOnboardingController() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Array<{ business: { id: string }; membership: { status: string } }>>("businesses")
      .then((memberships) => {
        const active = memberships.find((entry) => entry.membership.status === "ACTIVE");
        if (active) router.replace(`/business/${active.business.id}`);
        else if (memberships.some((entry) => entry.membership.status === "INVITED")) router.replace("/business/invitations");
        else setReady(true);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to check your business memberships."));
  }, [router]);

  if (error) return <div className="portal-loading portal-load-error"><h1>Workspace lookup failed</h1><p>{error}</p></div>;
  if (!ready) return <div className="portal-loading"><div className="portal-loader" /><p>Opening your workspace…</p></div>;
  return <BusinessOnboardingView />;
}
