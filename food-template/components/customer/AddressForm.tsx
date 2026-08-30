"use client";

import { FormEvent, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import type { CustomerAddress } from "@/models/storefront";
import { apiRequest } from "@/services/apiClient";

type Coordinates = { latitude: string; longitude: string };

export function AddressForm({ onSaved, compact = false }: { onSaved: (address: CustomerAddress) => void | Promise<void>; compact?: boolean }) {
  const [pending, setPending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [coords, setCoords] = useState<Coordinates>({ latitude: "", longitude: "" });

  function locate() {
    setError(""); setPermissionBlocked(false);
    if (!window.isSecureContext) { setError("Current location requires HTTPS or localhost."); return; }
    if (!navigator.geolocation) { setError("Location is unavailable in this browser."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) });
        setLocating(false); setError("");
      },
      (reason) => {
        setLocating(false);
        if (reason.code === reason.PERMISSION_DENIED) {
          setPermissionBlocked(true);
          setError("Location permission was denied. Allow Location for localhost in the browser site settings, then try again.");
        } else if (reason.code === reason.POSITION_UNAVAILABLE) setError("Your device could not determine its location. Turn on device location services or enter the coordinates manually.");
        else setError("Location lookup timed out. Move near a window, check location services, and try again.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const address = await apiRequest<CustomerAddress>("me/addresses", { method: "POST", body: JSON.stringify({ label: String(form.get("label") || "Home"), recipientName: String(form.get("recipientName") || ""), phone: String(form.get("phone") || ""), addressLine1: String(form.get("addressLine1") || ""), addressLine2: String(form.get("addressLine2") || "") || null, city: String(form.get("city") || ""), province: String(form.get("province") || "") || null, postalCode: String(form.get("postalCode") || "") || null, latitude: Number(coords.latitude), longitude: Number(coords.longitude), deliveryNote: String(form.get("deliveryNote") || "") || null, isDefault: Boolean(form.get("isDefault")) }) });
      await onSaved(address);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save address."); }
    finally { setPending(false); }
  }

  return <form className={`address-form ${compact ? "compact" : ""}`} onSubmit={submit}>
    <div className="form-row"><label>Label<input name="label" defaultValue="Home"/></label><label>Recipient<input name="recipientName" required/></label></div>
    <div className="form-row"><label>Phone<input name="phone" type="tel" required/></label><label>City<input name="city" required/></label></div>
    <label>Street address<input name="addressLine1" required/></label><label>Apartment / floor<input name="addressLine2"/></label>
    <div className="form-row"><label>Province<input name="province"/></label><label>Postal code<input name="postalCode"/></label></div>
    <label>Delivery note<textarea name="deliveryNote" rows={2}/></label>
    <div className="location-capture"><button type="button" disabled={locating} onClick={() => void locate()}><LocateFixed/>{locating ? "Finding your location…" : "Use my current location"}</button>{coords.latitude ? <span><MapPin/>Location captured: {coords.latitude}, {coords.longitude}</span> : <small>Uses your device location to validate the restaurant delivery radius.</small>}</div>
    <div className="form-row"><label>Latitude<input type="number" step="any" min="-90" max="90" value={coords.latitude} onChange={(event) => setCoords((current) => ({ ...current, latitude: event.target.value }))} placeholder="24.8607" required/></label><label>Longitude<input type="number" step="any" min="-180" max="180" value={coords.longitude} onChange={(event) => setCoords((current) => ({ ...current, longitude: event.target.value }))} placeholder="67.0011" required/></label></div>
    <label className="check-line"><input type="checkbox" name="isDefault" defaultChecked/>Make this my default address</label>
    {error && <div className="store-error">{error}{permissionBlocked && <small className="permission-help">Click the icon beside the address bar → Site settings → Location → Allow, then reload this page.</small>}</div>}
    <button className="store-primary" disabled={pending || locating || !coords.latitude || !coords.longitude}>{pending ? "Saving…" : "Save address"}</button>
  </form>;
}
