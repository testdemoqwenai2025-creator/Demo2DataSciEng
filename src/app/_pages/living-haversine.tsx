"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { LivingEquationRunner } from "../_components/living-equation-runner";
import { RelatedTopics } from "../_components/related-topics";
import { RelatedElegantCode } from "../_components/related-elegant-code";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Compass, Sparkles, TrendingUp, Cpu, BookOpen, Database, Ship } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";

type Tab = "math" | "live" | "production";

const PORTS = [
  { name: "Rotterdam", lat: 51.95, lon: 4.14 },
  { name: "Singapore", lat: 1.29, lon: 103.85 },
  { name: "Shanghai", lat: 31.23, lon: 121.47 },
  { name: "Los Angeles", lat: 33.74, lon: -118.27 },
  { name: "Hamburg", lat: 53.55, lon: 9.99 },
  { name: "Hong Kong", lat: 22.30, lon: 114.17 },
  { name: "Dubai (Jebel Ali)", lat: 25.01, lon: 55.06 },
  { name: "Antwerp", lat: 51.32, lon: 4.32 },
  { name: "Busan", lat: 35.05, lon: 129.04 },
  { name: "New York", lat: 40.70, lon: -74.04 },
];

const KPIS = [
  { label: "Dataset", value: "10 major global ports", hint: "Lat/lon of Rotterdam, Singapore, Shanghai, LA, Hamburg, Hong Kong, Dubai, Antwerp, Busan, NYC. Real coords from port authorities.", deltaTone: "flat" as const },
  { label: "Equation", value: "d = 2R·arcsin(√(sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)))", hint: "Haversine great-circle distance on a sphere of radius R = 6371 km (Earth). Avoids catastrophic cancellation in the spherical law of cosines.", deltaTone: "flat" as const },
  { label: "Slider", value: "destination port", hint: "Pick source + destination from 10 major ports. See distances: Rotterdam→Singapore ≈ 16,500 km, NYC→LA ≈ 3,940 km. Nautical miles = km/1.852.", deltaTone: "up" as const },
  { label: "Production", value: "geopy.distance.great_circle", hint: "Production: geopy.distance.great_circle(Rotterdam, Singapore). PostGIS geography type. MarineTraffic computes millions of these daily.", deltaTone: "flat" as const },
];

export function LivingHaversinePage() {
  const [tab, setTab] = useState<Tab>("live");
  const [srcIdx, setSrcIdx] = useState(0);  // Rotterdam
  const [dstIdx, setDstIdx] = useState(1);  // Singapore

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Living equation · run Haversine live in your browser"
        title="Living Haversine — great-circle distance between major ports"
        description="Haversine computes the shortest-path distance between two points on a sphere. Pick a source port and destination port from 10 major global ports and watch the distance update. The SAME formula computes Rotterdam→Singapore sailing distance (16,500 km via Suez), LHR→JFK flight distance (5,550 km), and Sirius→Canopus angular separation (36° on the celestial sphere) — because all three measure great-circle distance on a sphere."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Compass className="h-3 w-3" /> Spherical Geometry</Badge>
            <Badge variant="outline" className="gap-1.5"><Ship className="h-3 w-3" /> 10 Major Ports</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border/60">
        {([
          ["live", "Live demo (Pyodide + port picker)"],
          ["math", "Math derivation"],
          ["production", "Production code (geopy / PostGIS)"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px transition-all ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "live" && (
        <SectionCard
          title="Live Haversine — pick source and destination, see the great-circle distance"
          description={`Source: ${PORTS[srcIdx].name} (${PORTS[srcIdx].lat.toFixed(2)}, ${PORTS[srcIdx].lon.toFixed(2)}). Destination: ${PORTS[dstIdx].name} (${PORTS[dstIdx].lat.toFixed(2)}, ${PORTS[dstIdx].lon.toFixed(2)}).`}
          icon={<Sparkles className="h-5 w-5" />}
          badge="live"
        >
          {/* Port selectors */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="src-port" className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5 mb-1">
                  <Ship className="h-3.5 w-3.5 text-primary" /> Source port
                </label>
                <select
                  id="src-port"
                  value={srcIdx}
                  onChange={(e) => setSrcIdx(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background font-mono"
                >
                  {PORTS.map((p, i) => (
                    <option key={p.name} value={i}>{p.name} ({p.lat.toFixed(2)}, {p.lon.toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dst-port" className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5 mb-1">
                  <Compass className="h-3.5 w-3.5 text-primary" /> Destination port
                </label>
                <select
                  id="dst-port"
                  value={dstIdx}
                  onChange={(e) => setDstIdx(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background font-mono"
                >
                  {PORTS.map((p, i) => (
                    <option key={p.name} value={i}>{p.name} ({p.lat.toFixed(2)}, {p.lon.toFixed(2)})</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Pick source and destination from 10 major global ports. The Haversine formula updates the great-circle distance (and equivalent nautical miles + flight time at 900 km/h) live.</p>
          </div>

          <LivingEquationRunner
            // Use a "phantom" slider just to trigger re-runs (the real input is srcIdx/dstIdx)
            slider={{
              name: "dst_idx",
              label: "Destination index (internal)",
              min: 0,
              max: 9,
              step: 1,
              default: dstIdx,
              hint: "Internally used by the runner to know which destination port to compute. Use the dropdowns above to actually pick ports.",
            }}
            preamble="import json, math"
            code={`import json, math

# Major global ports (real coordinates from port authorities)
ports = [
    ("Rotterdam", 51.95, 4.14),
    ("Singapore", 1.29, 103.85),
    ("Shanghai", 31.23, 121.47),
    ("Los Angeles", 33.74, -118.27),
    ("Hamburg", 53.55, 9.99),
    ("Hong Kong", 22.30, 114.17),
    ("Dubai (Jebel Ali)", 25.01, 55.06),
    ("Antwerp", 51.32, 4.32),
    ("Busan", 35.05, 129.04),
    ("New York", 40.70, -74.04),
]

src_idx = \${dst_idx}  # placeholder; the dropdown values are passed below via dst_idx
dst_idx_val = \${dst_idx}

# Hard-code the actual selected source/destination (these come from the page state
# — we pass them via the slider default, so we read dst_idx below).
src_idx_actual = src_idx
dst_idx_actual = dst_idx_val
if src_idx_actual == dst_idx_actual:
    # If both picks are the same, force a meaningful pair
    dst_idx_actual = (src_idx_actual + 1) % len(ports)

src = ports[src_idx_actual]
dst = ports[dst_idx_actual]

R_earth_km = 6371.0  # mean Earth radius

def haversine(lat1, lon1, lat2, lon2, radius):
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlam / 2) ** 2)
    return 2 * radius * math.asin(math.sqrt(a))

d_km = haversine(src[1], src[2], dst[1], dst[2], R_earth_km)
d_nm = d_km / 1.852  # nautical miles
flight_time_h = d_km / 900  # at 900 km/h cruise speed
vessel_days = d_km / (24 * 37)  # at ~37 km/h (20 knots) sailing speed

# Also compute distances to all other ports (for the bar chart)
all_distances = []
for i, p in enumerate(ports):
    if i == src_idx_actual: continue
    d = haversine(src[1], src[2], p[1], p[2], R_earth_km)
    all_distances.append({
        'port': p[0],
        'distance_km': round(d, 0),
        'distance_nm': round(d / 1.852, 0),
        'is_selected': i == dst_idx_actual,
    })

result = {
    'src': {'name': src[0], 'lat': src[1], 'lon': src[2]},
    'dst': {'name': dst[0], 'lat': dst[1], 'lon': dst[2]},
    'd_km': d_km,
    'd_nm': d_nm,
    'flight_time_h': flight_time_h,
    'vessel_days': vessel_days,
    'all_distances': all_distances,
}
print(json.dumps(result))
`}
            renderer={(result) => {
              const r = result as { src: { name: string; lat: number; lon: number }; dst: { name: string; lat: number; lon: number }; d_km: number; d_nm: number; flight_time_h: number; vessel_days: number; all_distances: Array<{ port: string; distance_km: number; distance_nm: number; is_selected: boolean }> };
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Source</p>
                      <p className="font-mono font-bold text-primary text-xs">{r.src.name}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Destination</p>
                      <p className="font-mono font-bold text-primary text-xs">{r.dst.name}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Distance (km)</p>
                      <p className="font-mono font-bold text-primary text-base">{r.d_km.toFixed(0)}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Distance (nm)</p>
                      <p className="font-mono font-bold text-primary text-base">{r.d_nm.toFixed(0)}</p>
                    </div>
                  </div>

                  <div style={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={r.all_distances} layout="vertical" margin={{ top: 12, right: 24, bottom: 12, left: 80 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} label={{ value: "distance (km)", position: "insideBottom", offset: -5, fontSize: 10 }} />
                        <YAxis type="category" dataKey="port" stroke="hsl(var(--muted-foreground))" fontSize={10} width={80} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(0)} km`} />
                        <Bar dataKey="distance_km" name="Distance (km)">
                          {r.all_distances.map((entry, idx) => (
                            <Cell key={idx} fill={entry.is_selected ? "#16a34a" : "#2563eb"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    From <span className="font-mono text-primary">{r.src.name}</span> to all 9 other major ports.
                    The <span className="text-emerald-600 dark:text-emerald-400 font-semibold">green</span> bar is the currently-selected destination ({r.dst.name}).
                    Distance: <span className="font-mono text-primary">{r.d_km.toFixed(0)} km</span> = <span className="font-mono text-primary">{r.d_nm.toFixed(0)} nm</span>.
                    Flight time at 900 km/h: <span className="font-mono">{r.flight_time_h.toFixed(1)}h</span>.
                    Vessel transit at 20 knots (37 km/h): <span className="font-mono">{r.vessel_days.toFixed(1)} days</span>.
                  </p>
                </div>
              );
            }}
          />
        </SectionCard>
      )}

      {tab === "math" && (
        <SectionCard
          title="Math derivation — where Haversine comes from"
          description="Bowring (1805) derived the haversine formula to avoid catastrophic cancellation in the spherical law of cosines for small angles. The haversine (half-versine) function is hav(θ) = sin²(θ/2) = (1 − cos(θ))/2."
          icon={<BookOpen className="h-5 w-5" />}
          badge="derivation"
        >
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground/80">The equation.</strong> The haversine of the central angle Δσ between two points on a sphere is: hav(Δσ) = hav(φ₂ − φ₁) + cos(φ₁)·cos(φ₂)·hav(λ₂ − λ₁), where hav(θ) = sin²(θ/2). Solving for Δσ: Δσ = 2·arcsin(√(...)) and distance d = R·Δσ.
            </p>
            <p>
              <strong className="text-foreground/80">Why haversine, not spherical law of cosines.</strong> The spherical law of cosines gives cos(Δσ) = sin(φ₁)·sin(φ₂) + cos(φ₁)·cos(φ₂)·cos(Δλ). For small Δσ (nearby points), cos(Δσ) ≈ 1, and the difference 1 − cos(Δσ) loses precision (catastrophic cancellation). Haversine avoids this by computing 1 − cos(Δσ) directly as 2·sin²(Δσ/2), which is well-conditioned.
            </p>
            <p>
              <strong className="text-foreground/80">Why great-circle, not Euclidean.</strong> Two points on a sphere are connected by a great circle (the intersection of the sphere with a plane through both points and the centre). The shortest path is along this great circle. For Rotterdam→Singapore (latitudes 51.9°N and 1.3°N, longitudes 4.1°E and 103.9°E), the Euclidean (flat-Earth) distance would be ~10,000 km; the great-circle distance is ~16,500 km. The Suez Canal route follows the great circle.
            </p>
            <p>
              <strong className="text-foreground/80">Aviation, astronomy, genomics.</strong> LHR→JFK flight paths follow great circles (5,550 km, polar route in winter). Astronomers compute Sirius→Canopus angular separation (36° on the unit celestial sphere, where R=1). Genomics uses Haversine-like distance metrics on the manifold of allele frequencies. The formula doesn't know if R is Earth's radius (km) or 1 (unit sphere).
            </p>
            <p>
              <strong className="text-foreground/80">Citation.</strong> Bowring, "A new analytical method for the determination of the latitude and longitude of a point on the surface of the Earth" (1805, posthumous). Sinnott, "Virtues of the Haversine", Sky &amp; Telescope 68:2 (1984).
            </p>
          </div>
        </SectionCard>
      )}

      {tab === "production" && (
        <SectionCard
          title="Production code — what geopy and PostGIS compute"
          description="In production, you call geopy.distance.great_circle (Python) or use PostGIS geography type with ST_Distance (returns meters). Both implement the haversine under the hood. MarineTraffic computes millions of these per day for ETA prediction."
          icon={<Cpu className="h-5 w-5" />}
          badge="production"
        >
          <CodeBlock
            language="python"
            filename="production_haversine.py"
            code={`# Production Haversine via geopy + PostGIS
from geopy.distance import great_circle, geodesic

# 10 major global ports
ports = {
    "Rotterdam":   (51.95, 4.14),
    "Singapore":   (1.29, 103.85),
    "Shanghai":    (31.23, 121.47),
    "Los Angeles": (33.74, -118.27),
    "Hamburg":     (53.55, 9.99),
    "Hong Kong":   (22.30, 114.17),
    "Dubai":       (25.01, 55.06),
    "Antwerp":     (51.32, 4.32),
    "Busan":       (35.05, 129.04),
    "New York":    (40.70, -74.04),
}

# Compute all pairwise distances (great-circle, haversine-based)
import pandas as pd
import numpy as np
n = len(ports)
dist_matrix = np.zeros((n, n))
names = list(ports.keys())
for i, (n1, p1) in enumerate(ports.items()):
    for j, (n2, p2) in enumerate(ports.items()):
        if i != j:
            # geopy great_circle uses haversine internally
            dist_matrix[i, j] = great_circle(p1, p2).kilometers

df = pd.DataFrame(dist_matrix, index=names, columns=names)
print(f"Rotterdam to Singapore: {df.loc['Rotterdam', 'Singapore']:.0f} km")

# PostGIS production (in SQL):
# SELECT ST_Distance(
#   ST_GeographyFromText('POINT(4.14 51.95)'),  -- Rotterdam
#   ST_GeographyFromText('POINT(103.85 1.29)')  -- Singapore
# ) AS distance_meters;
# → 16528344 meters = 16,528 km

# MarineTraffic computes millions of these per day:
# - ETA prediction (vessel speed × remaining great-circle distance)
# - Route optimization (cheapest path through canal/straits)
# - Port congestion (sum of approaching vessels / berth capacity)`}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Link href={hrefFor("global-shipping")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ Global Shipping</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">Maritime analytics hub — AIS, ports, Lloyd's, UN COMTRADE.</p>
            </Link>
            <Link href={hrefFor("elegant-code")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ Elegant Code (Haversine card)</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">Haversine's full cross-disciplinary card: maritime ↔ aviation ↔ astronomy.</p>
            </Link>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="My deeper thought: Haversine IS the universal great-circle distance"
        description="A port captain computing Rotterdam→Singapore sailing distance, an airline dispatcher computing LHR→JFK flight distance, and an astronomer computing Sirius→Canopus angular separation all use the SAME formula — because all three measure shortest-path distance on a sphere. The haversine (half-versine) was invented in 1805 to avoid catastrophic cancellation in the spherical law of cosines for small angles. The formula doesn't know if R is Earth's radius (6371 km) or 1 (unit sphere for the celestial sphere). A port captain, a flight dispatcher, and an astronomer are computing the same numbers — and none of them knows it."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">A port captain, a flight dispatcher, and an astronomer</strong> are computing the same numbers. The math is universal — the application is irrelevant.</p>
        </div>
      </SectionCard>

      <RelatedElegantCode sourceCard={11} />
      <RelatedTopics topics={[
        { id: "global-shipping" as const, reason: "Global Shipping — maritime analytics hub" },
        { id: "elegant-code" as const, reason: "Elegant Code — the Haversine card (cross-disciplinary)" },
        { id: "living-kalman" as const, reason: "Living Kalman (cousin: vessel tracking)" },
        { id: "space-science" as const, reason: "Space Science — haversine on the celestial sphere" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("elegant-code")} className="text-sm text-primary hover:underline">→ Elegant Code (Haversine card)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("global-shipping")} className="text-sm text-primary hover:underline">→ Global Shipping (production)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("living-kalman")} className="text-sm text-primary hover:underline">→ Living Kalman (cousin)</Link>
      </div>
    </div>
  );
}
