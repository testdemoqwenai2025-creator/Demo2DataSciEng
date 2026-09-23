/**
 * Real-route router for the ModernDataSciEng Platform.
 *
 * Each page is a real Next.js route: /snowflake, /databricks, etc.
 * Hash anchors (e.g. /#knowledge-loop) are reserved for in-page
 * section scrolling on the home page only.
 */

export type PageId =
  | "home"
  | "architecture"
  | "snowflake"
  | "dbt"
  | "databricks"
  | "tableau"
  | "fivetran-hightouch"
  | "orchestration"
  | "governance"
  | "cicd"
  | "about"
  | "knowledge"
  | "dashboard"
  | "evolution"
  | "research"
  | "modern-big-data"
  | "duckdb"
  | "streaming"
  | "arrow"
  | "patterns"
  | "data-mesh"
  | "polars"
  | "ml-platform"
  | "neural-networks"
  | "feature-store"
  | "model-registry"
  | "model-monitoring"
  | "rag-llms"
  | "vector-db"
  | "rl-agentic"
  | "fine-tuning"
  | "transformer"
  | "comp-sci-materials"
  | "gen-ai-patterns"
  | "computer-vision"
  | "diffusion-models"
  | "distributed-training"
  | "mlops-tracing"
  | "quantization-inference"
  | "inference-serving"
  | "rag-deep-dive"
  | "multimodal-rag"
  | "bioinformatics"
  | "cheminformatics"
  | "molecular-modelling"
  | "genetic-materials"
  | "macro-structures"
  | "systems-biology"
  | "cryo-em"
  | "spatial-transcriptomics";

export interface PageMeta {
  id: PageId;
  label: string;
  shortLabel: string;
  group: "Overview" | "Ingestion" | "Storage & Compute" | "Transformation" | "Analytics" | "Governance" | "Delivery" | "About" | "Knowledge Loop" | "Modern Big Data" | "Databases" | "Streaming" | "Columnar" | "Patterns" | "Data Mesh" | "DataFrames" | "Machine Learning" | "Deep Learning" | "MLOps" | "GenAI" | "Reinforcement Learning" | "LLM Training" | "Transformer" | "Computational Science" | "Generative AI" | "Computer Vision" | "Diffusion Models" | "Distributed Training" | "MLOps & Tracing" | "Quantization & Inference" | "Inference Serving" | "RAG Deep Dive" | "Multi-modal RAG" | "Bioinformatics" | "Cheminformatics" | "Molecular Modelling" | "Genetic Materials" | "Macro Structures" | "Systems Biology" | "Cryo-EM" | "Spatial Transcriptomics";
  icon: string;
  description: string;
}

export const PAGES: PageMeta[] = [
  {
    id: "home",
    label: "Platform Overview",
    shortLabel: "Overview",
    group: "Overview",
    icon: "LayoutDashboard",
    description: "Single source of truth across the ModernDataSciEng business — value, KPIs and end-to-end picture.",
  },
  {
    id: "architecture",
    label: "Reference Architecture",
    shortLabel: "Architecture",
    group: "Overview",
    icon: "Network",
    description: "End-to-end modern data platform spanning ingestion, lakehouse, warehouse, semantic layer and consumption.",
  },
  {
    id: "fivetran-hightouch",
    label: "Fivetran & Hightouch",
    shortLabel: "ELT + rETL",
    group: "Ingestion",
    icon: "ArrowLeftRight",
    description: "Managed ELT ingestion from 14 source systems and reverse-ETL activation back into business tools.",
  },
  {
    id: "databricks",
    label: "Databricks Lakehouse",
    shortLabel: "Databricks",
    group: "Storage & Compute",
    icon: "Boxes",
    description: "Spark, PySpark, Delta Lake and the Bronze-Silver-Gold medallion architecture powering analytics at scale.",
  },
  {
    id: "snowflake",
    label: "Snowflake & SQL",
    shortLabel: "Snowflake",
    group: "Storage & Compute",
    icon: "Database",
    description: "Snowflake serving layer with multi-cluster compute, RBAC and governed SQL for analytics & BI.",
  },
  {
    id: "dbt",
    label: "dbt & Dimensional Modelling",
    shortLabel: "dbt",
    group: "Transformation",
    icon: "GitBranch",
    description: "Modular dbt project, dimensional marts, SCD2 history, tests, docs and the semantic layer.",
  },
  {
    id: "orchestration",
    label: "Airflow & Dagster",
    shortLabel: "Orchestration",
    group: "Delivery",
    icon: "Workflow",
    description: "DAG-driven orchestration across Bronze-Silver-Gold with idempotent retries and SLA monitoring.",
  },
  {
    id: "tableau",
    label: "Tableau & Analytics",
    shortLabel: "Tableau",
    group: "Analytics",
    icon: "BarChart3",
    description: "Self-service analytics on top of governed datasets, dashboards, semantic layer and row-level security.",
  },
  {
    id: "governance",
    label: "Data Governance & Observability",
    shortLabel: "Governance",
    group: "Governance",
    icon: "ShieldCheck",
    description: "Unity Catalogue, data quality, lineage, observability and security controls across the platform.",
  },
  {
    id: "cicd",
    label: "Git, CI/CD & DevOps",
    shortLabel: "CI/CD",
    group: "Delivery",
    icon: "GitMerge",
    description: "Trunk-based Git flow, GitHub Actions pipelines, environment promotion and infrastructure as code.",
  },
  {
    id: "about",
    label: "About & Compliance",
    shortLabel: "About",
    group: "About",
    icon: "Info",
    description: "Mission, synthetic-data disclaimer, GDPR compliance, contact and repository links.",
  },
  {
    id: "knowledge",
    label: "Knowledge Hub",
    shortLabel: "Knowledge",
    group: "Knowledge Loop",
    icon: "BookOpen",
    description: "Architecture Decision Records, pattern library, trade-off matrices — the why behind every choice.",
  },
  {
    id: "dashboard",
    label: "Live Dashboard",
    shortLabel: "Dashboard",
    group: "Knowledge Loop",
    icon: "Activity",
    description: "Synthetic real-time pipeline observatory — runs, cost, anomalies, what-if simulator.",
  },
  {
    id: "evolution",
    label: "Evolution Timeline",
    shortLabel: "Evolution",
    group: "Knowledge Loop",
    icon: "GitCompare",
    description: "Versioned history of the platform — decisions made, lessons learned, future roadmap.",
  },
  {
    id: "research",
    label: "Research Papers",
    shortLabel: "Research",
    group: "Knowledge Loop",
    icon: "GraduationCap",
    description: "Academic foundations — papers that inspired each component, with citation graph.",
  },
  {
    id: "modern-big-data",
    label: "Modern Big Data Stack",
    shortLabel: "Big Data",
    group: "Modern Big Data",
    icon: "Database",
    description: "BigQuery, DuckDB, Spark Streaming, Flink, Kafka, Pulsar, Iceberg — the modern open + serverless stack with code + free tiers.",
  },
  {
    id: "duckdb",
    label: "DuckDB — Laptop-scale Big Data",
    shortLabel: "DuckDB",
    group: "Databases",
    icon: "Database",
    description: "In-process OLAP that runs anywhere — just open a Parquet file. Arrow-native, OSS, 10× faster than Postgres on a single node.",
  },
  {
    id: "streaming",
    label: "Real-Time Streaming",
    shortLabel: "Streaming",
    group: "Streaming",
    icon: "Radio",
    description: "Kafka, Pulsar, Flink, Spark Streaming — the Lambda→Kappa evolution from dual-pipeline to unified streaming.",
  },
  {
    id: "arrow",
    label: "Apache Arrow — Columnar Lingua Franca",
    shortLabel: "Arrow",
    group: "Columnar",
    icon: "Boxes",
    description: "The zero-copy columnar format that makes DuckDB, Polars, Pandas, Spark, Flink interchangeable. Arrow Flight for transfer, C Data Interface for UDFs.",
  },
  {
    id: "patterns",
    label: "Data Engineering Patterns — Interactive Guides",
    shortLabel: "Patterns",
    group: "Patterns",
    icon: "Boxes",
    description: "Medallion, SCD2, slim CI, session RLS, reverse-ETL — 5 core patterns with Pyodide executable demos.",
  },
  {
    id: "data-mesh",
    label: "Data Mesh — Domain-Oriented Data Products",
    shortLabel: "Data Mesh",
    group: "Data Mesh",
    icon: "Network",
    description: "Domain-oriented data ownership, data as a product, federated governance, self-serve platform infrastructure.",
  },
  {
    id: "polars",
    label: "Polars vs DuckDB vs Pandas — The Great DataFrame Shootout",
    shortLabel: "Polars vs DuckDB",
    group: "DataFrames",
    icon: "Boxes",
    description: "Three DataFrame libraries benchmarked in your browser. Arrow-native, lazy evaluation, 10-30× speed differences — with Pyodide timing demos.",
  },
  {
    id: "ml-platform",
    label: "Machine Learning Platform — MLOps Lifecycle",
    shortLabel: "ML Platform",
    group: "Machine Learning",
    icon: "Cpu",
    description: "MLflow tracking + model registry + feature stores + inference patterns. Multi-language training code + Pyodide in-browser model training demo.",
  },
  {
    id: "neural-networks",
    label: "Neural Networks — From Big Data to LLMs",
    shortLabel: "Neural Nets",
    group: "Deep Learning",
    icon: "Brain",
    description: "Animated neural network diagrams, activation function equations, backpropagation math, Pyodide forward-pass demo, and the evolution from Hadoop to today's LLMs.",
  },
  {
    id: "feature-store",
    label: "Feature Store — Train/Serve Consistency",
    shortLabel: "Feature Store",
    group: "MLOps",
    icon: "Database",
    description: "Online + offline feature serving, point-in-time correctness, Feast vs Databricks, train/serve skew prevention.",
  },
  {
    id: "model-registry",
    label: "Model Registry — Versioning + Stages",
    shortLabel: "Model Registry",
    group: "MLOps",
    icon: "GitBranch",
    description: "MLflow Model Registry: versioning, stages (None→Staging→Production→Archived), A/B testing, rollback patterns.",
  },
  {
    id: "model-monitoring",
    label: "Model Monitoring — Drift Detection",
    shortLabel: "Monitoring",
    group: "MLOps",
    icon: "Activity",
    description: "Data drift, concept drift, prediction drift. Evidently, NannyML, retraining triggers, monitoring dashboards.",
  },
  {
    id: "rag-llms",
    label: "RAG & LLMs — Gold Tables as Knowledge Base",
    shortLabel: "RAG & LLMs",
    group: "GenAI",
    icon: "Sparkles",
    description: "Vector databases, embeddings, semantic search, how the platform's Gold tables become an LLM knowledge base via RAG.",
  },
  {
    id: "vector-db",
    label: "Vector Databases — pgvector vs Pinecone vs Weaviate",
    shortLabel: "Vector DBs",
    group: "GenAI",
    icon: "Database",
    description: "pgvector (ADR-022), Pinecone, Weaviate, Qdrant, Chroma — compared with Pyodide vector operations demo.",
  },
  {
    id: "rl-agentic",
    label: "Reinforcement Learning & Agentic AI — ISR + 3D Animations",
    shortLabel: "RL & Agents",
    group: "Reinforcement Learning",
    icon: "Brain",
    description: "Animated RL diagrams, agent-environment loop, Q-learning, policy gradients, ISR (self-refinement), the next stage of agentic workflows.",
  },
  {
    id: "fine-tuning",
    label: "LLM Fine-Tuning — LoRA, QLoRA, RLHF, DPO",
    shortLabel: "Fine-Tuning",
    group: "LLM Training",
    icon: "Cpu",
    description: "Low-rank adaptation math, QLoRA 4-bit quantisation, RLHF vs DPO alignment, Pyodide demo, low-level PyTorch code, Gold tables as training data.",
  },
  {
    id: "transformer",
    label: "Transformer Architecture Deep Dive",
    shortLabel: "Transformer",
    group: "Transformer",
    icon: "Network",
    description: "Animated self-attention mechanism, positional encoding visualisation, multi-head attention diagram, Pyodide attention demo, low-level PyTorch code.",
  },
  {
    id: "comp-sci-materials",
    label: "Computational Science & Materials for AI",
    shortLabel: "Comp Sci & Materials",
    group: "Computational Science",
    icon: "Cpu",
    description: "Silicon chemistry to GPU architecture to LLM training. Matrix multiply math, DFT analogy, roofline model, Pyodide matmul benchmark. The physical foundations of AI.",
  },
  {
    id: "gen-ai-patterns",
    label: "Generative AI Patterns — Autoregressive Decoding & Sampling",
    shortLabel: "Gen AI Patterns",
    group: "Generative AI",
    icon: "Sparkles",
    description: "BPE tokeniser math, temperature/top-k/top-p sampling, entropy & perplexity, autoregressive decoding, Pyodide text generation demo. Code-oriented, mathematical.",
  },
  {
    id: "computer-vision",
    label: "Computer Vision — Convolutional Networks to Vision Transformers",
    shortLabel: "Computer Vision",
    group: "Computer Vision",
    icon: "Image",
    description: "Animated convolution kernel, 2D convolution math, max pooling, convolutional backpropagation, ViT patch embedding, low-level PyTorch Conv2d/LeNet/VisionTransformer/HybridViT. From LeNet to ViT-22B.",
  },
  {
    id: "diffusion-models",
    label: "Diffusion Models — DDPM, DDIM, Score Matching, SDEs",
    shortLabel: "Diffusion Models",
    group: "Diffusion Models",
    icon: "Waves",
    description: "Forward/reverse diffusion math, U-Net with time embedding, DDPM trainer, DDIM sampler, classifier-free guidance, Langevin dynamics, low-level PyTorch. From thermodynamics to image generation.",
  },
  {
    id: "distributed-training",
    label: "Distributed Training — DDP, FSDP, ZeRO, Ring AllReduce",
    shortLabel: "Distributed Training",
    group: "Distributed Training",
    icon: "Network",
    description: "Ring AllReduce animation, ZeRO sharding progression, memory breakdown (params+grads+optim+activations), BF16 mixed precision, activation checkpointing, low-level PyTorch FSDP.",
  },
  {
    id: "mlops-tracing",
    label: "MLOps & Tracing — OpenTelemetry, Spans, Critical Path, SLOs",
    shortLabel: "MLOps & Tracing",
    group: "MLOps & Tracing",
    icon: "Activity",
    description: "Trace DAG animation, OTLP wire format, Kahn topo sort + DP critical path, SLO math (p99, burn rate, error budget), low-level PyTorch+OpenTelemetry code.",
  },
  {
    id: "quantization-inference",
    label: "Quantization & Inference — NF4, GPTQ, AWQ, llama.cpp GGUF",
    shortLabel: "Quantization",
    group: "Quantization & Inference",
    icon: "Gauge",
    description: "3D quantisation grid animation, NF4/GPTQ/AWQ math, group quantisation, AWQ channel scaling, low-level PyTorch NF4+AWQLinear+Q4_K_M, llama.cpp GGUF.",
  },
  {
    id: "inference-serving",
    label: "Inference Serving — vLLM, PagedAttention, Continuous Batching",
    shortLabel: "Inference Serving",
    group: "Inference Serving",
    icon: "Server",
    description: "3D PagedAttention animation, KV cache math, continuous batching, AWQ Marlin kernel, low-level PyTorch KVCache+PagedKVCache+ContinuousBatchingScheduler+vLLM server.",
  },
  {
    id: "rag-deep-dive",
    label: "RAG Deep Dive — Hybrid Retrieval, BM25, Cross-encoder Re-rank",
    shortLabel: "RAG Deep Dive",
    group: "RAG Deep Dive",
    icon: "Search",
    description: "3D hybrid retrieval pipeline animation, chunking math, BM25 + RRF fusion, cross-encoder re-rank, low-level PyTorch TextSplitter+BM25+RRF+CrossEncoder+HybridRAGRetriever.",
  },
  {
    id: "multimodal-rag",
    label: "Multi-modal RAG — CLIP, SigLIP, Cross-modal pgvector",
    shortLabel: "Multi-modal RAG",
    group: "Multi-modal RAG",
    icon: "Sparkles",
    description: "3D shared embedding space animation, CLIP/SigLIP contrastive loss, cross-modal retrieval, low-level PyTorch SigLIPModel+MultiModalRAGRetriever+MultiModalLLM.",
  },
  {
    id: "bioinformatics",
    label: "Bioinformatics — Sequence Alignment, ESM-2, AlphaFold2",
    shortLabel: "Bioinformatics",
    group: "Bioinformatics",
    icon: "Dna",
    description: "3D DNA helix + alignment animation, Needleman-Wunsch/Smith-Waterman DP, BWA-MEM/BLAST, ESM-2 + AlphaFold2 papers, low-level PyTorch ESM2Tokenizer+ESM2Model+RoPE+StructureModule+IPA.",
  },
  {
    id: "cheminformatics",
    label: "Cheminformatics — ECFP, Tanimoto, ChemBERTa, Molecular RAG",
    shortLabel: "Cheminformatics",
    group: "Cheminformatics",
    icon: "Atom",
    description: "3D molecule + ECFP fingerprint animation, ECFP4/Tanimoto math, ChemBERTa/Uni-Mol papers, virtual screening pipeline, low-level PyTorch ECFPFingerprinter+SmilesTokenizer+ChemBERTa+MolecularRAGRetriever.",
  },
  {
    id: "molecular-modelling",
    label: "Molecular Modelling — Force Fields, Verlet, E(n)-Equivariant NN, AlphaFold3",
    shortLabel: "Molecular Modelling",
    group: "Molecular Modelling",
    icon: "Atom",
    description: "3D molecular dynamics animation, AMBER force field math, Verlet integration, E(n)-equivariant GNN, AlphaFold3 diffusion, low-level PyTorch AMBERForceField+verlet_integrate+EquivariantGraphConvolutionLayer+AlphaFold3DiffusionModule.",
  },
  {
    id: "genetic-materials",
    label: "Genetic Materials — DNA, RNA, CRISPR, GWAS at HPC Scale",
    shortLabel: "Genetic Materials",
    group: "Genetic Materials",
    icon: "Dna",
    description: "AI-generated scientific illustrations + CRISPR editing short, HMM Viterbi gene finding, BLOSUM log-odds, GWAS logistic regression, ENCODE/GTEx/UK Biobank papers, 100K-genome Spark pipeline, low-level PyTorch HMM+CRISPRGuideDesigner+GWAS.",
  },
  {
    id: "macro-structures",
    label: "Macro Structures — Protein, Enzyme, Glycan, Lipid Hierarchy",
    shortLabel: "Macro Structures",
    group: "Macro Structures",
    icon: "Boxes",
    description: "AI-generated illustrations + Ramachandran short, 4-level protein hierarchy, Michaelis-Menten/Hill enzyme kinetics, glycomics WURCS, lipidomics LIPID MAPS, AlphaFold DB 200M, low-level PyTorch SecondaryStructurePredictor+RamachandranValidator+EnzymeKinetics+GlycanGraph+LipidFingerprinter.",
  },
  {
    id: "systems-biology",
    label: "Systems Biology — FBA, PPI, Multi-omics, Whole-cell",
    shortLabel: "Systems Biology",
    group: "Systems Biology",
    icon: "Network",
    description: "AI-generated illustrations + metabolic flux short, FBA LP on stoichiometric matrix, PPI networks PageRank + GNN, MOFA+ multi-omics factor analysis, Karr 2012 whole-cell, low-level PyTorch FBASolver+PPINetwork+MultiOmicsFactorAnalysis+WholeCellModel.",
  },
  {
    id: "cryo-em",
    label: "Cryo-EM Image Processing — RELION, CryoSPARC, cryoDRGN",
    shortLabel: "Cryo-EM",
    group: "Cryo-EM",
    icon: "Atom",
    description: "AI-generated illustrations + projection-slice short, 2D FFT + CTF correction + Radon transform + FSC resolution, RELION/CryoSPARC/cryoDRGN papers, 24h HPC pipeline, low-level PyTorch fft2+CTFCorrection+CryoEM2DClassifier+CryoDRGN VAE.",
  },
  {
    id: "spatial-transcriptomics",
    label: "Spatial Transcriptomics — Visium, MERFISH, STAGATE, NicheNet",
    shortLabel: "Spatial Transcriptomics",
    group: "Spatial Transcriptomics",
    icon: "Grid",
    description: "AI-generated illustrations + combinatorial barcode short, MERFISH 4¹⁶ codebook + Hamming error correction, U-Net cell segmentation, STAGATE graph attention autoencoder, NicheNet ligand-receptor, low-level PyTorch MERFISHDecoder+UNet+STAGATE+NicheNet.",
  },
];

export function pageById(id: string): PageMeta {
  return PAGES.find((p) => p.id === id) ?? PAGES[0];
}

/** Real path for a page: home -> "/", others -> "/<id>" */
export function hrefFor(id: PageId): string {
  return id === "home" ? "/" : `/${id}`;
}

/** Map a pathname (from usePathname()) back to a PageId */
export function pathnameToPageId(pathname: string | null | undefined): PageId {
  if (!pathname || pathname === "/") return "home";
  // Strip leading slash + trailing slash
  const cleaned = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  const match = PAGES.find((p) => p.id === cleaned);
  return match ? (match.id as PageId) : "home";
}
