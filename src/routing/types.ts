/**
 * Types for the Off-Chain Discovery Engine
 */

export interface Pool {
  address: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  fee: number; // e.g. 3000 for 0.3%
  protocol: 'UniswapV2' | 'UniswapV3' | 'Curve' | 'Balancer';
}

export interface GraphEdge {
  to: string; // Token Address
  weight: number; // -ln(price) for Bellman-Ford/Dijkstra
  capacity: bigint; // Max liquidity available
  pool: Pool;
}

export interface SwapStep {
  poolAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOutMin: bigint;
}

export interface Route {
  steps: SwapStep[];
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  gasCostUSD: number;
}

export interface SplitRoute {
  routes: Route[];
  distribution: number[]; // e.g. [0.6, 0.4] for 60/40 split
  totalAmountIn: bigint;
  totalAmountOut: bigint;
}
