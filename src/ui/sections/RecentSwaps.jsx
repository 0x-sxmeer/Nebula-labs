
import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import lifiService from '../../services/lifiService';

const RecentSwaps = () => {
  const [recentSwaps, setRecentSwaps] = useState([]);
  
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const swaps = await lifiService.getRecentSwaps({ limit: 5 });
        setRecentSwaps(swaps);
      } catch (e) {
        console.warn('Failed to fetch recent swaps', e);
      }
    };
    
    fetchRecent();
    const interval = setInterval(fetchRecent, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, []);
  
  if (recentSwaps.length === 0) return null;

  const formatTimeAgo = (timestamp) => {
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      return seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds/60)}m ago`;
  };

  return (
    <div className="recent-swaps-widget" style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '100%',
        margin: '0 auto 4rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#888', fontSize: '0.9rem' }}>
         <Clock size={14} />
         <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Transactions</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {recentSwaps.map((swap, i) => (
          <div key={i} className="swap-item" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              animation: `fadeIn 0.5s ease-out ${i * 0.1}s backwards`
          }}>
            <div className="swap-tokens" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>
                  <span>{swap.fromAmount} {swap.fromToken.symbol}</span>
                  <ArrowRight size={12} color="#666" />
                  <span style={{color: '#10B981'}}>{swap.toAmount} {swap.toToken.symbol}</span>
               </div>
            </div>
            <div className="swap-meta" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: '#666' }}>
               <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#aaa' }}>{swap.chain.name}</span>
               <span>{formatTimeAgo(swap.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentSwaps;
