/**
 * Skeleton Loader Components
 * Professional loading states for all async operations
 */

import React from 'react';

/**
 * Skeleton shimmer animation
 */
const shimmerKeyframes = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
`;

const shimmerStyle = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
  backgroundSize: '1000px 100%',
  animation: 'shimmer 2s infinite',
};

/**
 * Base skeleton component
 */
export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '8px', style = {} }) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      ...shimmerStyle,
      ...style,
    }}
  />
);

/**
 * Route card skeleton loader
 */
export const RouteCardSkeleton = () => (
  <div style={{
    padding: '1rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <Skeleton width="40px" height="40px" borderRadius="50%" />
      <div style={{ flex: 1 }}>
        <Skeleton width="120px" height="16px" style={{ marginBottom: '8px' }} />
        <Skeleton width="200px" height="12px" />
      </div>
      <div style={{ textAlign: 'right' }}>
        <Skeleton width="80px" height="18px" style={{ marginBottom: '6px' }} />
        <Skeleton width="60px" height="14px" />
      </div>
    </div>
  </div>
);

/**
 * Multiple route cards skeleton
 */
export const RouteListSkeleton = ({ count = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <RouteCardSkeleton key={i} />
    ))}
  </div>
);

/**
 * Token selector skeleton
 */
export const TokenSelectorSkeleton = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
  }}>
    <Skeleton width="32px" height="32px" borderRadius="50%" />
    <div style={{ flex: 1 }}>
      <Skeleton width="60px" height="14px" style={{ marginBottom: '6px' }} />
      <Skeleton width="100px" height="12px" />
    </div>
    <Skeleton width="16px" height="16px" />
  </div>
);

/**
 * Balance display skeleton
 */
export const BalanceSkeleton = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'flex-end',
    padding: '8px 0',
  }}>
    <Skeleton width="80px" height="12px" />
    <Skeleton width="60px" height="12px" />
  </div>
);

/**
 * Route details skeleton
 */
export const RouteDetailsSkeleton = () => (
  <div style={{
    padding: '1.5rem',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
  }}>
    {/* Header */}
    <div style={{ marginBottom: '1.5rem' }}>
      <Skeleton width="150px" height="18px" style={{ marginBottom: '8px' }} />
      <Skeleton width="250px" height="14px" />
    </div>

    {/* Steps */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
        }}>
          <Skeleton width="32px" height="32px" borderRadius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton width="100px" height="14px" style={{ marginBottom: '6px' }} />
            <Skeleton width="180px" height="12px" />
          </div>
          <Skeleton width="60px" height="14px" />
        </div>
      ))}
    </div>

    {/* Gas estimate */}
    <div style={{
      marginTop: '1.5rem',
      padding: '12px',
      background: 'rgba(255,113,32,0.05)',
      borderRadius: '10px',
    }}>
      <Skeleton width="120px" height="14px" style={{ marginBottom: '8px' }} />
      <Skeleton width="80px" height="16px" />
    </div>
  </div>
);

/**
 * Pulse dot loader (for inline loading states)
 */
export const PulseDot = () => (
  <span style={{
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#ff7120',
    animation: 'pulse 1.5s ease-in-out infinite',
  }} />
);

/**
 * Inline text skeleton (for loading text)
 */
export const TextSkeleton = ({ width = '100px' }) => (
  <Skeleton width={width} height="14px" borderRadius="4px" />
);

/**
 * Gas price skeleton
 */
export const GasPriceSkeleton = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
  }}>
    <Skeleton width="16px" height="16px" borderRadius="50%" />
    <Skeleton width="80px" height="12px" />
  </div>
);

/**
 * Swap summary skeleton
 */
export const SwapSummarySkeleton = () => (
  <div style={{
    padding: '1rem',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
      <Skeleton width="100px" height="14px" />
      <Skeleton width="80px" height="14px" />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
      <Skeleton width="120px" height="14px" />
      <Skeleton width="70px" height="14px" />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
      <Skeleton width="80px" height="14px" />
      <Skeleton width="90px" height="14px" />
    </div>
    <div style={{
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width="100px" height="16px" />
        <Skeleton width="100px" height="16px" />
      </div>
    </div>
  </div>
);

/**
 * Add shimmer animation to document
 */
export const SkeletonStyles = () => (
  <style>{shimmerKeyframes}</style>
);

export default {
  Skeleton,
  RouteCardSkeleton,
  RouteListSkeleton,
  TokenSelectorSkeleton,
  BalanceSkeleton,
  RouteDetailsSkeleton,
  PulseDot,
  TextSkeleton,
  GasPriceSkeleton,
  SwapSummarySkeleton,
  SkeletonStyles,
};
