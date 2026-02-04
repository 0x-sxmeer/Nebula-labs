import React from 'react';

const FloatingBubbles = () => {
    const bubbles = Array.from({ length: 15 }, (_, i) => i);

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0
        }}>
            {bubbles.map((i) => (
                <div 
                    key={i}
                    style={{
                        position: 'absolute',
                        bottom: '-100px',
                        width: Math.random() * 60 + 20 + 'px',
                        height: Math.random() * 60 + 20 + 'px',
                        background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1), rgba(255, 113, 32, 0.05))`,
                        borderRadius: '50%',
                        left: Math.random() * 100 + '%',
                        animation: `float ${Math.random() * 10 + 10}s linear infinite`,
                        animationDelay: Math.random() * 5 + 's',
                        opacity: Math.random() * 0.3 + 0.1
                    }}
                />
            ))}
            <style>{`
                @keyframes float {
                    to {
                        transform: translateY(-100vh) translateX(${Math.random() * 200 - 100}px);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default FloatingBubbles;
