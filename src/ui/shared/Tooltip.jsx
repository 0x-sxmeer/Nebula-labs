import React, { useState } from 'react';

const Tooltip = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const styles = {
    container: {
      position: 'relative',
      display: 'inline-block',
      cursor: 'help'
    },
    tooltip: {
      position: 'absolute',
      background: 'rgba(15, 15, 20, 0.95)',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '0.8rem',
      whiteSpace: 'nowrap',
      zIndex: 1000,
      opacity: isVisible ? 1 : 0,
      visibility: isVisible ? 'visible' : 'hidden',
      transition: 'opacity 0.2s, visibility 0.2s',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      ...getPositionStyles(position)
    },
    arrow: {
        position: 'absolute',
        ...getArrowStyles(position)
    }
  };

  function getPositionStyles(pos) {
    switch (pos) {
      case 'top': return { bottom: '100%', left: '50%', transform: 'translateX(-50%) marginBottom: 8px' };
      case 'bottom': return { top: '100%', left: '50%', transform: 'translateX(-50%) marginTop: 8px' };
      case 'left': return { right: '100%', top: '50%', transform: 'translateY(-50%) marginRight: 8px' };
      case 'right': return { left: '100%', top: '50%', transform: 'translateY(-50%) marginLeft: 8px' };
      default: return { bottom: '100%', left: '50%', transform: 'translateX(-50%)' };
    }
  }

  function getArrowStyles(pos) {
      const size = '6px';
      const color = 'rgba(15, 15, 20, 0.95)';
      switch (pos) {
          case 'top': return { content: '""', top: '100%', left: '50%', marginLeft: '-6px', borderWidth: '6px', borderStyle: 'solid', borderColor: `${color} transparent transparent transparent` };
          // Simplified arrow for MVP - CSS pseudo elements tricky in inline styles, ignoring arrow visual for now or just using simple box
          default: return {};
      }
  }

  return (
    <div 
        style={styles.container}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        role="tooltip"
        aria-hidden={!isVisible}
    >
      {children}
      <div style={styles.tooltip}>
        {content}
      </div>
    </div>
  );
};

export default Tooltip;
