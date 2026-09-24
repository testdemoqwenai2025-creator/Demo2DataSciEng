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
  | "spatial-transcriptomics"
  | "singlecell-multiomics"
  | "alphamissense"
  | "alphaproteo"
  | "boltz"
  | "ai-drug-discovery"
  | "spatial-multiomics"
  | "coevolution-dca"
  | "neural-network-potentials"
  | "enhanced-sampling"
  | "generative-chemistry-2"
  | "quantum-computing"
  | "space-science"
  | "fintech"
  | "data-lakehouse"
  | "iceberg"
  | "glue"
  | "hudi"
  | "delta-lake"
  | "catalogs";

export interface PageMeta {
  id: PageId;
  label: string;
  shortLabel: string;
  group: "Overview" | "Ingestion" | "Storage & Compute" | "Transformation" | "Analytics" | "Governance" | "Delivery" | "About" | "Knowledge Loop" | "Modern Big Data" | "Databases" | "Streaming" | "Columnar" | "Patterns" | "Data Mesh" | "DataFrames" | "Machine Learning" | "Deep Learning" | "MLOps" | "GenAI" | "Reinforcement Learning" | "LLM Training" | "Transformer" | "Computational Science" | "Generative AI" | "Computer Vision" | "Diffusion Models" | "Distributed Training" | "MLOps & Tracing" | "Quantization & Inference" | "Inference Serving" | "RAG Deep Dive" | "Multi-modal RAG" | "Bioinformatics" | "Cheminformatics" | "Molecular Modelling" | "Genetic Materials" | "Macro Structures" | "Systems Biology" | "Cryo-EM" | "Spatial Transcriptomics" | "Single-cell Multi-omics" | "AlphaMissense" | "AlphaProteo" | "Boltz" | "AI Drug Discovery" | "Spatial Multi-omics" | "Coevolution & DCA" | "Neural Network Potentials" | "Enhanced Sampling" | "Generative Chemistry 2.0" | "Quantum Computing" | "Space Science" | "Fintech" | "Data Lakehouse" | "Apache Iceberg" | "AWS Glue" | "Apache Hudi" | "Delta Lake" | "Catalogs";
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
  {
    id: "singlecell-multiomics",
    label: "Single-cell Multi-omics — scVI, WNN, RNA velocity, Harmony",
    shortLabel: "Single-cell",
    group: "Single-cell Multi-omics",
    icon: "Atom",
    description: "AI-generated illustrations + RNA velocity short, 10x GEM Poisson + UMI, scVI ZINB VAE, WNN multi-modal integration, RNA velocity kinetic ODE, Harmony batch correction, low-level PyTorch scVI+WNN+RNAVelocitySolver+Harmony.",
  },
  {
    id: "alphamissense",
    label: "AlphaMissense — 71M Variant Pathogenicity Prediction",
    shortLabel: "AlphaMissense",
    group: "AlphaMissense",
    icon: "Dna",
    description: "AI-generated illustrations + variant scoring short, AlphaFold2 backbone + variant-aware head, ACMG classification thresholds (≥0.564 likely pathogenic), ClinVar+gnomAD calibration, 94% accuracy, low-level PyTorch ProteinEncoder+VariantEmbedder+AlphaMissenseHead+AlphaMissense.",
  },
  {
    id: "alphaproteo",
    label: "AlphaProteo — De Novo Protein Design via RFdiffusion",
    shortLabel: "AlphaProteo",
    group: "AlphaProteo",
    icon: "Sparkles",
    description: "AI-generated illustrations + binder design short, RFdiffusion DDPM on 3D backbones + ProteinMPNN inverse folding + AlphaFold2 self-consistency, AlphaProteo 60-90% wet-lab success, low-level PyTorch SE3EquivariantDenoiseLayer+RFdiffusion+ProteinMPNN+AlphaFold2SelfConsistency.",
  },
  {
    id: "boltz",
    label: "Boltz-1/2 — Open-Source AlphaFold3 Alternative",
    shortLabel: "Boltz",
    group: "Boltz",
    icon: "Boxes",
    description: "AI-generated illustrations + multi-chain diffusion short, open AlphaFold3 architecture (MSA+pair+diffusion+SE(3)), PoseBusters 70-80%, MIT licence, Boltz-2 multi-state, low-level PyTorch AtomTypeEmbedding+MSAEncoder+BoltzStructureModule+IPALayer+ConfidenceHead+Boltz1.",
  },
  {
    id: "ai-drug-discovery",
    label: "AI-Driven Drug Discovery — Insilico Medicine + Recursion Paradigm",
    shortLabel: "AI Drug Discovery",
    group: "AI Drug Discovery",
    icon: "FlaskConical",
    description: "AI-generated illustrations + generative chemistry short, Insilico Chemistry42 VAE + Recursion phenomics + ADMET multi-task regression + clinical pipeline (ISM042-2-048 Phase II), low-level PyTorch MoleculeVAE+PhenomicsEncoder+ADMETPredictor+AIDrugDiscoveryPipeline.",
  },
  {
    id: "spatial-multiomics",
    label: "Spatial Multi-omics — DBiT-seq, spatial-CUT&Tag, Cross-attention STAGATE",
    shortLabel: "Spatial Multi-omics",
    group: "Spatial Multi-omics",
    icon: "Grid",
    description: "AI-generated illustrations + multi-modal spatial short, DBiT-seq microfluidic barcoding + spatial-CUT&Tag histone marks + Spatial ATAC-RNA + MultiModalSTAGATE cross-attention + SpatialWNN, low-level PyTorch MultiModalGraphConvolution+MultiModalSTAGATE+SpatialWNN.",
  },
  {
    id: "coevolution-dca",
    label: "Co-evolution & DCA — From Mutual Information to AlphaFold",
    shortLabel: "Co-evolution & DCA",
    group: "Coevolution & DCA",
    icon: "Network",
    description: "AI-generated illustrations + co-evolution short, mutual information I(i,j) + Potts model + mean-field DCA J=-(C^-1) + APC correction + attention QK^T≈J equivalence, low-level PyTorch MSAParser+FrequencyLayer+MutualInformationLayer+MeanFieldDCA+ContactPredictor+AttentionAsDCA.",
  },
  {
    id: "neural-network-potentials",
    label: "Neural Network Potentials — SchNet to MACE via SO(3) Representation Theory",
    shortLabel: "NN Potentials",
    group: "Neural Network Potentials",
    icon: "Atom",
    description: "AI illustrations + CG tensor product short, SchNet→DimeNet→GemNet→NequIP→MACE, SO(3) irreps + spherical harmonics + Clebsch-Gordan coefficients, body-order expansion, low-level PyTorch real_spherical_harmonics+CGTensorProduct+SchNetInteraction+NequIPLayer+MACEModel.",
  },
  {
    id: "enhanced-sampling",
    label: "Enhanced Sampling & Free Energy — Metadynamics, REMD, MSMs, Neural ODEs",
    shortLabel: "Enhanced Sampling",
    group: "Enhanced Sampling",
    icon: "Waves",
    description: "AI illustrations + free energy short, metadynamics V(s,t)=Σ W exp(-|s-s'|²/2σ²) + REMD P=min(1,exp(ΔβΔE)) + MSMs T_ij(τ) τ_k=-τ/log(λ_k) + TICA C(τ) + Neural ODEs, low-level PyTorch NeuralODE+MetadynamicsSimulator+MSMEstimator+TICA.",
  },
  {
    id: "generative-chemistry-2",
    label: "Generative Chemistry 2.0 — EDM, DiffDock, GFlowNet, Optimal Transport",
    shortLabel: "Gen Chem 2.0",
    group: "Generative Chemistry 2.0",
    icon: "FlaskConical",
    description: "AI illustrations + Sinkhorn short, EDM SE(3)-equivariant DDPM on R^(N×3) + DiffDock diffusion on SE(3) + GFlowNet trajectory balance + Sinkhorn optimal transport W_ε=min⟨T,C⟩+εH(T), low-level PyTorch SinkhornDistance+EDMDenoiser+GFlowNet.",
  },
  {
    id: "quantum-computing",
    label: "Quantum Computing — VQE, QAOA, Grover, Quantum ML",
    shortLabel: "Quantum",
    group: "Quantum Computing",
    icon: "Atom",
    description: "AI illustrations + circuit short, qubit superposition + Hadamard/CNOT/Pauli gates + Bell states + VQE variational principle + Grover O(√N) + QFT, low-level PyTorch QuantumGate+QuantumCircuit+VQE+GroverCircuit.",
  },
  {
    id: "space-science",
    label: "Space Science — Exoplanets, Gravitational Waves, LHC/CERN, JWST",
    shortLabel: "Space Science",
    group: "Space Science",
    icon: "Network",
    description: "AI illustrations + transit short, Kepler laws + transit method + GW strain + LHC jet substructure + JWST, low-level PyTorch TransitCNN+GravitationalWaveClassifier+JetGNN.",
  },
  {
    id: "fintech",
    label: "Fintech — Black-Scholes, Monte Carlo, VaR, Algorithmic Trading",
    shortLabel: "Fintech",
    group: "Fintech",
    icon: "Activity",
    description: "AI illustrations + pricing short, Black-Scholes formula + Ito lemma + Monte Carlo + VaR/CVaR + LSTM trading + GNN fraud, low-level PyTorch BlackScholesModel+MonteCarloPricer+LSTMPredictor+FraudGNN.",
  },
  {
    id: "data-lakehouse",
    label: "Data Lakehouse — Lake + Warehouse Unified",
    shortLabel: "Lakehouse",
    group: "Data Lakehouse",
    icon: "Boxes",
    description: "The lake→lakehouse evolution: Hadoop → S3+Hive → Iceberg/Delta/Hudi. Vendor-neutral open table formats giving ACID + SQL to cheap object storage. Anchor page for the Data Lakehouse group.",
  },
  {
    id: "iceberg",
    label: "Apache Iceberg — Open Table Format",
    shortLabel: "Iceberg",
    group: "Apache Iceberg",
    icon: "Layers",
    description: "Netflix-origin open table format with manifest trees, hidden partitioning, time travel, schema evolution. Production at Netflix, Apple, Stripe. SQL+PyIceberg+Trino code, manifest tree diagram, NYC Taxi on Iceberg Pyodide demo.",
  },
  {
    id: "glue",
    label: "AWS Glue — Serverless ETL + Data Catalog",
    shortLabel: "Glue",
    group: "AWS Glue",
    icon: "Workflow",
    description: "Serverless Spark ETL, Data Catalog, Crawlers, Glue Studio, Schema Registry. The most-used data-lake catalog on AWS. Code: Glue PySpark jobs, crawler configs, cross-account catalog access.",
  },
  {
    id: "hudi",
    label: "Apache Hudi — Incremental/UPSERT Tables",
    shortLabel: "Hudi",
    group: "Apache Hudi",
    icon: "Database",
    description: "Uber-origin open table format for incremental/UPSERT workloads. COW vs MOR table types, CDC ingestion, change-logs. Production at Uber, Walmart, ByteDance. Distinct from Iceberg/Delta because of upsert-first design.",
  },
  {
    id: "delta-lake",
    label: "Delta Lake — Databricks Open Format",
    shortLabel: "Delta",
    group: "Delta Lake",
    icon: "Boxes",
    description: "Most widely-deployed open table format. ACID transactions, time travel, Change Data Feed, Z-Order, Liquid Clustering. Production on every Databricks deployment. Transaction-log replay Pyodide demo.",
  },
  {
    id: "catalogs",
    label: "Catalogs — Glue vs Hive vs Nessie vs Unity vs Polaris vs REST",
    shortLabel: "Catalogs",
    group: "Catalogs",
    icon: "Network",
    description: "Comparison of metadata/catalog systems: AWS Glue Data Catalog, Hive Metastore, Nessie (Git-for-data), Databricks Unity Catalog, Snowflake Polaris, Iceberg REST Catalog. The metadata-layer battle.",
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
