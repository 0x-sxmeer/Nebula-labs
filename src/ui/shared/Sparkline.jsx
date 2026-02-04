import React from 'react';
import { motion } from 'framer-motion';

// Mock data generator for sparklines since we lack API
const generateSparklineData = (isPositive) => {
    const points = [];
    let current = 50;
    for (let i = 0; i < 20; i++) {
        const change = (Math.random() - (isPositive ? 0.35 : 0.65)) * 10;
        current += change;
        points.push(current);
    }
    return points;
};

const Sparkline = ({ isPositive = true, color, width = 100, height = 40 }) => {
    const data = React.useMemo(() => generateSparklineData(isPositive), [isPositive]);
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    
    // Normalize points to viewbox
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <motion.path
                d={`M ${points}`}
                fill="none"
                stroke={color || (isPositive ? '#4CAF50' : '#FF4444')}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
            />
        </svg>
    );
};

export default Sparkline;
