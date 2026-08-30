"use client";

import dynamic from "next/dynamic";

const BusinessLocationMap = dynamic(() => import("@/components/business/BusinessLocationMap"), { ssr: false, loading: () => <div className="business-map-loading">Loading map…</div> });

export function BusinessLocationPicker() {
  function updateForm(latitude: number, longitude: number) {
    const panel = document.querySelector<HTMLDetailsElement>(".data-action[open]");
    const latitudeInput = panel?.querySelector<HTMLInputElement>('input[name="latitude"]');
    const longitudeInput = panel?.querySelector<HTMLInputElement>('input[name="longitude"]');
    if (!latitudeInput || !longitudeInput) return;
    latitudeInput.value = latitude.toFixed(6); longitudeInput.value = longitude.toFixed(6);
    latitudeInput.dispatchEvent(new Event("input", { bubbles: true })); longitudeInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
  return <div className="business-location-picker"><div><span>Branch map location</span><p>Click the exact restaurant position or use your device location. Coordinates are copied into the form below.</p></div><BusinessLocationMap onSelect={updateForm}/></div>;
}
