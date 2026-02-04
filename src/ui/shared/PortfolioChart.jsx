import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const PortfolioChart = ({ data, color = '#FF6B35', height = 300 }) => {
    // Generate mock data if none provided (for the "premium" look)
    const chartData = useMemo(() => {
        if (data && data.length > 0) return data;
        
        // Generate a smooth-ish random curve
        const points = [];
        let value = 100;
        for (let i = 0; i < 100; i++) {
            const change = (Math.random() - 0.48) * 10; // Slight upward trend
            value += change;
            points.push(Math.max(20, value));
        }
        return points;
    }, [data]);

    const pathData = useMemo(() => {
        const max = Math.max(...chartData);
        const min = Math.min(...chartData);
        const range = max - min;
        const widthStep = 100 / (chartData.length - 1);

        // Move to first point
        let d = `M 0,${100 - ((chartData[0] - min) / range * 80 + 10)}`;

        // Draw lines
        chartData.forEach((val, i) => {
            const x = i * widthStep;
            const y = 100 - ((val - min) / range * 80 + 10);
            d += ` L ${x},${y}`;
        });

        return d;
    }, [chartData]);

    const areaData = `${pathData} L 100,100 L 0,100 Z`;

    return (
        <div style={{ width: '100%', height: `${height}px`, position: 'relative', overflow: 'hidden' }}>
            <svg 
                viewBox="0 0 100 100" 
                preserveAspectRatio="none" 
                style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                {/* Area Fill */}
                <motion.path
                    d={areaData}
                    fill="url(#chartGradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                />

                {/* Line Path */}
                <motion.path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />
            </svg>
            
            {/* Hover Crosshair (simplified) */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                background: 'linear-gradient(90deg, transparent 0%, transparent 100%)', // Placeholder for interaction
            }} />
        </div>
    );
};

export default PortfolioChart;
