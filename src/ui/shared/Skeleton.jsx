import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, borderRadius, margin, style }) => {
    const styles = {
        width: width || '100%',
        height: height || '20px',
        borderRadius: borderRadius || '4px',
        margin: margin || '0',
        ...style
    };

    return <div className="skeleton-base" style={styles} />;
};

export default Skeleton;
