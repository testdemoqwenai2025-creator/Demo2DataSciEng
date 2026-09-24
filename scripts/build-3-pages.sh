#!/bin/bash
# Build 3 pages: Neural Network Potentials, Enhanced Sampling, Generative Chemistry 2.0

# Create page directories
mkdir -p src/app/neural-network-potentials
mkdir -p src/app/enhanced-sampling  
mkdir -p src/app/generative-chemistry-2

# Create page.tsx wrappers
cat > src/app/neural-network-potentials/page.tsx << 'EOF'
import { NeuralNetworkPotentialsPage } from "../_pages/neural-network-potentials";
export default function Page() { return <NeuralNetworkPotentialsPage />; }
EOF

cat > src/app/enhanced-sampling/page.tsx << 'EOF'
import { EnhancedSamplingPage } from "../_pages/enhanced-sampling";
export default function Page() { return <EnhancedSamplingPage />; }
EOF

cat > src/app/generative-chemistry-2/page.tsx << 'EOF'
import { GenerativeChemistry2Page } from "../_pages/generative-chemistry-2";
export default function Page() { return <GenerativeChemistry2Page />; }
EOF

echo "Page directories and wrappers created"
