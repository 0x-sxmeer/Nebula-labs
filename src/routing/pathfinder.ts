import { Pool, GraphEdge, Route, SplitRoute } from './types';

/**
 * The "Brain" of the Aggregator
 * Implements Graph Theory for pathfinding and numerical optimization for split routing.
 */
export class Pathfinder {
  // Adjacency List: Token Address -> Array of Edges (Pools)
  private adjacencyList: Map<string, GraphEdge[]>;

  constructor(pools: Pool[]) {
    this.adjacencyList = this.buildGraph(pools);
  }

  /**
   * Builds a directed weighted graph from liquidity pools.
   * Weight = -ln(price) to turn multiplication into addition for Dijkstra.
   */
  private buildGraph(pools: Pool[]): Map<string, GraphEdge[]> {
    const graph = new Map<string, GraphEdge[]>();

    for (const pool of pools) {
      if (!graph.has(pool.token0)) graph.set(pool.token0, []);
      if (!graph.has(pool.token1)) graph.set(pool.token1, []);

      // Calculate price and weight (simplified)
      // In reality, spot price depends on reserves (res1/res0)
      const price0to1 = Number(pool.reserve1) / Number(pool.reserve0);
      const price1to0 = Number(pool.reserve0) / Number(pool.reserve1);

      // Weight = -ln(price). maximize price => minimize weight.
      // We add an offset to keep weights positive for Dijkstra if needed, 
      // or use Bellman-Ford if handling negative weights (arb opportunities).
      // For this MVP, we assume non-negative weights by strictly maximizing output.
      
      const weight0to1 = -Math.log(price0to1);
      const weight1to0 = -Math.log(price1to0);

      const edge0: GraphEdge = {
        to: pool.token1,
        weight: weight0to1,
        capacity: pool.reserve1,
        pool
      };

      const edge1: GraphEdge = {
        to: pool.token0,
        weight: weight1to0,
        capacity: pool.reserve0,
        pool
      };

      graph.get(pool.token0)?.push(edge0);
      graph.get(pool.token1)?.push(edge1);
    }

    return graph;
  }

  /**
   * Find the K-Best single paths using a variation of Dijkstra or Yen's Algorithm.
   */
  public findBestPaths(
    fromToken: string, 
    toToken: string, 
    amountIn: bigint, 
    k: number = 3
  ): Route[] {
    // Note: A full Yen's implementation is complex. 
    // This is a simplified "Multipath Dijkstra" placeholder.
    
    // Priority Queue would be used here.
    // For MVP, we scan direct neighbors and 1-hop connections.

    const routes: Route[] = [];

    // 1. Check Direct Pools
    const directEdges = this.adjacencyList.get(fromToken) || [];
    for (const edge of directEdges) {
      if (edge.to === toToken) {
        // Found direct path
        routes.push(this.simulateSwap(edge.pool, fromToken, amountIn));
      }
    }

    // 2. Check 1-Hop paths (A -> B -> C)
    for (const edge1 of directEdges) {
      const intermediateToken = edge1.to;
      if (intermediateToken === toToken) continue;

      const secondaryEdges = this.adjacencyList.get(intermediateToken) || [];
      for (const edge2 of secondaryEdges) {
        if (edge2.to === toToken) {
          // Found 2-step path
          // Simulate Step 1
          const r1 = this.simulateSwap(edge1.pool, fromToken, amountIn);
          // Simulate Step 2
          const r2 = this.simulateSwap(edge2.pool, intermediateToken, r1.amountOut);
          
          // Combine
          routes.push({
            ...r2,
            steps: [...r1.steps, ...r2.steps],
            amountIn: amountIn,
            // gas cost should sum up
            gasCostUSD: r1.gasCostUSD + r2.gasCostUSD 
          });
        }
      }
    }

    // Sort by Output Amount DESC
    return routes.sort((a, b) => Number(b.amountOut - a.amountOut)).slice(0, k);
  }

  /**
   * Split Routing Logic
   * Distributes volume across top K paths to minimize slippage.
   */
  public optimizeSplit(
    fromToken: string, 
    toToken: string, 
    totalAmount: bigint
  ): SplitRoute {
    const topRoutes = this.findBestPaths(fromToken, toToken, totalAmount, 3);
    
    if (topRoutes.length === 0) throw new Error('No route found');
    if (topRoutes.length === 1) {
      return {
        routes: topRoutes,
        distribution: [1.0],
        totalAmountIn: totalAmount,
        totalAmountOut: topRoutes[0].amountOut
      };
    }

    // COMPLEX LOGIC: Determine optimal split.
    // We want to equate the "Marginal Price" after impact on all routes.
    // Simple Heuristic: Proportional to reserves (depth).
    
    // 1. Calculate approximate depth of each route (bottleneck pool reserve)
    const depths = topRoutes.map(route => {
      // Find the "thinnest" pool in the route
      let minDepth = BigInt(0); 
      // Simplified: Just take the output amount as a proxy for efficiency/depth for now
      return route.amountOut; 
    });

    const totalDepth = depths.reduce((sum, d) => sum + d, BigInt(0));
    const distribution = depths.map(d => Number(d) / Number(totalDepth));

    // Recalculate outputs with split amounts
    // (In production, we would iterate this to converge)
    
    return {
      routes: topRoutes,
      distribution,
      totalAmountIn: totalAmount,
      totalAmountOut: totalDepth // Approximation
    };
  }

  /**
   * Mock Simulation of a swap on a pool
   */
  private simulateSwap(pool: Pool, tokenIn: string, amountIn: bigint): Route {
    // Constant Product AMM: x * y = k
    // dy = (y * dx) / (x + dx) * (1 - fee)
    
    const isToken0In = tokenIn === pool.token0;
    const reserveIn = isToken0In ? pool.reserve0 : pool.reserve1;
    const reserveOut = isToken0In ? pool.reserve1 : pool.reserve0;
    const tokenOut = isToken0In ? pool.token1 : pool.token0;

    const amountInWithFee = amountIn * BigInt(10000 - 30); // 0.3% fee
    const numerator = amountInWithFee * reserveOut;
    const denominator = (reserveIn * BigInt(10000)) + amountInWithFee;
    const amountOut = numerator / denominator;

    // Calculate price impact: (1 - (amountOut/reserveOut) / (amountIn/reserveIn)) * 100
    // Simplified: price impact = (amountIn / (reserveIn + amountIn)) * 100
    const priceImpactBps = Number((amountIn * BigInt(10000)) / (reserveIn + amountIn));
    const priceImpact = priceImpactBps / 100; // Convert basis points to percentage

    return {
      steps: [{
        poolAddress: pool.address,
        tokenIn,
        tokenOut,
        amountIn,
        amountOutMin: amountOut // 0 slippage for sim
      }],
      amountIn,
      amountOut,
      priceImpact,
      gasCostUSD: 5 // Mock gas cost
    };
  }
}
