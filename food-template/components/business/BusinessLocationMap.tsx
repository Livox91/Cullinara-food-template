"use client";

import { useEffect, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";

const initial: LatLngTuple = [30.3753, 69.3451];

export default function BusinessLocationMap({ onSelect }: { onSelect: (latitude: number, longitude: number) => void }) {
  const [position, setPosition] = useState<LatLngTuple | null>(null); const [error, setError] = useState(""); const [locating, setLocating] = useState(false);
  function selected(latitude: number, longitude: number) { const next: LatLngTuple = [latitude, longitude]; setPosition(next); onSelect(latitude, longitude); setError(""); }
  function locate() { setLocating(true); setError(""); if (!navigator.geolocation) { setError("Location is unavailable in this browser."); setLocating(false); return; } navigator.geolocation.getCurrentPosition((result) => { selected(result.coords.latitude, result.coords.longitude); setLocating(false); }, (reason) => { setError(reason.code === reason.PERMISSION_DENIED ? "Allow location for this website or click the map manually." : "Current location could not be found. Click the map manually."); setLocating(false); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); }
  return <div className="business-map-shell"><MapContainer center={initial} zoom={5} scrollWheelZoom className="business-map"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><MapSelection position={position} onSelect={selected}/></MapContainer><div className="business-map-controls"><button type="button" onClick={locate} disabled={locating}><Crosshair/>{locating ? "Finding location…" : "Use current location"}</button>{position && <span><MapPin/>{position[0].toFixed(6)}, {position[1].toFixed(6)}</span>}</div>{error && <div className="portal-inline-error">{error}</div>}</div>;
}

function MapSelection({ position, onSelect }: { position: LatLngTuple | null; onSelect: (latitude: number, longitude: number) => void }) { const map = useMap(); useMapEvents({ click(event) { onSelect(event.latlng.lat, event.latlng.lng); } }); useEffect(() => { if (position) map.flyTo(position, Math.max(map.getZoom(), 14)); }, [map, position]); return position ? <CircleMarker center={position} radius={9} pathOptions={{ color: "#fff", fillColor: "#e64b24", fillOpacity: 1, weight: 3 }}/> : null; }
