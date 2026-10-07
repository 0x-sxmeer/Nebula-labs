# Developer Guide

## Setup

1. **Clone repo**: `git clone <repo-url>`
2. **Environment**: Copy `.env.example` to `.env` and fill in API keys.
3. **Install**: Run `npm install`.
4. **Dev Server**: Run `npm run dev`.

## Architecture

- **/src/components**: Reusable UI components.
- **/src/ui**: Feature-specific UI sections (Hero, SwapCard).
- **/src/hooks**: Custom React hooks (`useSwap`, `useTokenBalance`).
- **/src/services**: API services (`lifiService`, `analyticsService`).
- **/src/utils**: Helpers and validation logic.
- **/api**: Vercel Serverless Functions for backend proxies.

## Testing

- **Run Tests**: `npm test` (Runs Vitest).
- **Coverage**: `npm run test:coverage`.

## Key Features

- **Rate Limiting**: Implemented via Vercel KV in `/api` proxies.
- **Validation**: Strict input validation in `src/utils/validation.js`.
- **Security**: No API keys exposed to client; all defined in `.env`.

## Deployment

Refer to `DEPLOYMENT_GUIDE_VERCEL.md` for detailed production deployment instructions.
