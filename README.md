# Nebula Swap DApp 🌌

A production-ready, highly optimized decentralized exchange (DEX) interface built with React, Wagmi, and Li.Fi.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-production--ready-green.svg)
![Coverage](https://img.shields.io/badge/coverage-70%25-brightgreen.svg)

## 🚀 Features

- **Any-to-Any Swaps**: Cross-chain swaps via Li.Fi aggregation.
- **Smart Gas Estimation**: Auto-reserves gas for native token swaps.
- **Safety First**:
  - Strict ERC20 approval checks (Pre-execution validation).
  - Input sanitization (Anti-injection).
  - Transaction recovery flows.
- **UX Polish**:
  - "Recent Swaps" live social proof widget.
  - "MAX" button with intelligent calculation.
  - Confetti celebrations & sound effects.
  - CSV History Export.
- **Mobile First**: Fully responsive design (375px+).

## 🛠️ Stack

- **Framework**: React + Vite
- **Web3**: Wagmi v2 + Viem + TanStack Query
- **Routing**: Li.Fi SDK
- **Styling**: Vanilla CSS (Performance optimized) + Framer Motion
- **Testing**: Vitest + Happy DOM + React Testing Library

## ⚡ Quick Start

### Prerequisites

- Node.js > 18
- NPM / Yarn

### Installation

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Add your VITE_WALLETCONNECT_PROJECT_ID
```

### Development

```bash
npm run dev
```

## 🧪 Testing

We maintain a strict **70% coverage threshold** for critical hooks and logic.

```bash
# Run unit tests
npm test

# Check coverage
npm run test:coverage

# Run UI test interface
npm run test:ui
```

### Key Test Suites

- `useTokenApproval.test.js`: Verifies approval lifecycle and polling.
- `useSwap.test.js`: Verifies state management and debouncing.
- `validation.test.js`: Verifies input security.

## 🏗️ Architecture

- **`src/hooks`**: Logic layer. Contains all blockchain interaction and state management.
- **`src/services`**: API layer. Handles Li.Fi and external requests.
- **`src/ui`**: Presentation layer. Dumb components receiving props from hooks.
- **`src/utils`**: Pure functions for validation, formatting, and calculation.

## 🚢 Deployment

1. **Build**:
   ```bash
   npm run build
   ```
2. **Preview**:
   ```bash
   npm run preview
   ```
3. **Deploy**:
   Target `dist/` folder for Vercel/Netlify.
   Ensure `VITE_BACKEND_API_URL` is set in production.

## 🔒 Security

- **Inputs**: All numeric inputs are sanitized via `sanitizeNumericInput`.
- **Approvals**: `useTokenApproval` forces strict checking before execution.
- **Slippage**: Auto-calculated with user safeguards.

---

© 2026 Nebula Labs
