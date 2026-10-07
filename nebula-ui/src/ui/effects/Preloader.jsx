import React, { useEffect, useState } from 'react';

const Preloader = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoading) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      display: 'grid',
      gridTemplateColumns: 'repeat(10, 1fr)',
      gridTemplateRows: 'repeat(10, 1fr)',
      animation: 'fadeOut 0.5s ease 1.5s forwards'
    }}>
      {Array.from({ length: 100 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: '#050505',
            animation: `blockFade 0.1s ease ${Math.random() * 0.5 + 1.5}s forwards`
          }}
        />
      ))}
      
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#FF7120',
        fontSize: '2rem',
        fontWeight: 'bold'
      }}>
        LABS
      </div>

      <style>{`
        @keyframes fadeOut {
          to { opacity: 0; pointer-events: none; }
        }
        @keyframes blockFade {
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Preloader;
