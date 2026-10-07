import React, { useCallback, useEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import './GlowingCard.css';

export const GlowingCard = ({ 
    children, 
    className = "", 
    glow = true, 
    disabled = false,
    proximity = 64,
    spread = 80,
    movementDuration = 2,
    inactiveZone = 0.01,
    gradient = null, // Optional custom gradient
    glowColor = null, // Optional custom glow color (for drop-shadow)
}) => {
    const containerRef = useRef(null);
    const borderRef = useRef(null);
    const lastPosition = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef(0);

    const handleMove = useCallback(
      (e) => {
        if (!containerRef.current || !borderRef.current) return;
        
        // Use scroll-adjusted mouse coordinates if event provided, else use last known
        const x = e ? (e.clientX || e.x) : lastPosition.current.x;
        const y = e ? (e.clientY || e.y) : lastPosition.current.y;
        
        if (e) lastPosition.current = { x, y };

        // Debounce via RAF
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        animationFrameRef.current = requestAnimationFrame(() => {
          const element = containerRef.current;
          const borderEl = borderRef.current;
          if (!element || !borderEl) return;

          const rect = element.getBoundingClientRect();
          const { left, top, width, height } = rect;
          const center = [left + width * 0.5, top + height * 0.5];
          
          const mouseX = x;
          const mouseY = y;

          const distanceFromCenter = Math.hypot(mouseX - center[0], mouseY - center[1]);
          const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

          if (distanceFromCenter < inactiveRadius) {
            borderEl.style.setProperty("--active", "0.3");
            return;
          }

          const isActive =
            mouseX > left - proximity &&
            mouseX < left + width + proximity &&
            mouseY > top - proximity &&
            mouseY < top + height + proximity;

          if (gradient) {
            borderEl.style.setProperty("--custom-gradient", gradient);
          }

          if (glowColor) {
              borderEl.style.setProperty("--glow-color", glowColor);
              // Also update the content's static border/shadow if possible, 
              // but we need a ref to content or use CSS variable on container
              containerRef.current.style.setProperty("--base-glow", glowColor);
          }
          
          
          // Always keep a subtle glow (0.3) instead of turning off completely
          borderEl.style.setProperty("--active", isActive ? "1" : "0.3");
          
          // Allow animation to continue even if "inactive" (low opacity) so it doesn't freeze
          if (!isActive) {
               // Optional: Auto-rotate or just return? 
               // For now, let's let it just be static or follow last known position
               // return; 
          }

          const currentAngle = parseFloat(borderEl.style.getPropertyValue("--start")) || 0;
          
          let targetAngle = (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) / Math.PI + 90;

          const angleDiff = ((targetAngle - currentAngle + 180) % 360) - 180;
          const newAngle = currentAngle + angleDiff;

          // Smoothly animate the angle
          animate(currentAngle, newAngle, {
            duration: movementDuration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (value) => {
              borderEl.style.setProperty("--start", String(value));
            },
          });
        });
      },
      [inactiveZone, proximity, movementDuration]
    );

    useEffect(() => {
      if (disabled) return;

      const handleScroll = () => handleMove();
      const handlePointerMove = (e) => handleMove(e);

      window.addEventListener("scroll", handleScroll, { passive: true });
      document.body.addEventListener("pointermove", handlePointerMove, { passive: true });

      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        window.removeEventListener("scroll", handleScroll);
        document.body.removeEventListener("pointermove", handlePointerMove);
      };
    }, [handleMove, disabled]);
  
    // Custom RGB Spectrum Gradient to match the RGB Shader
    const rgbGradient = `
      repeating-conic-gradient(
        from 0deg at 50% 50%,
        #FF0000 0%,
        #FFFF00 16%,
        #00FF00 33%,
        #00FFFF 50%,
        #0000FF 66%,
        #FF00FF 83%,
        #FF0000 100%
      )
    `;

    return (
        <div ref={containerRef} className={`glowing-card-container ${className}`}>
           <div 
             ref={borderRef}
             className="glowing-effect-border"
             style={{
               '--spread': spread,
               '--gradient': rgbGradient,
             }}
           />
           <div className="glowing-card-content">
               {children}
           </div>
        </div>
    );
};

import PropTypes from 'prop-types';

GlowingCard.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    glow: PropTypes.bool,
    disabled: PropTypes.bool,
    proximity: PropTypes.number,
    spread: PropTypes.number,
    movementDuration: PropTypes.number,
    inactiveZone: PropTypes.number,
    gradient: PropTypes.string,
    glowColor: PropTypes.string
};
