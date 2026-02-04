import React, { useEffect, useRef } from 'react';

// Simple reveal animation on scroll
export const Reveal = ({ children, delay = 0 }) => {
    const ref = useRef(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }
            },
            { threshold: 0.2 }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div 
            ref={ref} 
            style={{ 
                opacity: 0, 
                transform: 'translateY(30px)', 
                transition: `all 0.6s ease ${delay}s` 
            }}
        >
            {children}
        </div>
    );
};

// Scramble text effect on hover
export const ScrambleText = ({ text }) => {
    const [display, setDisplay] = React.useState(text);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    const scramble = () => {
        let iterations = 0;
        const interval = setInterval(() => {
            setDisplay(
                text.split("").map((letter, index) => {
                    if (index < iterations || letter === " ") return text[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join("")
            );
            if (iterations >= text.length) clearInterval(interval);
            iterations += 0.3;
        }, 30);
    };

    return <span onMouseEnter={scramble}>{display}</span>;
}
