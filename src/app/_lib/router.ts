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
  | "catalogs"
  | "pinot"
  | "paimon"
  | "druid"
  | "impala"
  | "starrocks"
  | "kafka-connect"
  | "schema-registry"
  | "lineage"
  | "data-contracts"
  | "tabular"
  | "databricks-lakehouse"
  | "snowflake-polaris"
  | "aws-lake-formation"
  | "flink"
  | "kafka"
  | "pulsar"
  | "spark-streaming"
  | "bigquery"
  | "redshift"
  | "clickhouse"
  | "dbt-deep-dive"
  | "airflow"
  | "dagster"
  | "great-expectations"
  | "monte-carlo"
  | "elementary"
  | "mlflow-deep-dive"
  | "feature-store-deep-dive"
  | "vector-db-deep-dive"
  | "llmops"
  | "data-mesh-deep-dive"
  | "streaming-sql"
  | "data-contracts-deep-dive"
  | "privacy-enhancing-tech"
  | "numpy-scipy"
  | "dask-ray"
  | "gpu-computing"
  | "jupyter"
  | "transformer-deep-dive"
  | "diffusion-models-deep-dive"
  | "fine-tuning-deep-dive"
  | "agent-frameworks"
  | "computational-biology"
  | "computational-chemistry"
  | "computational-physics"
  | "bioinformatics-pipelines"
  | "elegant-code"
  | "connections"
  | "global-shipping";

export interface PageMeta {
  id: PageId;
  label: string;
  shortLabel: string;
  group: "Overview" | "Ingestion" | "Storage & Compute" | "Transformation" | "Analytics" | "Governance" | "Delivery" | "About" | "Knowledge Loop" | "Modern Big Data" | "Databases" | "Streaming" | "Columnar" | "Patterns" | "Data Mesh" | "DataFrames" | "Machine Learning" | "Deep Learning" | "MLOps" | "GenAI" | "Reinforcement Learning" | "LLM Training" | "Transformer" | "Computational Science" | "Generative AI" | "Computer Vision" | "Diffusion Models" | "Distributed Training" | "MLOps & Tracing" | "Quantization & Inference" | "Inference Serving" | "RAG Deep Dive" | "Multi-modal RAG" | "Bioinformatics" | "Cheminformatics" | "Molecular Modelling" | "Genetic Materials" | "Macro Structures" | "Systems Biology" | "Cryo-EM" | "Spatial Transcriptomics" | "Single-cell Multi-omics" | "AlphaMissense" | "AlphaProteo" | "Boltz" | "AI Drug Discovery" | "Spatial Multi-omics" | "Coevolution & DCA" | "Neural Network Potentials" | "Enhanced Sampling" | "Generative Chemistry 2.0" | "Quantum Computing" | "Space Science" | "Fintech" | "Data Lakehouse" | "Apache Iceberg" | "AWS Glue" | "Apache Hudi" | "Delta Lake" | "Catalogs" | "Apache Pinot" | "Apache Paimon" | "Apache Druid" | "Apache Impala" | "StarRocks" | "Kafka Connect" | "Schema Registry" | "Lineage" | "Data Contracts" | "Tabular" | "Databricks Lakehouse" | "Snowflake Polaris" | "AWS Lake Formation" | "Apache Flink" | "Apache Kafka" | "Apache Pulsar" | "Spark Streaming" | "Google BigQuery" | "AWS Redshift" | "ClickHouse" | "dbt Deep Dive" | "Apache Airflow" | "Dagster" | "Great Expectations" | "Monte Carlo" | "Elementary" | "MLflow Deep Dive" | "Feature Store Deep Dive" | "Vector DB Deep Dive" | "LLMOps" | "Data Mesh Deep Dive" | "Streaming SQL" | "Data Contracts Deep Dive" | "Privacy Enhancing Tech" | "NumPy SciPy" | "Dask Ray" | "GPU Computing" | "Jupyter" | "Transformer Deep Dive" | "Diffusion Models Deep Dive" | "Fine-Tuning Deep Dive" | "Agent Frameworks" | "Computational Biology" | "Computational Chemistry" | "Computational Physics" | "Bioinformatics Pipelines" | "Elegant Code";
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
  {
    id: "pinot",
    label: "Apache Pinot — Real-time OLAP",
    shortLabel: "Pinot",
    group: "Apache Pinot",
    icon: "Zap",
    description: "LinkedIn-origin real-time OLAP engine with star-tree index for sub-second analytics on billions of rows. 50B events/day at LinkedIn.",
  },
  {
    id: "paimon",
    label: "Apache Paimon — Streaming-native Table Format",
    shortLabel: "Paimon",
    group: "Apache Paimon",
    icon: "Database",
    description: "Flink-first streaming-native table format (2023) with changelog mode + partial-update merge. Treats tables as streams.",
  },
  {
    id: "druid",
    label: "Apache Druid — Time-series OLAP",
    shortLabel: "Druid",
    group: "Apache Druid",
    icon: "Activity",
    description: "Sub-second queries on event/time-series data at scale. Netflix, Airbnb, Alibaba use Druid for real-time analytics.",
  },
  {
    id: "impala",
    label: "Apache Impala — Hadoop MPP SQL",
    shortLabel: "Impala",
    group: "Apache Impala",
    icon: "Cpu",
    description: "Cloudera-origin MPP SQL engine (2012) for HDFS + Kudu. LLVM JIT codegen. Still relevant for on-prem Hadoop stacks.",
  },
  {
    id: "starrocks",
    label: "StarRocks — MySQL-compatible Lakehouse Query",
    shortLabel: "StarRocks",
    group: "StarRocks",
    icon: "Database",
    description: "MySQL-compatible lakehouse query engine (2021 fork of Doris). Vectorised SIMD execution, reads Iceberg/Delta/Hive directly. Fastest Trino alternative for BI.",
  },
  {
    id: "kafka-connect",
    label: "Kafka Connect + Debezium — CDC to Lakehouse",
    shortLabel: "Kafka Connect",
    group: "Kafka Connect",
    icon: "ArrowLeftRight",
    description: "Standard pipeline for operational data → lakehouse. Kafka Connect framework + Debezium log-based CDC. 200+ connectors, exactly-once via Kafka transactions.",
  },
  {
    id: "schema-registry",
    label: "Schema Registry — Avro/Protobuf/JSON Schema Evolution",
    shortLabel: "Schema Registry",
    group: "Schema Registry",
    icon: "ShieldCheck",
    description: "Confluent Schema Registry + Glue Schema Registry + Iceberg schema evolution. Backward/forward/full compatibility. The type system for the data pipeline.",
  },
  {
    id: "lineage",
    label: "Data Lineage — OpenLineage + Atlas + Spline",
    shortLabel: "Lineage",
    group: "Lineage",
    icon: "Network",
    description: "Track data flow from source to dashboard. OpenLineage standard, Apache Atlas, Spline, Unity Lineage. GDPR audit, impact analysis, root cause.",
  },
  {
    id: "data-contracts",
    label: "Data Contracts — Producer/Consumer Agreements",
    shortLabel: "Data Contracts",
    group: "Data Contracts",
    icon: "ShieldCheck",
    description: "Schema + SLA + ownership agreements between data producers and consumers. dbt tests + Great Expectations + Schema Registry. API gateway pattern for data.",
  },
  {
    id: "tabular",
    label: "Tabular — SaaS Iceberg Platform (Snowflake-acquired)",
    shortLabel: "Tabular",
    group: "Tabular",
    icon: "Boxes",
    description: "First SaaS Iceberg platform, founded by Iceberg spec authors (Ryan Blue, Daniel Weeks). Acquired by Snowflake 2024. Multi-cloud managed Iceberg.",
  },
  {
    id: "databricks-lakehouse",
    label: "Databricks Lakehouse — Production Deep Dive",
    shortLabel: "Databricks LH",
    group: "Databricks Lakehouse",
    icon: "Boxes",
    description: "Delta + Unity + MLflow + Databricks SQL + Photon end-to-end. Uber, Airbnb, JPMorgan production stack. The most deployed lakehouse platform.",
  },
  {
    id: "snowflake-polaris",
    label: "Snowflake Polaris — Open Lakehouse Counter-bet",
    shortLabel: "Snowflake Polaris",
    group: "Snowflake Polaris",
    icon: "Cloud",
    description: "Snowflake's Apache-licensed REST catalog (2024) + Iceberg open lakehouse. Strategic counter-bet to Databricks Unity. Tabular team now at Snowflake.",
  },
  {
    id: "aws-lake-formation",
    label: "AWS Lake Formation — Lakehouse Governance Deep Dive",
    shortLabel: "Lake Formation",
    group: "AWS Lake Formation",
    icon: "ShieldCheck",
    description: "Cell-level RLS, LF-tags governance, cross-account data sharing. The most production-deployed lakehouse governance on AWS. IAM for data.",
  },
  {
    id: "flink",
    label: "Apache Flink — Stream Processing at Scale",
    shortLabel: "Flink",
    group: "Apache Flink",
    icon: "Activity",
    description: "Flink deep dive: watermark, state backends, exactly-once, CEP, CDC ingestion. The streaming engine for Iceberg/Delta/Hudi writes. Scientific examples: real-time genomics, LHC trigger, sensor monitoring.",
  },
  {
    id: "kafka",
    label: "Apache Kafka — Distributed Event Streaming",
    shortLabel: "Kafka",
    group: "Apache Kafka",
    icon: "Radio",
    description: "Kafka architecture: partitions, consumer groups, transactions, KRaft. 7T msgs/day at LinkedIn. Scientific examples: genomics event streams, LHC DAQ, environmental sensor feeds.",
  },
  {
    id: "pulsar",
    label: "Apache Pulsar — Segmented Streaming + Geo-replication",
    shortLabel: "Pulsar",
    group: "Apache Pulsar",
    icon: "Radio",
    description: "Pulsar: segmented storage, geo-replication, functions. Yahoo-origin alternative to Kafka. Scientific examples: multi-region sensor networks, distributed genomics.",
  },
  {
    id: "spark-streaming",
    label: "Spark Structured Streaming — Micro-batch + Continuous",
    shortLabel: "Spark Streaming",
    group: "Spark Streaming",
    icon: "Activity",
    description: "Spark Structured Streaming: micro-batch vs continuous, watermarks, stateful ops. Scientific examples: batch+streaming genomics, IoT sensor windows, LHC online monitoring.",
  },

  {
    id: "bigquery",
    label: "Google BigQuery — Serverless Cloud Data Warehouse",
    shortLabel: "BigQuery",
    group: "Google BigQuery",
    icon: "Database",
    description: "BigQuery deep dive: columnar storage, BI Engine, partitioning, clustering, Materialized Views, BigLake (Iceberg on GCS). Scientific examples: genomics on BigQuery, climate data, NASA datasets.",
  },
  {
    id: "redshift",
    label: "AWS Redshift — Petabyte-scale Cloud Data Warehouse",
    shortLabel: "Redshift",
    group: "AWS Redshift",
    icon: "Database",
    description: "Redshift deep dive: columnar, sort keys, distribution styles, Spectrum, Serverless, RA3. Scientific examples: genomics on Redshift, NASA MODIS, climate analytics.",
  },
  {
    id: "clickhouse",
    label: "ClickHouse — Columnar OLAP at Extreme Scale",
    shortLabel: "ClickHouse",
    group: "ClickHouse",
    icon: "Zap",
    description: "ClickHouse: MergeTree engine, materialised views, real-time ingestion, vectorised execution. Yandex origin. Scientific examples: genomics variant queries, IoT telemetry, time-series analytics.",
  },
  {
    id: "dbt-deep-dive",
    label: "dbt — Analytics Engineering Deep Dive",
    shortLabel: "dbt",
    group: "dbt Deep Dive",
    icon: "Layers",
    description: "dbt deep dive: models, tests, macros, materializations, Semantic Layer, dbt Cloud. Scientific examples: genomics transform models, clinical trial QA, sensor data contracts.",
  },
  {
    id: "airflow",
    label: "Apache Airflow — Data Pipeline Orchestration",
    shortLabel: "Airflow",
    group: "Apache Airflow",
    icon: "Workflow",
    description: "Airflow deep dive: DAGs, operators, sensors, XCom, smart sensors, TaskFlow API. Airbnb origin. Scientific examples: genomics pipeline DAGs, LHC analysis workflows, sensor ETL.",
  },
  {
    id: "dagster",
    label: "Dagster — Asset-Oriented Data Orchestration",
    shortLabel: "Dagster",
    group: "Dagster",
    icon: "Workflow",
    description: "Dagster: software-defined assets, IO manager, partitions, resource system. Scientific examples: genomics asset graphs, sensor data partitions, ML feature pipelines.",
  },
  {
    id: "great-expectations",
    label: "Great Expectations — Data Quality Framework",
    shortLabel: "Great Expectations",
    group: "Great Expectations",
    icon: "ShieldCheck",
    description: "Great Expectations: expectation suites, data docs, checkpoints, profiling. Scientific examples: genomics QC, clinical trial data validation, sensor calibration checks.",
  },
  {
    id: "monte-carlo",
    label: "Monte Carlo — Data Observability Platform",
    shortLabel: "Monte Carlo",
    group: "Monte Carlo",
    icon: "Activity",
    description: "Monte Carlo: anomaly detection, freshness, volume, schema, lineage monitoring. Scientific examples: genomics data freshness, sensor anomaly detection, LHC data quality monitoring.",
  },
  {
    id: "elementary",
    label: "Elementary — dbt-native Data Observability",
    shortLabel: "Elementary",
    group: "Elementary",
    icon: "Activity",
    description: "Elementary: dbt-native anomaly detection, data tests, freshness, schema changes. Scientific examples: genomics dbt model anomalies, sensor data freshness, clinical trial schema drift.",
  },
  {
    id: "mlflow-deep-dive",
    label: "MLflow Deep Dive — Tracking + Registry + Recipes + Deploy",
    shortLabel: "MLflow",
    group: "MLflow Deep Dive",
    icon: "Cpu",
    description: "MLflow deep dive: experiment tracking (runs/metrics/params/artifacts), model registry (versioning/stages), recipes (training templates), deployments (K8s/SageMaker). Math: bias-variance, AUC-ROC, Bayesian HPO. Science: genomics model tracking, clinical trial ML, protein structure.",
  },
  {
    id: "feature-store-deep-dive",
    label: "Feature Store Deep Dive — Feast + Tecton + SageMaker",
    shortLabel: "Feature Store",
    group: "Feature Store Deep Dive",
    icon: "Boxes",
    description: "Feature store deep dive: Feast offline/online, Tecton streaming features, SageMaker Feature Store. Math: point-in-time joins, PSI drift, Shapley values. Science: genomics SNP features, clinical trial features, sensor features.",
  },
  {
    id: "vector-db-deep-dive",
    label: "Vector DB Deep Dive — Pinecone + Weaviate + Milvus + pgvector",
    shortLabel: "Vector DB",
    group: "Vector DB Deep Dive",
    icon: "Network",
    description: "Vector DB deep dive: Pinecone, Weaviate, Milvus, pgvector. ANN algorithms: HNSW, IVF, LSH. Math: cosine similarity, L2 distance, recall@k. Science: protein embeddings, molecular similarity, genomics variant clustering.",
  },
  {
    id: "llmops",
    label: "LLMOps — LLM Operations (Prompt Registry + Eval + Guardrails + RAG)",
    shortLabel: "LLMOps",
    group: "LLMOps",
    icon: "Brain",
    description: "LLMOps: prompt registry, LLM evaluation (LLM-as-judge, BLEU/ROUGE), guardrails (PII, hallucination), RAG pipeline (hybrid search + reranking). Math: attention QK^T/√d, perplexity, recall@k. Science: biomedical RAG, chemistry LLM, clinical trial NLP.",
  },
  {
    id: "data-mesh-deep-dive",
    label: "Data Mesh Deep Dive — Domain-Oriented Data Products",
    shortLabel: "Data Mesh DD",
    group: "Data Mesh Deep Dive",
    icon: "Network",
    description: "Data mesh deep dive: domain-driven data products, self-serve platform, federated governance. Zhamak Dehghani 2019. Math: graph theory, information theory for quality.",
  },
  {
    id: "streaming-sql",
    label: "Streaming SQL — Flink SQL + Spark + Materialize + RisingWave",
    shortLabel: "Streaming SQL",
    group: "Streaming SQL",
    icon: "Activity",
    description: "Streaming SQL: Flink SQL (stream-table duality, temporal joins, windowing), Spark Structured Streaming, Materialize (differential dataflow), RisingWave. Math: watermark, event-time.",
  },
  {
    id: "data-contracts-deep-dive",
    label: "Data Contracts Deep Dive — Schema + SLA + Ownership",
    shortLabel: "Data Contracts DD",
    group: "Data Contracts Deep Dive",
    icon: "ShieldCheck",
    description: "Data contracts deep dive: formal contract specification (preconditions, postconditions, invariants), compatibility checking (backward/forward/full), code enforcement via dbt tests + GE + Schema Registry.",
  },
  {
    id: "privacy-enhancing-tech",
    label: "Privacy-Enhancing Tech — Differential Privacy + Federated Learning + HE",
    shortLabel: "Privacy Tech",
    group: "Privacy Enhancing Tech",
    icon: "ShieldCheck",
    description: "Privacy-enhancing tech: differential privacy (epsilon-DP, Laplace/Gaussian mechanisms), federated learning (FedAvg, FedProx), homomorphic encryption (Paillier, BFV/BGV, CKKS). Math: epsilon-DP, sensitivity, Enc(a)+Enc(b)=Enc(a+b).",
  },
  {
    id: "numpy-scipy",
    label: "NumPy/SciPy — Computational Foundations (BLAS, LAPACK, FFT, Sparse)",
    shortLabel: "NumPy/SciPy",
    group: "NumPy SciPy",
    icon: "Cpu",
    description: "NumPy/SciPy deep dive: BLAS (GEMM), LAPACK (SVD, eigenvalues, QR), FFT (Cooley-Tukey N-D), sparse matrices (CSR/CSC/COO), N-D broadcasting. 3D-to-N-D examples. Wet lab → publication → marketplace narrative. Custom SVG diagrams + Pyodide demos.",
  },
  {
    id: "dask-ray",
    label: "Dask + Ray — Distributed Computing for Science",
    shortLabel: "Dask/Ray",
    group: "Dask Ray",
    icon: "Network",
    description: "Dask task graphs + Ray actor model. Distributed ML training, parallel genomics, multi-GPU. Scientific pipeline scaling from laptop to cluster.",
  },
  {
    id: "gpu-computing",
    label: "GPU Computing — CUDA, cuDF/RAPIDS, GPU Data Science",
    shortLabel: "GPU Computing",
    group: "GPU Computing",
    icon: "Zap",
    description: "CUDA kernels, cuDF (GPU DataFrames), RAPIDS (GPU ML), NVIDIA Nsight profiling. 100x speedup for genomics, molecular dynamics, cryo-EM.",
  },
  {
    id: "jupyter",
    label: "Jupyter Ecosystem — Notebooks, JupyterHub, Voilà Dashboards",
    shortLabel: "Jupyter",
    group: "Jupyter",
    icon: "FileText",
    description: "Jupyter notebooks, JupyterHub (multi-user), JupyterLab, Voilà (interactive dashboards), Binder, Colab. The reproducible research platform from wet lab to publication.",
  },
  {
    id: "transformer-deep-dive",
    label: "Transformer Deep Dive — Multi-Head Attention, RoPE, Flash Attention",
    shortLabel: "Transformer DD",
    group: "Transformer Deep Dive",
    icon: "Brain",
    description: "Transformer deep dive: multi-head attention softmax(QK^T/√d_k)×V, sinusoidal/RoPE/ALiBi positional encoding, LayerNorm/RMSNorm, FFN/SwiGLU, Flash Attention tiled O(N²/M). Math: attention, PE, norm, Flash.",
  },
  {
    id: "diffusion-models-deep-dive",
    label: "Diffusion Models Deep Dive — DDPM, Score Matching, Latent Diffusion",
    shortLabel: "Diffusion DD",
    group: "Diffusion Models Deep Dive",
    icon: "Atom",
    description: "Diffusion deep dive: DDPM (Ho 2020), score matching (Song 2019), latent diffusion (Rombach 2022), Stable Diffusion, classifier-free guidance. Math: forward/reverse process, score function, guidance.",
  },
  {
    id: "fine-tuning-deep-dive",
    label: "Fine-Tuning Deep Dive — LoRA, QLoRA, PEFT, RLHF, DPO",
    shortLabel: "Fine-Tuning DD",
    group: "Fine-Tuning Deep Dive",
    icon: "Cpu",
    description: "Fine-tuning deep dive: full fine-tuning, LoRA (W=W0+BA), QLoRA (NF4 quantization), PEFT (prefix/prompt/adapter), RLHF (PPO), DPO (Direct Preference Optimization). Math: LoRA decomposition, DPO loss.",
  },
  {
    id: "agent-frameworks",
    label: "Agent Frameworks — AutoGPT, CrewAI, LangGraph, Multi-Agent",
    shortLabel: "Agent Frameworks",
    group: "Agent Frameworks",
    icon: "Network",
    description: "AI agent frameworks: ReAct (Thought→Action→Observation), multi-agent orchestration (supervisor/hierarchical/peer), LangGraph (graph-based), tool use, memory. Math: action probability, state transitions.",
  },
  {
    id: "computational-biology",
    label: "Computational Biology — MD, AlphaFold, Docking, Systems Bio",
    shortLabel: "Comp Biology",
    group: "Computational Biology",
    icon: "Atom",
    description: "Computational biology deep dive: molecular dynamics (AMBER, GROMACS, Verlet integration, N-D force arrays), protein folding (AlphaFold2, MSA attention, evoformer), drug docking (AutoDock Vina, N-D conformer search, scoring), systems biology (FBA, ODE, parameter estimation). Math: Newton's equations, force fields, attention, FBA. Wet lab → NumPy → publication → marketplace.",
  },
  {
    id: "computational-chemistry",
    label: "Computational Chemistry — DFT, Hartree-Fock, Molecular Orbitals",
    shortLabel: "Comp Chemistry",
    group: "Computational Chemistry",
    icon: "Atom",
    description: "DFT (Kohn-Sham equations, LDA/GGA/hybrid), Hartree-Fock (Schrödinger Hψ=Eψ), molecular orbitals (HOMO/LUMO/band gap), Arrhenius kinetics. Math: Kohn-Sham, Arrhenius k=Ae^(-Ea/RT). Gaussian, ORCA, VASP. Wet lab → DFT → publication → marketplace.",
  },
  {
    id: "computational-physics",
    label: "Computational Physics — QCD, Monte Carlo, FEM, CFD",
    shortLabel: "Comp Physics",
    group: "Computational Physics",
    icon: "Cpu",
    description: "Lattice QCD (Wilson fermions, gauge fields), Monte Carlo (Metropolis, importance sampling), FEM (weak form, assembly), CFD (Navier-Stokes, turbulence). Math: Metropolis min(1,e^(-ΔE/kT)), Navier-Stokes. LHC, climate, astrophysics.",
  },
  {
    id: "bioinformatics-pipelines",
    label: "Bioinformatics Pipelines — GATK, RNA-seq, ChIP-seq",
    shortLabel: "Bio Pipelines",
    group: "Bioinformatics Pipelines",
    icon: "Workflow",
    description: "GATK variant calling (BWA→MarkDups→BQSR→HaplotypeCaller), RNA-seq (STAR→featureCounts→DESeq2), ChIP-seq (BWA→MACS2→motif). Math: Poisson, binomial, negative binomial. Clinical genomics, cancer, population genetics.",
  },
  {
    id: "elegant-code",
    label: "Elegant Code — Multi-disciplinary Math → Code → Science → Insight",
    shortLabel: "Elegant Code",
    group: "Elegant Code",
    icon: "Sparkles",
    description: "5 cross-disciplinary scenarios showing how ONE math equation bridges 3+ sciences. SVD (genomics↔audio↔finance), Attention (folding↔NLP), Poisson (sequencing↔networks↔decay), FFT (mass spec↔audio↔cryo-EM), Verlet (MD↔games↔orbits). Code in Scala/Rust/Go/Elixir/Zig. 'X IS Y' insights = the unexpected connections no single PhD sees.",
  },
  {
    id: "connections",
    label: "Connections — Card → Host Page Map of the Multi-disciplinary Thesis",
    shortLabel: "Connections",
    group: "Elegant Code",
    icon: "Network",
    description: "Index of the 10 cross-disciplinary elegant-code cards and the host pages where each one is propagated. The map shows where the platform's multi-disciplinary thesis surfaces inline, so a reader on any host page can navigate the full graph of cross-disciplinary connections.",
  },
  {
    id: "global-shipping",
    label: "Global Shipping — Maritime, Ports, AIS Vessel Tracking",
    shortLabel: "Global Shipping",
    group: "Computational Science",
    icon: "Anchor",
    description: "Maritime analytics on 100K vessels × 10⁹ AIS positions: Haversine port-to-port distance, Kalman vessel tracking, PageRank port centrality, Monte Carlo berth congestion, Markov port-state transitions, GBM container dwell times, VaR Solvency II risk, Lloyd's port clustering. The maritime host for cross-disciplinary elegant-code cards.",
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
