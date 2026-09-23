#!/bin/bash
# Generate 16 AI images for the 4 new science pages (cryo-EM, spatial tx, single-cell, AlphaMissense)

set -e
CRYO_DIR="/home/z/my-project/public/images/cryoem"
SPATIAL_DIR="/home/z/my-project/public/images/spatialtx"
SC_DIR="/home/z/my-project/public/images/singlecell"
AM_DIR="/home/z/my-project/public/images/alphamissense"

echo "=== Cryo-EM images ==="
z-ai image -p "Cryo-EM electron microscopy image of protein particles, dark background, white dots scattered, low signal-to-noise ratio, scientific grayscale, high-detail electron microscopy visualization, hyperdetailed" -o "$CRYO_DIR/cryo-particles.png" -s 1024x1024
echo "  ✓ Cryo particles"

z-ai image -p "Cryo-EM 2D class averages, grid of 16 noise-cleaned protein views at different orientations, scientific grayscale, hyperdetailed, structural biology visualization" -o "$CRYO_DIR/2d-class-averages.png" -s 1024x1024
echo "  ✓ 2D class averages"

z-ai image -p "3D reconstructed protein density map, isosurface rendering in teal, high-resolution cryo-EM structure, scientific molecular visualization, dark background, hyperdetailed, octane render" -o "$CRYO_DIR/3d-reconstruction.png" -s 1024x1024
echo "  ✓ 3D reconstruction"

z-ai image -p "Contrast Transfer Function CTF pattern, concentric rings radiating from center, alternating bright and dark bands, scientific visualization, hyperdetailed optics" -o "$CRYO_DIR/ctf-pattern.png" -s 1024x1024
echo "  ✓ CTF pattern"

echo ""
echo "=== Spatial transcriptomics images ==="
z-ai image -p "Tissue cross-section with Visium spatial barcoded spots, hexagonal grid overlay on tissue, multi-colour gene expression heatmap on spots, scientific microscopy visualization, hyperdetailed" -o "$SPATIAL_DIR/visium-spots.png" -s 1024x1024
echo "  ✓ Visium spots"

z-ai image -p "MERFISH combinatorial barcode matrix, grid of fluorescent dots in 4 colours red green blue yellow, binary code pattern, scientific multiplexed imaging, hyperdetailed" -o "$SPATIAL_DIR/merfish-barcodes.png" -s 1024x1024
echo "  ✓ MERFISH barcodes"

z-ai image -p "Cell segmentation on DAPI-stained tissue, blue nuclei outlines with red mRNA puncta dots, machine learning segmentation boundaries in green, scientific microscopy, hyperdetailed" -o "$SPATIAL_DIR/cell-segmentation.png" -s 1024x1024
echo "  ✓ Cell segmentation"

z-ai image -p "Spatial domain clusters on tissue, colour-coded regions spatially coherent tissue subtypes, scientific multi-colour tissue map, hyperdetailed transcriptomics visualization" -o "$SPATIAL_DIR/spatial-domains.png" -s 1024x1024
echo "  ✓ Spatial domains"

echo ""
echo "=== Single-cell multi-omics images ==="
z-ai image -p "UMAP clustering of single cells, scattered points colour-coded by cell type, two-dimensional embedding, scientific data visualization, dark background, hyperdetailed bioinformatics" -o "$SC_DIR/umap-clusters.png" -s 1024x1024
echo "  ✓ UMAP clusters"

z-ai image -p "10x Genomics Gel bead-in-Emulsion GEM droplet, single cell encapsulated in microfluidic droplet with barcoded bead, scientific illustration, hyperdetailed microfluidics" -o "$SC_DIR/gem-droplet.png" -s 1024x1024
echo "  ✓ GEM droplet"

z-ai image -p "RNA velocity arrows on single-cell embedding, points with arrows showing trajectory direction, scientific scRNA-seq visualization, dark background, hyperdetailed" -o "$SC_DIR/rna-velocity.png" -s 1024x1024
echo "  ✓ RNA velocity"

z-ai image -p "Multi-modal integration of single-cell RNA and ATAC, two UMAP plots side by side connected by arrows, multi-omics integration visualization, hyperdetailed bioinformatics" -o "$SC_DIR/multimodal-integration.png" -s 1344x768
echo "  ✓ Multimodal integration"

echo ""
echo "=== AlphaMissense images ==="
z-ai image -p "Protein 3D structure with mutation site highlighted in red, single amino acid substitution point, glowing active site mutation, scientific molecular visualization, dark background, hyperdetailed" -o "$AM_DIR/mutation-site.png" -s 1024x1024
echo "  ✓ Mutation site"

z-ai image -p "Protein 3D structure ribbon diagram with variant positions marked in different colours, scientific structural biology visualization, dark background, hyperdetailed" -o "$AM_DIR/variant-positions.png" -s 1024x1024
echo "  ✓ Variant positions"

z-ai image -p "Bar chart of pathogenicity scores for 71M missense variants, density distribution with bimodal peaks, scientific data visualization, dark background, hyperdetailed" -o "$AM_DIR/pathogenicity-scores.png" -s 1344x768
echo "  ✓ Pathogenicity scores"

z-ai image -p "Genome-wide variant distribution across 23 chromosomes, manhattan-style plot with red pathogenic and blue benign variants, scientific genomics visualization, hyperdetailed" -o "$AM_DIR/genome-distribution.png" -s 1344x768
echo "  ✓ Genome distribution"

echo ""
echo "=== All 16 images generated ==="
ls -la $CRYO_DIR $SPATIAL_DIR $SC_DIR $AM_DIR
