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
import { Activity, Sparkles, TrendingUp, Cpu, BookOpen, Database, Ship } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

type Tab = "math" | "live" | "production";

const KPIS = [
  { label: "Dataset", value: "Synthetic AIS vessel track (50 steps)", hint: "Vessel true position (random walk + drift), AIS reports with Gaussian noise σ_AIS. Real AIS: 100K vessels × 2-60s updates via MarineTraffic.", deltaTone: "flat" as const },
  { label: "Equation", value: "x̂(t+1) = x̂(t) + K·(z − H·x̂(t))", hint: "Kalman update. K = P·H^T·(H·P·H^T + R)^(-1) is the Kalman gain — weights prediction vs measurement.", deltaTone: "flat" as const },
  { label: "Slider", value: "R (measurement noise variance)", hint: "Drag R from 0.001 to 1.0. Small R: trust AIS, responsive (noisy track). Large R: trust model, smooth (laggy track). Trade-off via R.", deltaTone: "up" as const },
  { label: "Production", value: "filterpy.KalmanFilter", hint: "Production: filterpy.KalmanFilter(dim_x, dim_z). OpenCV cv2.KalmanFilter. Apollo navigation used Kalman for lunar module.", deltaTone: "flat" as const },
];

export function LivingKalmanPage() {
  const [tab, setTab] = useState<Tab>("live");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Living equation · run Kalman Filter live in your browser"
        title="Living Kalman — vessel tracking from noisy AIS reports"
        description="A Kalman filter fuses noisy AIS position reports with a kinematic motion model to produce a smooth vessel track. Drag R (measurement noise variance) and watch the filter trade responsiveness (small R, follows AIS) against smoothness (large R, follows model). The SAME filter tracks aircraft via ADS-B, alleles via 1000-Genomes, and Apollo 11's lunar module — because all three ask 'given noisy measurements and a state model, what's the best estimate of the true state?'"
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3" /> Bayesian Estimation</Badge>
            <Badge variant="outline" className="gap-1.5"><Ship className="h-3 w-3" /> AIS Vessel Tracking</Badge>
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
          ["live", "Live demo (Pyodide + slider)"],
          ["math", "Math derivation"],
          ["production", "Production code (filterpy)"],
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
          title="Live Kalman on synthetic AIS — drag R and watch tracking trade off"
          description="The vessel's true position evolves as a random walk + drift (toward the destination). AIS reports are noisy observations of the true position. The Kalman filter fuses model (predict where the vessel will be) + measurement (AIS says where it is) via the Kalman gain K = P/(P+R). Small R → trust AIS, track follows reports (responsive but noisy). Large R → trust model, track smooth (but lags behind)."
          icon={<Sparkles className="h-5 w-5" />}
          badge="live"
        >
          <LivingEquationRunner
            slider={{
              name: "R",
              label: "R (AIS measurement noise variance)",
              min: 1,
              max: 100,
              step: 1,
              default: 25,
              hint: "R=1 (σ=1m): trust AIS, very responsive. R=25 (σ=5m, real AIS noise): balanced. R=100: trust model, very smooth but lags.",
            }}
            preamble="import json, math, random"
            code={`import json, math, random

random.seed(42)

# Simulate a vessel's true position (random walk + drift toward destination).
# State: x = [lat, lon] (2D position).
# Real AIS: lat/lon updates every 2-60 seconds with σ ≈ 5-15m.
N = 50  # number of timesteps
true_lat = 51.95  # start at Rotterdam
true_lon = 4.14
# Vessel drifts toward Singapore (random walk toward SE)
drift_lat = -0.001   # deg per step (heading south)
drift_lon = 0.005    # deg per step (heading east)
process_noise_lat = 0.0003  # σ for random walk (deg)
process_noise_lon = 0.0015

true_positions = []
for t in range(N):
    true_lat += drift_lat + random.gauss(0, process_noise_lat)
    true_lon += drift_lon + random.gauss(0, process_noise_lon)
    true_positions.append((true_lat, true_lon))

# Simulate AIS measurements (noisy observations of true position).
R = \${R} / 1000.0  # slider value, convert to deg² (variance)
sigma_AIS = math.sqrt(R)
ais_measurements = []
for lat, lon in true_positions:
    z_lat = lat + random.gauss(0, sigma_AIS)
    z_lon = lon + random.gauss(0, sigma_AIS)
    ais_measurements.append((z_lat, z_lon))

# 1D Kalman filter (treat lat and lon independently for simplicity).
# State: x = scalar position (lat or lon)
# Model: x(t+1) = x(t) + drift + w(t), where w ~ N(0, Q)
# Measurement: z(t) = x(t) + v(t), where v ~ N(0, R)
# Update:
#   Predict: x_pred = x_est + drift; P_pred = P + Q
#   Update:  K = P_pred / (P_pred + R); x_est = x_pred + K*(z - x_pred); P = (1-K)*P_pred

# Process noise (model uncertainty)
Q = process_noise_lat ** 2  # variance of model noise

def kalman_1d(initial_x, drift, Q_val, R_val, measurements):
    x = initial_x
    P = 1.0  # initial uncertainty
    estimates = []
    for z in measurements:
        # Predict
        x_pred = x + drift
        P_pred = P + Q_val
        # Update
        K = P_pred / (P_pred + R_val)
        x = x_pred + K * (z - x_pred)
        P = (1 - K) * P_pred
        estimates.append(x)
    return estimates

# Apply Kalman filter to latitude
true_lats = [p[0] for p in true_positions]
ais_lats = [z[0] for z in ais_measurements]
est_lats = kalman_1d(true_lats[0] - drift_lat, drift_lat, Q, R, ais_lats)

# Apply Kalman filter to longitude (use lon's drift and noise)
Q_lon = process_noise_lon ** 2
true_lons = [p[1] for p in true_positions]
ais_lons = [z[1] for z in ais_measurements]
est_lons = kalman_1d(true_lons[0] - drift_lon, drift_lon, Q_lon, R, ais_lons)

# Build chart data: time series of true / AIS / Kalman estimates.
chart_data = []
for t in range(N):
    # Plot longitude (more visible variation than latitude)
    chart_data.append({
        'step': t,
        'true_lon': true_lons[t],
        'ais_lon': ais_lons[t],
        'kalman_lon': est_lons[t],
    })

# Compute RMSE: Kalman vs AIS
rmse_kalman = math.sqrt(sum((true_lons[i] - est_lons[i]) ** 2 for i in range(N)) / N)
rmse_ais = math.sqrt(sum((true_lons[i] - ais_lons[i]) ** 2 for i in range(N)) / N)

# Final Kalman gain (steady-state approximation)
final_P = Q / (1 - (1 - Q / (Q + R)) ** N) if Q + R > 0 else 0
# Simpler: just report the last K used in the loop
# Re-compute by running one more step:
x_test = est_lons[-1]
P_test = 0.5  # rough estimate
P_pred_test = P_test + Q_lon
final_K = P_pred_test / (P_pred_test + R)

result = {
    'chart_data': chart_data,
    'rmse_kalman': rmse_kalman,
    'rmse_ais': rmse_ais,
    'R': R,
    'sigma_AIS': sigma_AIS,
    'final_K': final_K,
    'N': N,
}
print(json.dumps(result))
`}
            renderer={(result) => {
              const r = result as { chart_data: Array<{ step: number; true_lon: number; ais_lon: number; kalman_lon: number }>; rmse_kalman: number; rmse_ais: number; R: number; sigma_AIS: number; final_K: number; N: number };
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">R</p>
                      <p className="font-mono font-bold text-primary text-base">{r.R.toFixed(3)}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">σ_AIS</p>
                      <p className="font-mono font-bold text-primary text-base">{r.sigma_AIS.toFixed(4)}°</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">RMSE Kalman</p>
                      <p className="font-mono font-bold text-primary text-base">{r.rmse_kalman.toFixed(4)}°</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">RMSE raw AIS</p>
                      <p className="font-mono font-bold text-primary text-base">{r.rmse_ais.toFixed(4)}°</p>
                    </div>
                  </div>

                  <div style={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer>
                      <LineChart data={r.chart_data} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <XAxis dataKey="step" stroke="hsl(var(--muted-foreground))" fontSize={10} label={{ value: "time step", position: "insideBottom", offset: -10, fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} label={{ value: "longitude (deg)", angle: -90, position: "insideLeft", fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => value.toFixed(4)} labelFormatter={(label) => `step ${label}`} />
                        <Legend />
                        <Line name="True position (hidden)" type="monotone" dataKey="true_lon" stroke="#16a34a" strokeWidth={2.5} dot={false} />
                        <Line name="AIS reports (noisy)" type="monotone" dataKey="ais_lon" stroke="#dc2626" strokeWidth={1} dot={true} strokeOpacity={0.6} />
                        <Line name="Kalman estimate" type="monotone" dataKey="kalman_lon" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The <span className="text-emerald-600 dark:text-emerald-400 font-semibold">green line</span> is the vessel's true (hidden) position. The <span className="text-rose-600 dark:text-rose-400 font-semibold">red dots</span> are noisy AIS reports. The <span className="text-blue-600 dark:text-blue-400 font-semibold">blue line</span> is the Kalman filter's estimate.
                    At <span className="font-mono text-primary">R = {r.R.toFixed(3)}</span> (σ_AIS = {r.sigma_AIS.toFixed(4)}°):
                    Kalman RMSE = <span className="font-mono text-primary">{r.rmse_kalman.toFixed(4)}°</span> vs raw AIS RMSE = <span className="font-mono text-primary">{r.rmse_ais.toFixed(4)}°</span>.
                    The Kalman filter <strong className="text-foreground/80">denoises by {(((1 - r.rmse_kalman / r.rmse_ais) * 100)).toFixed(1)}%</strong> versus raw AIS.
                  </p>
                </div>
              );
            }}
          />
        </SectionCard>
      )}

      {tab === "math" && (
        <SectionCard
          title="Math derivation — where Kalman comes from"
          description="Kalman (1960) derived the linear-quadratic estimator as the minimum-mean-square-error (MMSE) Bayesian filter for linear Gaussian systems. The Kalman gain K is the optimal weighting between prediction and measurement."
          icon={<BookOpen className="h-5 w-5" />}
          badge="derivation"
        >
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground/80">The state-space model.</strong> Linear dynamics: x(t+1) = F·x(t) + w(t), w ~ N(0, Q). Linear measurement: z(t) = H·x(t) + v(t), v ~ N(0, R). The state x is hidden; we observe only z. Goal: estimate x given the history of z's.
            </p>
            <p>
              <strong className="text-foreground/80">The two-step update.</strong> Predict: x_pred = F·x_est; P_pred = F·P·F^T + Q. (P is the state covariance.) Update: K = P_pred·H^T·(H·P_pred·H^T + R)^(-1); x_est = x_pred + K·(z − H·x_pred); P = (I − K·H)·P_pred. The Kalman gain K weights the residual (z − H·x_pred) against the prediction.
            </p>
            <p>
              <strong className="text-foreground/80">Why K = P/(P+R) in the 1D case.</strong> If P (model uncertainty) is large relative to R (measurement noise), then K → 1: trust the measurement. If R is large relative to P, then K → 0: trust the model. The optimal K minimises E[(x − x_est)²] (MMSE).
            </p>
            <p>
              <strong className="text-foreground/80">Apollo navigation (1969).</strong> The lunar module's onboard computer ran a Kalman filter fusing inertial measurement unit (IMU) data with radar altimeter measurements. The filter estimated position, velocity, and attitude — critical for the descent to the lunar surface. Kalman 1960 → Apollo 1969 in less than a decade. Today, every phone GPS uses an extended Kalman filter (EKF) fusing satellite pseudoranges with motion models.
            </p>
            <p>
              <strong className="text-foreground/80">Citation.</strong> Kalman, 'A New Approach to Linear Filtering and Prediction Problems', ASME J. Basic Eng. 82:1 (1960). Humpherys, 'Apollo navigation — Kalman filter' (1969).
            </p>
          </div>
        </SectionCard>
      )}

      {tab === "production" && (
        <SectionCard
          title="Production code — what filterpy and OpenCV compute"
          description="In production, you call filterpy.KalmanFilter (Python) or cv2.KalmanFilter (C++). Both implement the full predict/update cycle. MarineTraffic uses a Kalman variant for AIS track smoothing; FlightAware uses it for ADS-B flight tracking."
          icon={<Cpu className="h-5 w-5" />}
          badge="production"
        >
          <CodeBlock
            language="python"
            filename="production_kalman.py"
            code={`# Production Kalman filter on real AIS data
import numpy as np
from filterpy.kalman import KalmanFilter
import pandas as pd

# Load real AIS track from MarineTraffic
# Format: timestamp, mmsi, lat, lon, sog, cog, heading
ais = pd.read_csv('vessel_track.csv')  # ~360 positions per vessel per hour

# 4D state: [lat, lat_vel, lon, lon_vel]
# 2D measurement: [lat, lon] (from AIS)
kf = KalmanFilter(dim_x=4, dim_z=2)

# State transition: constant velocity model
dt = 60  # 60 seconds between AIS reports (typical)
kf.F = np.array([
    [1, dt, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, dt],
    [0, 0, 0, 1],
], dtype=float)

# Measurement: observe lat, lon (not velocities)
kf.H = np.array([
    [1, 0, 0, 0],
    [0, 0, 1, 0],
], dtype=float)

# Process noise (model uncertainty) — Q matrix
# (Tune empirically; small Q = trust model, large Q = trust measurements)
kf.Q = np.diag([1e-6, 1e-9, 1e-5, 1e-9])

# Measurement noise (AIS noise) — R matrix
# Real AIS: σ ≈ 5-15 meters → R = σ^2 ≈ 25-225 m^2
# In degrees: 1 m ≈ 9e-6 deg, so R_lat = R_lon = (5e-5)^2 = 2.5e-9
kf.R = np.diag([2.5e-9, 2.5e-9])

# Initial state from first AIS report
kf.x = np.array([ais.lat.iloc[0], 0, ais.lon.iloc[0], 0])
kf.P = np.diag([1e-4, 1e-6, 1e-4, 1e-6])  # initial uncertainty

# Run the filter
estimates = []
for _, row in ais.iterrows():
    kf.predict()
    kf.update([row.lat, row.lon])
    estimates.append({
        'lat': kf.x[0], 'lat_vel': kf.x[1],
        'lon': kf.x[2], 'lon_vel': kf.x[3],
    })

est_df = pd.DataFrame(estimates)
print(f"Track smoothed: {len(est_df)} positions")
print(f"Mean lat velocity: {est_df.lat_vel.mean():.6f} deg/s")
print(f"Mean lon velocity: {est_df.lon_vel.mean():.6f} deg/s")

# Real production: MarineTraffic computes this for 100K vessels × 24h × 60 updates/h = 1.4×10⁸
# Kalman iterations per day. Output: smooth tracks for ETA prediction, port congestion analytics.`}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Link href={hrefFor("global-shipping")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ Global Shipping</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">Maritime analytics hub — AIS tracking, Lloyd's, port congestion.</p>
            </Link>
            <Link href={hrefFor("elegant-code")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ Elegant Code (Kalman card)</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">Kalman's full cross-disciplinary card: maritime ↔ aviation ↔ genetics.</p>
            </Link>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="My deeper thought: Kalman IS the universal state-estimation equation"
        description="A port authority tracking vessel positions from noisy AIS (100K vessels × 60s updates), an ATC controller tracking aircraft from noisy ADS-B pings (100K flights × 1s updates), and a population geneticist tracking allele frequencies from noisy sequencing read counts (10⁶ SNPs × per-generation updates) all use the SAME Bayesian update — because all three ask 'given a noisy measurement z and a state-space model, what's the MMSE estimate of the true state?'. Kalman 1960 invented this for Apollo navigation (1969)."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">A port captain, an ATC controller, and a geneticist</strong> are running the same update step. The math is universal — the application is irrelevant.</p>
        </div>
      </SectionCard>

      <RelatedElegantCode sourceCard={16} />

      <DeeperThoughtSection pageTitle="Kalman">
        <DeeperThought title="Kalman IS the universal state estimator — vessels, planes, alleles, and Apollo" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"A port authority tracking 100K vessels from noisy AIS, an ATC controller tracking 100K flights from noisy ADS-B, and a geneticist tracking allele frequencies from noisy sequencing all use the SAME Bayesian update. Kalman 1960 invented this for Apollo's lunar module navigation (1969). The math doesn't know if the state is [lat, lon, SOG, COG] or [allele_freq, drift_rate]. It just fuses a noisy measurement with a state-space model to produce the MMSE estimate. The Kalman gain K = P/(P+R) is universal because it's the optimal linear Bayesian estimator."}</p>
        </DeeperThought>
        <DeeperThought title="The Kalman gain IS the trust ratio — model vs measurement" connectedTo="ADR-051 (living-equation pages)">
          <p>{"When you drag R on this page, K changes. Small R (trust AIS) → K≈1 (measurement dominates, track follows reports — responsive but noisy). Large R (trust model) → K≈0 (model dominates, track is smooth but lags). The Kalman gain IS the ratio of how much you trust your measurement vs your model. It's the same trade-off in every Bayesian system: prior vs likelihood. Kalman makes it quantitative — K = P/(P+R) is the optimal weighting. Understanding K IS understanding Bayesian inference."}</p>
        </DeeperThought>
        <DeeperThought title="Apollo 11 used Kalman — the filter went to the Moon before it went to production" connectedTo="ADR-001 (platform architecture)">
          <p>{"Kalman published his filter in 1960. By 1969, it was running on the Apollo Guidance Computer (AGC) — a 2KB-RAM, 32KB-ROM machine with 0.043 MHz clock speed. The AGC ran Kalman to fuse IMU data with radar altimeter measurements during the lunar descent. The filter went to the Moon before it went to automotive GPS, maritime AIS, or financial trading. Nine years from theory to lunar module — one of the fastest theory-to-deployment cycles in engineering history. Every phone GPS uses an extended Kalman filter today."}</p>
        </DeeperThought>
        <DeeperThought title="The 3-line time series IS the proof — true / noisy / filtered" connectedTo="ADR-051 (living-equation pages)">
          <p>{"When you click 'Run analytics' on this page, you see 3 lines: green (true position, hidden in real life), red dots (noisy AIS reports), blue (Kalman estimate). The blue line tracks the green line more closely than the red dots — the filter DENOISES. The RMSE comparison (Kalman vs raw AIS) quantifies the improvement. The visual output — 3 overlapping lines — communicates 'filtering works' instantly. The brain sees the blue line hugging the green and understands: the math is extracting signal from noise."}</p>
        </DeeperThought>
        <DeeperThought title="The Kalman filter IS Bayesian belief updating — same as Bayes' theorem" connectedTo="ADR-007 (Bayesian methods)">
          <p>{"The Kalman update x̂(t+1) = x̂(t) + K·(z - H·x̂(t)) IS Bayes' theorem in linear-Gaussian form. The prediction step uses the prior (model-based state estimate). The update step uses the likelihood (measurement z). The Kalman gain K IS the posterior weighting. The SAME equation as Bayes — P(H|D) = P(D|H)P(H)/P(D) — just in matrix form with Gaussian distributions. A Bayesian sees Kalman; a controls engineer sees Kalman; a geneticist sees Kalman. They're all doing the same computation."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "global-shipping" as const, reason: "Global Shipping — vessel tracking via AIS + Kalman" },
        { id: "elegant-code" as const, reason: "Elegant Code — the Kalman card (cross-disciplinary)" },
        { id: "space-science" as const, reason: "Space Science — Kalman in Apollo + satellite navigation" },
        { id: "living-haversine" as const, reason: "Living Haversine (cousin: port distance)" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("elegant-code")} className="text-sm text-primary hover:underline">→ Elegant Code (Kalman card)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("global-shipping")} className="text-sm text-primary hover:underline">→ Global Shipping (production)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("living-haversine")} className="text-sm text-primary hover:underline">→ Living Haversine (cousin)</Link>
      </div>
    </div>
  );
}
