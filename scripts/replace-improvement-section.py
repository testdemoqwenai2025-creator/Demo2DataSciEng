#!/usr/bin/env python3
"""Replace the 'Improvement designs — 8 code previews' SectionCard with the
new 'Quantum interactives — 8 fully interactive visuals' SectionCard.
Also add the QuantumInteractives import to the page.
"""
import re

PAGE = "/home/z/my-project/src/app/_pages/quantum-computing.tsx"

with open(PAGE) as f:
    src = f.read()

# 1. Add the import after the QuantumGallery3D import
if "quantum-interactives" not in src:
    src = src.replace(
        'import { QuantumGallery3D } from "../_components/quantum-gallery-3d";',
        'import { QuantumGallery3D } from "../_components/quantum-gallery-3d";\nimport { QuantumInteractives } from "../_components/quantum-interactives";',
    )
    print("Added QuantumInteractives import")

# 2. Find and replace the entire "Improvement designs" SectionCard
# Pattern: from <SectionCard title="Improvement designs..." to its closing </SectionCard>
pattern = re.compile(
    r'\n\s*<SectionCard\s*\n\s*title="Improvement designs[^"]*"[^>]*>.*?</SectionCard>\n',
    re.DOTALL,
)
m = pattern.search(src)
if not m:
    raise SystemExit("Couldn't find the Improvement designs SectionCard")

new_section = '''

      <SectionCard
        title="Quantum interactives — 8 fully interactive visuals (drag, slide, click to explore)"
        description="Replaces the previous 'Improvement designs — 8 code previews' section. Each card opens a lazy popup with a fully interactive visualisation: drag the Bloch sphere, click qubits to inject errors, slide μ across the topological phase boundary, run 8192-shot sampling, etc. The math is computed live in the browser (no Pyodide round-trip) — instant feedback. Modal content only mounts when the card is clicked."
        icon={<Sparkles className="h-5 w-5" />}
        badge="8 interactives"
      >
        <QuantumInteractives />
      </SectionCard>
'''

new_src = src[:m.start()] + new_section + src[m.end():]

with open(PAGE, "w") as f:
    f.write(new_src)

print(f"Replaced section. File went from {len(src.splitlines())} to {len(new_src.splitlines())} lines")
print("Interactives present:", "QuantumInteractives" in new_src)
print("Old section gone:", "Improvement designs" not in new_src)
