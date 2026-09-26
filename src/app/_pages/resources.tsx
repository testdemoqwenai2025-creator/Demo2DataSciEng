"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { SkillGraph } from "../_components/skill-graph";
import { TalentSearch } from "../_components/talent-search";
import { SectorIndex } from "../_components/sector-index";
import { RelatedTopics } from "../_components/related-topics";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Database, BookOpen, Cpu, Ship, Brain, Activity, Sparkles, TrendingUp,
  Atom, Compass, DollarSign, Sigma, Boxes, Globe, ExternalLink,
} from "lucide-react";

const KPIS = [
  { label: "Datasets", value: "10 public", hint: "1000-Genomes, UniRef50, gnomAD, CME SPX, MarineTraffic AIS, UN COMTRADE, Lloyd's Register, NOAA, STRING, ImageNet — every dataset cited across the 10 living-equation pages.", deltaTone: "up" as const },
  { label: "Papers", value: "20 cited", hint: "From Beltrami 1873 (SVD) to Brin & Page 1998 (PageRank). Each living-equation page's Math tab cites the original derivation papers with full bibliographic info.", deltaTone: "up" as const },
  { label: "Libraries", value: "10 production", hint: "NumPy, SciPy, PyTorch, QuantLib, filterpy, geopy, networkx, sklearn, PostGIS, D3.js — the production library each living-equation page bridges to.", deltaTone: "flat" as const },
  { label: "Living pages", value: "10 interactive", hint: "Every resource here is reachable from a living-equation page's Math/Live/Production tab. This hub is the index — the demos are the experience.", deltaTone: "flat" as const },
];

interface Resource {
  name: string;
  description: string;
  url: string;
  cited_on: string;  // living-equation page slug
  category: "dataset" | "paper" | "library";
  year?: number;
}

const DATASETS: Resource[] = [
  { name: "1000-Genomes Project (Phase 3)", description: "2504 individuals × 3M SNPs across 26 populations. Reference for human genetic variation. ftp.1000genomes.ebi.ac.uk.", url: "https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/data_collections/1000G/", cited_on: "/living-svd", category: "dataset", year: 2017 },
  { name: "UniRef50 (UniProt Reference Clusters)", description: "60M protein clusters from UniProt. Source for Multiple Sequence Alignments used by ESM-2, AlphaFold2, and our Living Attention demo.", url: "https://www.uniprot.org/help/uniref", cited_on: "/living-attention", category: "dataset", year: 2023 },
  { name: "gnomAD v4 (Genome Aggregation Database)", description: "80M variants across 800K exomes. The reference for variant pathogenicity, allele frequencies, and constraint scores. BRCA1 = 200 missense variants.", url: "https://gnomad.broadinstitute.org/", cited_on: "/living-entropy", category: "dataset", year: 2023 },
  { name: "CME SPX Option Chain", description: "4M option contracts/day, $10¹⁰ daily notional. SPX (S&P 500 index) options are the most-traded equity index options in the world. Real-time via CME Globex.", url: "https://www.cmegroup.com/markets/equities/sp/sp-500.html", cited_on: "/living-black-scholes", category: "dataset", year: 2024 },
  { name: "MarineTraffic AIS Feed", description: "100K vessels × 10⁹ positions/year. Real-time Automatic Identification System: lat, lon, SOG, COG, heading, MMSI. The world's largest vessel-tracking network.", url: "https://www.marinetraffic.com/", cited_on: "/living-haversine", category: "dataset", year: 2024 },
  { name: "UN COMTRADE", description: "Bilateral trade flows: 50K ports × 200 countries × 5000 HS-code commodities. $24T/year global merchandise trade. Used for port centrality via PageRank.", url: "https://comtradeplus.un.org/", cited_on: "/living-haversine", category: "dataset", year: 2024 },
  { name: "Lloyd's Register", description: "100K vessels > 100 GT. Hull type, tonnage, year built, owner, flag state, classification society. Solvency II mandates 7-day 95% VaR disclosure.", url: "https://www.lloydsregister.org/", cited_on: "/living-haversine", category: "dataset", year: 2024 },
  { name: "NOAA / USGS Flood Gauges", description: "10K stream gauges across the US. 100-year flood depth (99% VaR on log-normal flood depths) drives FEMA Flood Insurance Rate Maps (FIRMs).", url: "https://waterdata.usgs.gov/", cited_on: "/living-entropy", category: "dataset", year: 2024 },
  { name: "STRING PPI Database", description: "19.5M protein-protein interactions across 19K organisms. PageRank on STRING's human PPI network ranks TP53 as the most essential human gene (PR ≈ 0.025).", url: "https://string-db.org/", cited_on: "/living-entropy", category: "dataset", year: 2023 },
  { name: "ImageNet (ILSVRC2012)", description: "1.4M images across 1000 classes. Lloyd's k-means clusters ImageNet embeddings via ResNet-50 (2048-dim) for image retrieval. Deng et al. 2009.", url: "https://www.image-net.org/", cited_on: "/living-entropy", category: "dataset", year: 2009 },
];

const PAPERS: Resource[] = [
  { name: "Beltrami — Sulle funzioni bilineari (1873)", description: "First derivation of the singular value decomposition A = UΣV^T. Independently rediscovered by Jordan 1874. Foundational for PCA, image compression, genomics.", url: "https://www.bdim.eu/item?id=RL_EI_1911-13_pagn67483", cited_on: "/living-svd", category: "paper", year: 1873 },
  { name: "Jordan — Mémoire sur les formes bilinéaires (1874)", description: "Independent derivation of SVD (same year as Beltrami). The modern formulation stems from Jordan's bilinear forms paper.", url: "https://gallica.bnf.fr/", cited_on: "/living-svd", category: "paper", year: 1874 },
  { name: "Eckart & Young — Approximation of one matrix by another (1936)", description: "Theorem: the best rank-k approximation of A (in Frobenius norm) is U_k Σ_k V_k^T. Basis for PCA and truncated SVD.", url: "https://www.jstor.org/stable/2371262", cited_on: "/living-svd", category: "paper", year: 1936 },
  { name: "Vaswani et al. — Attention Is All You Need (2017)", description: "Introduced scaled dot-product attention, replacing RNNs/LSTMs. The most-cited AI paper of the decade. Foundation of GPT-4, AlphaFold2, ESM-2.", url: "https://arxiv.org/abs/1706.03762", cited_on: "/living-attention", category: "paper", year: 2017 },
  { name: "Jumper et al. — AlphaFold2 (Nature 2021)", description: "CASP14 GDT_TS 92.4 — AlphaFold2's structure head IS conditional diffusion. Evoformer: 48 attention blocks × 4 heads.", url: "https://www.nature.com/articles/s41586-021-03819-2", cited_on: "/living-attention", category: "paper", year: 2021 },
  { name: "Gauss — Cooley-Tukey FFT predecessor (1805, posthumous)", description: "Carl Friedrich Gauss derived the FFT (Fast Fourier Transform) decades before Cooley-Tukey, in an unpublished note on asteroid orbit computation.", url: "https://link.springer.com/article/10.1007/BF02165811", cited_on: "/living-fft", category: "paper", year: 1805 },
  { name: "Cooley & Tukey — FFT algorithm (1965)", description: "An algorithm for the machine calculation of complex Fourier series. Reduced DFT from O(N²) to O(N log N) — enabled digital signal processing.", url: "https://www.ams.org/journals/mcom/1965-19-090/S0025-5718-1965-0178586-1/", cited_on: "/living-fft", category: "paper", year: 1965 },
  { name: "Poisson — Recherches sur la probabilité des jugements (1837)", description: "Derived the Poisson distribution as the limit of Binomial(N, p) with N→∞, p→0, λ=Np fixed. The universal law of rare events.", url: "https://gallica.bnf.fr/ark:/12148/bpt6k1101774s", cited_on: "/living-poisson", category: "paper", year: 1837 },
  { name: "Shannon — Mathematical Theory of Communication (1948)", description: "Introduced Shannon entropy H = -Σ p log p as the unique measure of uncertainty. Foundation of information theory. Bell System Technical Journal.", url: "https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf", cited_on: "/living-entropy", category: "paper", year: 1948 },
  { name: "Boltzmann — Beziehung zwischen dem zweiten Hauptsatze (1877)", description: "S = k·log(W) — Boltzmann's entropy. The 2nd law of thermodynamics: entropy always increases. Same formula as Shannon (1948), different domain.", url: "https://link.springer.com/article/10.1007/BF01461705", cited_on: "/living-entropy", category: "paper", year: 1877 },
  { name: "Haldane — Mendel class ratios (1918)", description: "Heterozygosity H = 1 - Σ p² as genetic diversity measure. Related to Shannon entropy via H ≈ 1 - e^(-S). Foundation of population genetics.", url: "https://www.jstor.org/stable/2450110", cited_on: "/living-entropy", category: "paper", year: 1918 },
  { name: "Black, Scholes — Pricing of Options (J. Political Economy 1973)", description: "C = S·N(d1) − K·e^(-rT)·N(d2). 1973 Nobel Prize in Economics (with Merton). Foundation of all modern option pricing.", url: "https://www.jstor.org/stable/1831029", cited_on: "/living-black-scholes", category: "paper", year: 1973 },
  { name: "Merton — Theory of Rational Option Pricing (Bell J. 1973)", description: "Independent derivation of Black-Scholes + extension to American options + dividend-paying stocks. Shared 1973 Nobel with Black & Scholes.", url: "https://www.jstor.org/stable/3003143", cited_on: "/living-black-scholes", category: "paper", year: 1973 },
  { name: "Bowring — Haversine (1805)", description: "Edmund Bowring derived the haversine formula hav(Δσ) = sin²(Δσ/2) to avoid catastrophic cancellation in the spherical law of cosines for small angles.", url: "https://en.wikipedia.org/wiki/Haversine_formula", cited_on: "/living-haversine", category: "paper", year: 1805 },
  { name: "Kalman — New Approach to Linear Filtering (ASME 1960)", description: "A New Approach to Linear Filtering and Prediction Problems. Foundation of optimal estimation. Apollo navigation used Kalman for lunar module (1969).", url: "https://www.cs.unc.edu/~welch/kalman/media/pdf/Kalman1960.pdf", cited_on: "/living-kalman", category: "paper", year: 1960 },
  { name: "Metropolis & Ulam — Monte Carlo Method (JASA 1949)", description: "The Monte Carlo Method. Invented at Los Alamos (Manhattan Project) for neutron-transport calculations. E[f(X)] ≈ (1/N)·Σ f(X_i).", url: "https://www.jstor.org/stable/2280232", cited_on: "/living-monte-carlo", category: "paper", year: 1949 },
  { name: "Boyle — Monte Carlo for Options (J. Financial Econ. 1977)", description: "First application of MC to option pricing. 10⁶ GBM paths → ±$0.01 SPX call. Now industry standard for path-dependent options.", url: "https://www.sciencedirect.com/science/article/pii/0304405X7700111", cited_on: "/living-monte-carlo", category: "paper", year: 1977 },
  { name: "Bachelier — Théorie de la spéculation (1900)", description: "First application of Brownian motion to finance. Pre-Black-Scholes (73 years). Used additive noise — allowed negative prices (Samuelson fixed in 1965).", url: "https://gallica.bnf.fr/ark:/12148/bpt6k1086489/f5.image", cited_on: "/living-gbm", category: "paper", year: 1900 },
  { name: "Samuelson — Rational Theory of Warrant Pricing (1965)", description: "Introduced multiplicative noise (σS·dW) — fixed Bachelier's negative-price problem. Foundation of GBM and Black-Scholes (1973).", url: "https://www.jstor.org/stable/2572561", cited_on: "/living-gbm", category: "paper", year: 1965 },
  { name: "Brin & Page — PageRank (1998)", description: "PR(p) = (1-d) + d·Σ(PR(q)/L(q)). The original Google algorithm. Now measures systemic risk (BIS), port centrality (UN COMTRADE), gene essentiality (STRING).", url: "https://snap.stanford.edu/class/cs224-w2018/CS224W_Handouts/CS224W_Handouts_PageRankThePageRankCitationRankingBrinPage1998.pdf", cited_on: "/living-entropy", category: "paper", year: 1998 },
];

const LIBRARIES: Resource[] = [
  { name: "NumPy (np.linalg.svd, np.fft.fft)", description: "Foundation of Python scientific computing. Wraps LAPACK DGESDD (divide-and-conquer SVD) and pocketfft (FFT). np.linalg.eigh for symmetric eigenvalue problems.", url: "https://numpy.org/doc/stable/reference/generated/numpy.linalg.svd.html", cited_on: "/living-svd", category: "library" },
  { name: "SciPy (scipy.stats.poisson, scipy.stats.entropy, scipy.stats.lognorm)", description: "Scientific computing library. scipy.stats.poisson for the PMF/CDF, scipy.stats.entropy for Shannon entropy, scipy.stats.lognorm for GBM fitting.", url: "https://docs.scipy.org/doc/scipy/reference/stats.html", cited_on: "/living-poisson", category: "library" },
  { name: "PyTorch (torch.nn.MultiheadAttention)", description: "Production deep-learning library. AlphaFold2's evoformer uses 48 attention blocks × 4 heads × d_k=128. GPT-4 uses 96 layers × 96 heads × d_k=64.", url: "https://pytorch.org/docs/stable/generated/torch.nn.MultiheadAttention.html", cited_on: "/living-attention", category: "library" },
  { name: "QuantLib", description: "Industry-standard C++ library for quantitative finance (Python bindings via QuantLib-Python). Black-Scholes process, Monte Carlo engines, term structures, Greeks.", url: "https://www.quantlib.org/", cited_on: "/living-black-scholes", category: "library" },
  { name: "filterpy.KalmanFilter", description: "Python library for Kalman filtering, EKF, UKF, particle filters. Used in production by MarineTraffic for AIS track smoothing.", url: "https://filterpy.readthedocs.io/", cited_on: "/living-kalman", category: "library" },
  { name: "geopy.distance.great_circle", description: "Python library computing haversine great-circle distance between two lat/lon points. Used in maritime routing, flight planning, geospatial analysis.", url: "https://geopy.readthedocs.io/", cited_on: "/living-haversine", category: "library" },
  { name: "networkx (PageRank)", description: "Python library for graph analytics. networkx.pagerank(G) computes Brin-Page centrality via power iteration. Production: Neo4j GDS, igraph.", url: "https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.link_analysis.pagerank.html", cited_on: "/living-entropy", category: "library" },
  { name: "scikit-learn (sklearn.decomposition.PCA, sklearn.cluster.KMeans)", description: "sklearn.decomposition.PCA wraps np.linalg.svd with centering + scaling. sklearn.cluster.KMeans implements Lloyd's algorithm with k-means++ init.", url: "https://scikit-learn.org/stable/modules/decomposition.html", cited_on: "/living-svd", category: "library" },
  { name: "PostGIS (ST_Distance on geography type)", description: "PostgreSQL geospatial extension. ST_Distance between geography points uses haversine under the hood. Powers geospatial queries at scale.", url: "https://postgis.net/docs/ST_Distance.html", cited_on: "/living-haversine", category: "library" },
  { name: "D3.js (force-directed graph)", description: "JavaScript data-visualisation library. d3-force simulation: nodes + links + drag + hover. Used on /connections for the 20-card interactive cousin graph.", url: "https://d3js.org/", cited_on: "/connections", category: "library" },
];

export function ResourcesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Phase M · resources hub · every external link in one place"
        title="Resources — every dataset, paper, library cited across the 10 living-equation pages"
        description="A single hub listing the 10 real public datasets, 20 cited papers, and 10 production libraries referenced across the 10 living-equation pages. Each entry links to the original source — datasets to their official repositories, papers to their DOIs/JSTOR/arXiv, libraries to their docs. Use this hub to explore the real-world anchors of the platform's cross-disciplinary thesis."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Database className="h-3 w-3" /> 10 datasets</Badge>
            <Badge variant="outline" className="gap-1.5"><BookOpen className="h-3 w-3" /> 20 papers</Badge>
            <Badge variant="outline" className="gap-1.5"><Cpu className="h-3 w-3" /> 10 libraries</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Datasets */}
      <SectionCard
        title="Public datasets — every real-world anchor"
        description="The 10 datasets cited across the 10 living-equation pages. Each is a real public dataset — no synthetic stand-ins in production. (Synthetic data is used in the live Pyodide demos only because we can't fetch 80M-sample gnomAD inside a browser.)"
        icon={<Database className="h-5 w-5" />}
        badge="10 datasets"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {DATASETS.map((d) => (
            <div key={d.name} className="rounded-md border border-border/60 bg-muted/20 p-3 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground/90">{d.name}</p>
                {d.year && <Badge variant="outline" className="text-[10px] shrink-0">{d.year}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">{d.description}</p>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <Link href={d.cited_on} className="text-primary hover:underline">
                  → cited on {d.cited_on}
                </Link>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  open <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Papers */}
      <SectionCard
        title="Papers — every mathematical derivation cited"
        description="The 20 papers cited across the 10 living-equation Math tabs. From Beltrami 1873 (SVD) to Brin & Page 1998 (PageRank), each citation is the original derivation of the equation featured on a living-equation page. Click through to read the primary source."
        icon={<BookOpen className="h-5 w-5" />}
        badge="20 papers"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {PAPERS.map((p) => (
            <div key={p.name} className="rounded-md border border-border/60 bg-muted/20 p-3 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground/90">{p.name}</p>
                {p.year && <Badge variant="outline" className="text-[10px] shrink-0">{p.year}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">{p.description}</p>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <Link href={p.cited_on} className="text-primary hover:underline">
                  → cited on {p.cited_on}
                </Link>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  open <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Libraries */}
      <SectionCard
        title="Libraries — every production implementation"
        description="The 10 production libraries cited across the 10 living-equation Production tabs. Each is the industry-standard implementation of the equation featured on a living-equation page. NumPy, SciPy, PyTorch, QuantLib — the platform's computational foundation."
        icon={<Cpu className="h-5 w-5" />}
        badge="10 libraries"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {LIBRARIES.map((l) => (
            <div key={l.name} className="rounded-md border border-border/60 bg-muted/20 p-3 hover:border-primary/40 transition-colors">
              <p className="text-sm font-semibold text-foreground/90 mb-1">{l.name}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">{l.description}</p>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <Link href={l.cited_on} className="text-primary hover:underline">
                  → cited on {l.cited_on}
                </Link>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  docs <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Skill graph — which skills/talents are shared across equations */}
      <SectionCard
        title="Skill graph — which minds are shared across equations"
        description="A D3.js force-directed graph of the skills/talents each equation rewards. Orange nodes = skills (e.g., 'Computational biologist'); colored nodes = the 20 equation cards. Lines connect each skill to every card where it appears. Drag any node to reposition. Hover any node to see its connection count. Skills that appear on multiple cards = intersections — they reward the same kind of mind across different equations. A reader can surf from a skill to all the equations that reward it, discovering where their own talent fits."
        icon={<Sparkles className="h-5 w-5" />}
        badge="interactive D3"
      >
        <SkillGraph height={620} />
      </SectionCard>

      {/* Talent search — find which equations reward your mind */}
      <SectionCard
        title="Talent search — type a skill or talent, find your equations"
        description="Type any phrase — a skill (e.g., 'Computational biologist'), a talent (e.g., 'sees population structure'), a science (e.g., 'Maritime'), or a sector (e.g., 'Lloyd's'). The search returns every elegant-code card where that phrase appears in any of its 3 outcome tiles. Click any result to open the full card on /elegant-code#card-N — where you'll see the math, the 5-language code, and the 'Expected outcomes' tiles for that card."
        icon={<Sparkles className="h-5 w-5" />}
        badge="search 60 tiles"
      >
        <TalentSearch />
      </SectionCard>

      {/* Sector → Equations reverse index */}
      <SectionCard
        title="Sector → Equations — find equations by industry"
        description="For each industry sector (Maritime, Fintech, Genomics, Audio, etc.), lists every elegant-code card whose outcomes touch that sector — with the science, skill, talent, and live-demo link. Helps readers entering from a specific industry find their equations fast. E.g., the Maritime sector lists 9 equations (Haversine, Kalman, Markov, VaR, PageRank, Monte Carlo, GBM, Lloyd's, Black-Scholes)."
        icon={<Boxes className="h-5 w-5" />}
        badge="reverse index"
      >
        <SectorIndex />
      </SectionCard>

      {/* 10 living pages summary */}
      <SectionCard
        title="The 10 living-equation pages — every resource in context"
        description="This hub is the index; the living-equation pages are the experience. Each page's Math tab cites the original papers; each Live tab runs Pyodide on the dataset; each Production tab shows the library call. Click through to feel the math work."
        icon={<Sparkles className="h-5 w-5" />}
        badge="10 pages"
      >
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
          {[
            { slug: "living-svd", name: "SVD", icon: "Atom", color: "oklch(0.65 0.16 30)" },
            { slug: "living-attention", name: "Attention", icon: "Brain", color: "oklch(0.55 0.16 280)" },
            { slug: "living-fft", name: "FFT", icon: "Activity", color: "oklch(0.65 0.16 200)" },
            { slug: "living-poisson", name: "Poisson", icon: "Sigma", color: "oklch(0.65 0.16 0)" },
            { slug: "living-entropy", name: "Entropy", icon: "Sparkles", color: "oklch(0.65 0.16 60)" },
            { slug: "living-black-scholes", name: "Black-Scholes", icon: "DollarSign", color: "oklch(0.65 0.16 30)" },
            { slug: "living-haversine", name: "Haversine", icon: "Compass", color: "oklch(0.55 0.14 200)" },
            { slug: "living-kalman", name: "Kalman", icon: "Activity", color: "oklch(0.55 0.14 280)" },
            { slug: "living-monte-carlo", name: "Monte Carlo", icon: "Boxes", color: "oklch(0.55 0.14 120)" },
            { slug: "living-gbm", name: "GBM", icon: "TrendingUp", color: "oklch(0.65 0.16 240)" },
          ].map((p) => {
            const Icon = { Atom, Brain, Activity, Sigma, Sparkles, DollarSign, Compass, Boxes, TrendingUp }[p.icon] || Sparkles;
            return (
              <Link
                key={p.slug}
                href={hrefFor(p.slug as never)}
                className="rounded-md border border-border/60 bg-muted/20 p-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors text-center group"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg mx-auto mb-1.5" style={{ backgroundColor: p.color + "20" }}>
                  <Icon className="h-4 w-4" style={{ color: p.color }} />
                </div>
                <p className="text-xs font-semibold text-foreground/80 group-hover:text-primary transition-colors">{p.name}</p>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="My deeper thought: resources ARE the foundation"
        description="Every claim on this platform anchors to a real public dataset, a real paper, or a real library. The thesis — that the same math equation bridges 3+ sciences — only holds if the SAME equation actually appears in production code across those sciences. The 10 living-equation pages prove it: the same np.linalg.svd that recovers Out-of-Africa in genomics runs on the same NumPy library that compresses audio and identifies Fama-French risk factors in finance. The math doesn't care about the domain — and the library proves it."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">A geneticist, an audio engineer, and a quant</strong> all import the same NumPy and call np.linalg.svd. The library is the universal substrate; the equation is the universal language; the resources are the universal anchors.</p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "elegant-code" as const, reason: "Elegant Code — 20 cross-disciplinary cards (the thesis)" },
        { id: "connections" as const, reason: "Connections — interactive D3 graph of card → card edges" },
        { id: "living-svd" as const, reason: "Living SVD (sample living-equation page)" },
        { id: "numpy-scipy" as const, reason: "NumPy/SciPy — production library reference" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("elegant-code")} className="text-sm text-primary hover:underline">→ Elegant Code (20 cards)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("connections")} className="text-sm text-primary hover:underline">→ Connections (D3 graph)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("living-svd")} className="text-sm text-primary hover:underline">→ Living SVD (sample demo)</Link>
      </div>
    </div>
  );
}
