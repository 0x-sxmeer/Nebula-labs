import React, { useState, useEffect } from 'react';
import { Fuel, Zap } from 'lucide-react';

const GasWatcher = () => {
    // Mock Gas Data (Replace with real hook if available)
    const [gas, setGas] = useState({ standard: 15, fast: 18, rapid: 22 });

    useEffect(() => {
        const interval = setInterval(() => {
            // Fluctuate gas slightly for liveness
            setGas(prev => ({
                standard: Math.max(10, prev.standard + Math.floor(Math.random() * 3 - 1)),
                fast: Math.max(12, prev.fast + Math.floor(Math.random() * 3 - 1)),
                rapid: Math.max(15, prev.rapid + Math.floor(Math.random() * 3 - 1))
            }));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '16px', 
            padding: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    background: 'rgba(76, 175, 80, 0.1)', 
                    color: '#4CAF50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Fuel size={18} />
                </div>
                <div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Ethereum Gas</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#4CAF50' }}>~${(gas.standard * 0.05).toFixed(2)}</div>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{gas.standard}</div>
                 <div style={{ fontSize: '0.75rem', color: '#888' }}>Gwei</div>
            </div>
        </div>
    );
};

export default GasWatcher;
