"use client";

import { useRouter } from "next/navigation";
import { Check, Clock3, MapPin, Navigation, Store } from "lucide-react";
import { StorefrontShell } from "@/components/customer/StorefrontShell";
import { useStorefront } from "@/components/customer/StorefrontProvider";

export function RestaurantsPage() {
  const router = useRouter();
  const { branches, branch: selected, setBranch, loading } = useStorefront();
  return <StorefrontShell><main className="restaurants-page">
    <section className="restaurants-hero"><div className="store-container"><span>FIND YOUR CULINARA</span><h1>Choose where to order</h1><p>We use your closest restaurant by default. Every location has its own live menu, prices, availability and opening hours.</p></div></section>
    <section className="store-container restaurants-content">
      <header className="restaurants-heading"><div><small>OUR RESTAURANTS</small><h2>{branches.length} {branches.length === 1 ? "location" : "locations"} available</h2></div>{selected && <div className="selected-restaurant"><Check/><span><small>Currently ordering from</small><strong>{selected.name}, {selected.city}</strong></span></div>}</header>
      {loading ? <div className="store-loading"><span/><p>Finding the nearest restaurant…</p></div> : branches.length ? <div className="restaurant-grid">{branches.map((branch) => { const active = selected?.id === branch.id; const available = branch.isOpenNow && branch.isAcceptingOrders; return <article key={branch.id} className={active ? "selected" : ""}><header><div className="restaurant-icon"><Store/></div><span className={`branch-state ${available ? "open" : "closed"}`}>{branch.isOpenNow ? branch.isAcceptingOrders ? "Open now" : "Orders paused" : "Closed"}</span></header><div className="restaurant-card-copy"><small>{branch.business.name}</small><h2>{branch.name}</h2><p><MapPin/>{branch.addressLine1}{branch.addressLine2 ? `, ${branch.addressLine2}` : ""}, {branch.city}</p><p><Clock3/>{branch.defaultPrepMinutes} min average preparation</p><dl><div><dt>Minimum order</dt><dd>Rs. {Number(branch.minimumOrderAmount).toLocaleString("en-PK")}</dd></div><div><dt>Delivery radius</dt><dd>{branch.deliveryRadiusKm ? `${branch.deliveryRadiusKm} km` : "Ask restaurant"}</dd></div></dl></div><button className={active ? "active" : ""} onClick={async () => { await setBranch(branch); router.push("/menu"); }}>{active ? <><Check/>Continue with this restaurant</> : <>Order here <Navigation/></>}</button></article>; })}</div> : <div className="store-empty"><Store/><h2>No restaurants are available</h2><p>Please check again later.</p></div>}
    </section>
  </main></StorefrontShell>;
}
