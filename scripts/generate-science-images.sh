#!/bin/bash
# Generate 12 AI images for the three science pages (genetics, macro structures, systems biology)
# Uses z-ai CLI tool. Outputs to /home/z/my-project/public/images/{genetics,macro,systemsbio}/

set -e
GEN_DIR="/home/z/my-project/public/images/genetics"
MAC_DIR="/home/z/my-project/public/images/macro"
SYS_DIR="/home/z/my-project/public/images/systemsbio"

echo "=== Generating genetic materials images ==="
z-ai image -p "3D scientific render of DNA double helix, colour-coded base pairs adenine-thymine blue, guanine-cytosine green, glowing molecular bonds, dark scientific background, hyperdetailed, octane render, molecular biology visualization" -o "$GEN_DIR/dna-helix.png" -s 1024x1024
echo "  ✓ DNA helix"

z-ai image -p "3D molecular render of messenger RNA transcription, DNA strand unwinding, RNA polymerase enzyme in centre, growing mRNA strand in vibrant cyan, DNA template in blue, scientific illustration, dark background, hyperdetailed biology visualization" -o "$GEN_DIR/rna-transcription.png" -s 1024x1024
echo "  ✓ RNA transcription"

z-ai image -p "3D molecular render of CRISPR-Cas9 gene editing, Cas9 protein in teal with cyan guide RNA, target DNA strand in orange being cut, scientific illustration, dark background, glowing active site, hyperdetailed, octane render" -o "$GEN_DIR/crispr-cas9.png" -s 1024x1024
echo "  ✓ CRISPR-Cas9"

z-ai image -p "GWAS Manhattan plot scientific data visualization, scatter plot with thousands of points, chromosome bands colour-coded, red horizontal significance line, peaks highlighted in yellow, dark scientific theme, hyperdetailed bioinformatics" -o "$GEN_DIR/gwas-plot.png" -s 1344x768
echo "  ✓ GWAS plot"

echo ""
echo "=== Generating macro structures images ==="
z-ai image -p "Four levels of protein structure scientific illustration, primary amino acid chain, secondary alpha helix and beta sheet, tertiary folded globular, quaternary multi-subunit complex, gradient blue to purple, 3D render, dark background, hyperdetailed biochemistry" -o "$MAC_DIR/protein-levels.png" -s 1344x768
echo "  ✓ Protein 4 levels"

z-ai image -p "Enzyme active site with substrate, lock and key molecular binding, enzyme surface in teal, substrate molecule in orange fitting into cleft, glowing hydrogen bonds, 3D molecular render, scientific illustration, dark background, hyperdetailed" -o "$MAC_DIR/enzyme-active-site.png" -s 1024x1024
echo "  ✓ Enzyme active site"

z-ai image -p "N-linked glycan branched carbohydrate tree structure, sugar monomers in different colours blue green orange, glycosidic bonds as lines, scientific molecular render, dark background, hyperdetailed glycobiology visualization" -o "$MAC_DIR/glycan-tree.png" -s 1024x1024
echo "  ✓ Glycan tree"

z-ai image -p "Lipid bilayer membrane cross-section, phospholipid heads in teal, hydrophobic tails in orange, water molecules around, channel protein embedded, 3D scientific render, dark background, hyperdetailed membrane biophysics" -o "$MAC_DIR/lipid-bilayer.png" -s 1344x768
echo "  ✓ Lipid bilayer"

echo ""
echo "=== Generating systems biology images ==="
z-ai image -p "Metabolic network graph visualization, hundreds of nodes colour-coded by pathway glycolysis red TCA cycle blue lipid green, connecting edges forming hairball, dark scientific theme, hyperdetailed systems biology" -o "$SYS_DIR/metabolic-network.png" -s 1024x1024
echo "  ✓ Metabolic network"

z-ai image -p "Protein-protein interaction network graph, hairball of interconnected nodes, hub proteins highlighted in yellow, edges colour-coded by confidence, dark scientific visualization, hyperdetailed network biology" -o "$SYS_DIR/ppi-network.png" -s 1024x1024
echo "  ✓ PPI network"

z-ai image -p "Multi-omics integration Venn-style diagram, four intersecting circles genomics transcriptomics proteomics metabolomics, colour-coded overlapping regions, scientific data visualization, dark theme, hyperdetailed" -o "$SYS_DIR/multi-omics.png" -s 1024x1024
echo "  ✓ Multi-omics"

z-ai image -p "3D whole-cell model render, cell membrane with organelles mitochondria nucleus ER Golgi, glowing molecular activity, scientific illustration, dark background, hyperdetailed systems biology, octane render" -o "$SYS_DIR/whole-cell.png" -s 1024x1024
echo "  ✓ Whole-cell"

echo ""
echo "=== All 12 images generated ==="
ls -la $GEN_DIR $MAC_DIR $SYS_DIR
