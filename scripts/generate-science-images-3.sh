#!/bin/bash
# Generate 16 AI images for the 4 new advanced-science pages

set -e
AP_DIR="/home/z/my-project/public/images/alphaproteo"
BOLTZ_DIR="/home/z/my-project/public/images/boltz"
DRUG_DIR="/home/z/my-project/public/images/aidrug"
SM_DIR="/home/z/my-project/public/images/spatialmulti"

echo "=== AlphaProteo images ==="
z-ai image -p "Designed protein binder wrapping around target protein, two complementary protein surfaces interlocking like puzzle pieces, scientific molecular visualization, teal binder and orange target, dark background, hyperdetailed structural biology" -o "$AP_DIR/binder-target.png" -s 1024x1024
echo "  ✓ Binder-target"

z-ai image -p "Diffusion generative process for protein design, sequence of frames from random noise to folded 3D protein structure, scientific visualization, progressive denoising, dark background, hyperdetailed ML illustration" -o "$AP_DIR/diffusion-design.png" -s 1344x768
echo "  ✓ Diffusion design"

z-ai image -p "Protein inverse folding, 3D protein structure on left transforming to amino acid sequence on right, scientific visualization, structure-to-sequence mapping, dark background, hyperdetailed" -o "$AP_DIR/inverse-folding.png" -s 1344x768
echo "  ✓ Inverse folding"

z-ai image -p "Wet lab validation assay, multi-well plate with protein binding fluorescence, scientific lab equipment, hyperdetailed biotechnology visualization" -o "$AP_DIR/wet-lab.png" -s 1024x1024
echo "  ✓ Wet lab"

echo ""
echo "=== Boltz-1/2 images ==="
z-ai image -p "Multi-chain protein complex, multiple subunits in different colours assembling into one structure, scientific molecular visualization, dark background, hyperdetailed structural biology" -o "$BOLTZ_DIR/multi-chain.png" -s 1024x1024
echo "  ✓ Multi-chain"

z-ai image -p "Diffusion architecture diagram for biomolecular structure prediction, neural network layers transforming noisy 3D coordinates to clean protein structure, scientific visualization, dark background, hyperdetailed" -o "$BOLTZ_DIR/diffusion-arch.png" -s 1344x768
echo "  ✓ Diffusion arch"

z-ai image -p "Per-residue confidence map pLDDT on protein structure, colour gradient blue high confidence to red low confidence, scientific visualization, dark background, hyperdetailed" -o "$BOLTZ_DIR/confidence-map.png" -s 1024x1024
echo "  ✓ Confidence map"

z-ai image -p "Open source architecture diagram for protein structure prediction, modular neural network blocks in flowchart, scientific ML visualization, dark background, hyperdetailed" -o "$BOLTZ_DIR/open-arch.png" -s 1344x768
echo "  ✓ Open arch"

echo ""
echo "=== AI drug discovery images ==="
z-ai image -p "Generative chemistry molecular design, AI generating new drug molecules, floating molecular structures emerging from neural network, scientific visualization, dark background, hyperdetailed drug discovery" -o "$DRUG_DIR/generative-chem.png" -s 1024x1024
echo "  ✓ Generative chem"

z-ai image -p "Phenomics cellular imaging, hundreds of cell images with different morphological phenotypes, high-content screening, scientific microscopy, hyperdetailed" -o "$DRUG_DIR/phenomics.png" -s 1024x1024
echo "  ✓ Phenomics"

z-ai image -p "Drug-target binding prediction, small molecule ligand docking into protein active site, glowing binding pose, scientific molecular visualization, dark background, hyperdetailed drug discovery" -o "$DRUG_DIR/binding-prediction.png" -s 1024x1024
echo "  ✓ Binding prediction"

z-ai image -p "Clinical trial pipeline visualization, stages from drug candidate to FDA approval, scientific flowchart with molecular icons, dark background, hyperdetailed" -o "$DRUG_DIR/clinical-pipeline.png" -s 1344x768
echo "  ✓ Clinical pipeline"

echo ""
echo "=== Spatial multi-omics images ==="
z-ai image -p "DBiT-seq microfluidic chip on tissue section, microfluidic channels depositing barcodes onto tissue, scientific visualization, dark background, hyperdetailed spatial omics" -o "$SM_DIR/dbit-chip.png" -s 1024x1024
echo "  ✓ DBiT chip"

z-ai image -p "Spatial chromatin marks H3K4me3 and H3K27me3 on tissue, two-colour immunofluorescence showing active and repressed chromatin regions, scientific microscopy, hyperdetailed" -o "$SM_DIR/spatial-chromatin.png" -s 1024x1024
echo "  ✓ Spatial chromatin"

z-ai image -p "Multi-modal spatial integration, overlay of RNA expression and chromatin accessibility on same tissue, dual-channel scientific visualization, hyperdetailed spatial omics" -o "$SM_DIR/multimodal-spatial.png" -s 1024x1024
echo "  ✓ Multimodal spatial"

z-ai image -p "Spatial ATAC and RNA co-profiling on tissue, two adjacent panels showing same tissue with different modality heatmaps, scientific multi-omics visualization, hyperdetailed" -o "$SM_DIR/spatial-atac-rna.png" -s 1344x768
echo "  ✓ Spatial ATAC-RNA"

echo ""
echo "=== All 16 images generated ==="
ls -la $AP_DIR $BOLTZ_DIR $DRUG_DIR $SM_DIR
