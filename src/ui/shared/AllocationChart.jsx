import React from 'react';
import { motion } from 'framer-motion';

const AllocationChart = ({ assets }) => {
    // Calculate allocation based on mock values or real balances
    // For visual appeal, we group small assets into "Others" if needed
    
    // Mock allocation data for visual structure if assets are empty/low value
    const data = [
        { label: 'ETH', value: 65, color: '#627EEA' },
        { label: 'USDC', value: 25, color: '#2775CA' },
        { label: 'Other', value: 10, color: '#A044FF' }
    ];

    const radius = 60;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Donut Chart */}
            <div style={{ position: 'relative', width: 140, height: 140 }}>
                <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                    {data.map((item, index) => {
                        const strokeDasharray = `${(item.value / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -accumulatedOffset;
                        accumulatedOffset += (item.value / 100) * circumference;

                        return (
                            <motion.circle
                                key={item.label}
                                cx="70"
                                cy="70"
                                r={radius}
                                fill="none"
                                stroke={item.color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                initial={{ opacity: 0, strokeDasharray: `0 ${circumference}` }}
                                animate={{ opacity: 1, strokeDasharray: strokeDasharray }}
                                transition={{ duration: 1, delay: index * 0.2 }}
                                style={{ pointerEvents: 'none' }}
                            />
                        );
                    })}
                </svg>
                {/* Center Content */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Top</div>
                    <div style={{ fontWeight: 600 }}>ETH</div>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                        <span style={{ fontSize: '0.9rem', color: '#ddd' }}>{item.label}</span>
                        <span style={{ fontSize: '0.9rem', color: '#888', marginLeft: 'auto' }}>{item.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AllocationChart;
