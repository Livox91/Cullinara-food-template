"use client";

import { useEffect, useState } from "react";
import type { BusinessPageKind, BusinessPortalData } from "@/models/businessPortal";
import { businessManagementService } from "@/services/businessManagementService";
import { BusinessModuleView } from "@/components/views/BusinessModuleView";
import { canAccessPage } from "@/lib/businessAccess";
import Link from "next/link";

interface Props {
  businessId: string;
  page: BusinessPageKind;
  entityId?: string;
}

export function BusinessPortalPageController({ businessId, page, entityId }: Props) {
  const [data, setData] = useState<BusinessPortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    businessManagementService.getPortalData(businessId, entityId, controller.signal)
      .then((portalData) => setData(portalData))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Unable to load the business portal.");
      });
    return () => controller.abort();
  }, [businessId, entityId, revision]);

  if (error) return <div className="portal-loading portal-load-error"><h1>Page unavailable</h1><p>{error}</p></div>;
  if (!data) return <div className="portal-loading"><div className="portal-loader" /><p>Loading workspace…</p></div>;
  if (!canAccessPage(page, data.user.capabilities)) return <div className="portal-loading portal-load-error"><h1>Access denied</h1><p>Your {data.user.role} role does not allow this page.</p><Link className="module-button primary" href={`/business/${businessId}`}>Return to dashboard</Link></div>;
  return <BusinessModuleView businessId={businessId} page={page} entityId={entityId} data={data} onDataChanged={() => setRevision((value) => value + 1)} />;
}
