
import React from 'react';

export const RouteCardSkeleton = () => (
  <div className="route-card skeleton-card" style={{ padding: '16px', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
    <div className="skeleton-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="skeleton-circle shimmer" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} /> 
        <div className="skeleton-text shimmer" style={{ width: '120px', height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }} />
      </div>
      <div className="skeleton-text shimmer" style={{ width: '80px', height: '24px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }} />
    </div>
    <div className="skeleton-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
      <div className="skeleton-text shimmer" style={{ width: '80px', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} /> 
      <div className="skeleton-text shimmer" style={{ width: '100px', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
    </div>
  </div>
);
