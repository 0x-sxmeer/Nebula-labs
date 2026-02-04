import React, { useRef, useEffect } from 'react';
import { Reveal, ScrambleText } from '../effects/Animations';
import { RGBShader } from '../effects/RGBShader';

import { ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

// Draggable Floating Token Component with JS-based "True Wandering"


const Hero = () => {
    const partners = [
        { name: 'Chainlink', url: 'https://cdn.prod.website-files.com/6649e26c9fdc8739cefdc48e/6649fe6e46e4c0897ba16dad_chainlink.svg' },
        { name: 'Tron', url: 'https://cdn.prod.website-files.com/6649e26c9fdc8739cefdc48e/6649fe829a33b78ff150781b_tron.svg' },
        { name: 'BNB', url: 'https://cdn.prod.website-files.com/6649e26c9fdc8739cefdc48e/6649ff0cc51fe67c684cfad9_bnb.svg' },
        { name: 'OKX', url: 'https://cdn.prod.website-files.com/6649e26c9fdc8739cefdc48e/6649ff13b42127ac50ff5b0c_okx.svg' },
        { name: 'Solana', url: 'https://cdn.prod.website-files.com/6649e26c9fdc8739cefdc48e/667a8ba654f957df625d0d4a_solana.svg' }
    ];

    return (
        <section 
            id="hero-section"
            style={{ 
            padding: '140px 20px 0', 
            textAlign: 'center', 
            position: 'relative', 
            minHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden', 
        }}>
            {/* RGB Shader Background */}
            {/* RGB Shader Background - REMOVED FOR PERFORMANCE */}
            {/* RGB Shader Background with Grid Overlay & Stars */}
            <div style={{
                position: 'absolute',
                top: '-30%',
                left: 0,
                width: '100%',
                height: '130%',
                zIndex: -2,
                overflow: 'hidden',
                maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                // Fallback static gradient
                background: 'radial-gradient(circle at 50% 30%, rgba(60, 20, 100, 0.4) 0%, transparent 70%)',
            }}>
                <RGBShader />
            </div>
            
            {/* Tech Grid Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: `
                    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
                maskImage: 'radial-gradient(circle at 50% 50%, black 0%, transparent 80%)',
                zIndex: -1,
                pointerEvents: 'none',
            }} />

            {/* Simulated Stars - Optimized */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'radial-gradient(1px 1px at 10% 10%, white 100%, transparent), radial-gradient(1px 1px at 20% 50%, white 100%, transparent), radial-gradient(2px 2px at 80% 10%, white 100%, transparent), radial-gradient(1px 1px at 90% 80%, white 100%, transparent)',
                opacity: 0.3,
                animation: 'twinkle 8s infinite alternate',
                zIndex: -1,
                willChange: 'opacity',
            }} />

            {/* Ambient glow orb - Optimized (No Blur Filter) */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120%',
                height: '100%',
                background: 'radial-gradient(circle at 50% 40%, rgba(139, 92, 246, 0.08) 0%, rgba(255, 107, 53, 0.05) 30%, transparent 60%)',
                pointerEvents: 'none',
                zIndex: -1,
            }} />

            {/* Badge */}
            <Reveal>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255, 107, 53, 0.1)',
                    border: '1px solid rgba(255, 107, 53, 0.25)',
                    borderRadius: '100px',
                    padding: '8px 18px',
                    marginBottom: '2rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                }}>
                    <Zap size={14} />
                    Cross-Chain DeFi Aggregator
                </div>
            </Reveal>

            {/* Main Heading */}
            <Reveal>
                <h1 style={{ 
                    fontSize: 'clamp(3rem, 10vw, 8rem)', 
                    lineHeight: 0.95, 
                    marginBottom: '2rem', 
                    textTransform: 'uppercase',
                    letterSpacing: '-0.04em',
                    fontWeight: 800,
                    fontFamily: 'var(--font-heading)',
                    textShadow: '0 0 80px rgba(255, 255, 255, 0.1)',
                }}>
                    <span style={{ 
                        display: 'block',
                        background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.7) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        SWAP
                    </span>
                    <span style={{ 
                        display: 'block',
                        background: 'linear-gradient(135deg, #FF6B35 0%, #FF9F43 50%, #FF6B35 100%)',
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 30px rgba(255, 107, 53, 0.4))',
                        animation: 'gradientFlow 3s linear infinite',
                    }}>
                        SMARTER
                    </span>
                </h1>
                
            </Reveal>

            {/* Subheadline */}
            <Reveal delay={0.1}>
                <p style={{ 
                    maxWidth: '600px', 
                    margin: '0 auto 3rem', 
                    fontSize: '1.25rem', 
                    color: 'var(--text-secondary)', 
                    lineHeight: 1.6,
                    fontWeight: 400,
                    letterSpacing: '0.01em',
                }}>
                    Get the best rates across 40+ DEXs and bridges. Zero slippage, maximum returns. 
                    <span style={{ 
                        color: 'white', 
                        fontWeight: 600,
                        textShadow: '0 0 20px rgba(255, 107, 53, 0.3)'
                    }}> Powered by intelligent routing.</span>
                </p>
            </Reveal>
            {/* Glassmorphic Preview Cards */}
            <div style={{
                position: 'absolute',
                bottom: '20%',
                right: '5%',
                width: '240px',
                height: '130px',
                background: 'rgba(255, 255, 255, 0.02)', // Slightly more transparent
                backdropFilter: 'blur(6px)', // Reduced blur for performance
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                transform: 'rotate(-5deg) translateZ(0)', // Force GPU layer
                zIndex: -1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // boxShadow: '0 10px 30px rgba(0,0,0,0.3)', // Removed for performance
                animation: 'float 8s ease-in-out infinite',
                willChange: 'transform', // Ensure browser knows this moves
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px' }}>Current APY</div>
                    {/* Removed textShadow for performance on moving element */}
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10B981' }}>12.4%</div> 
                </div>
            </div>

            <div style={{
                position: 'absolute',
                bottom: '25%',
                left: '5%',
                width: '220px',
                height: '110px',
                background: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                transform: 'rotate(5deg) translateZ(0)', // Force GPU layer
                zIndex: -1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // boxShadow: '0 10px 30px rgba(0,0,0,0.3)', // Removed for performance
                animation: 'float 9s ease-in-out infinite 0.5s reverse',
                willChange: 'transform', // Ensure browser knows this moves
            }}>
                 <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px' }}>Total Volume</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>$2.4B+</div>
                </div>
            </div>
            
            {/* CTA Buttons */}
            <Reveal delay={0.2}>
                <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    marginBottom: '5rem',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                }}>
                    {/* Primary CTA */}
                    <Link to="/swap" style={{ textDecoration: 'none' }}>
                        <button style={{
                            background: 'var(--primary-gradient)',
                            border: 'none',
                            padding: '16px 36px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'white',
                            textTransform: 'uppercase',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer',
                            letterSpacing: '0.03em',
                            borderRadius: '14px',
                            boxShadow: '0 4px 25px rgba(255, 107, 53, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 8px 40px rgba(255, 107, 53, 0.5)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 25px rgba(255, 107, 53, 0.35)';
                        }}
                        >
                            <ScrambleText text="Launch App" />
                            <ArrowRight size={18} />
                        </button>
                    </Link>

                    {/* Secondary CTA */}
                    <button style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        padding: '16px 36px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'white',
                        textTransform: 'uppercase',
                        transition: 'all 0.3s',
                        cursor: 'pointer',
                        letterSpacing: '0.03em',
                        borderRadius: '14px',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    >
                        <ScrambleText text="Learn More" />
                    </button>
                </div>
            </Reveal>

            {/* Stats Row */}
            <Reveal delay={0.3}>
                <div style={{
                    display: 'flex',
                    gap: '3rem',
                    justifyContent: 'center',
                    marginBottom: '4rem',
                    flexWrap: 'wrap',
                }}>
                    <Stat value="$2.4B+" label="Trading Volume" />
                    <Stat value="40+" label="Chains Supported" />
                    <Stat value="150+" label="DEXs Integrated" />
                    <Stat value="0.1%" label="Average Fee" />
                </div>
            </Reveal>

            {/* Partner Logos */}
            <div style={{ 
                width: '100%',
                borderTop: '1px solid rgba(255,255,255,0.06)', 
                borderBottom: '1px solid rgba(255,255,255,0.06)', 
                padding: '2rem 0', 
                background: 'rgba(255, 255, 255, 0.01)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5rem',
                flexWrap: 'wrap',
                overflow: 'hidden',
                marginTop: 'auto',
            }}>
                <div style={{ display: 'flex', gap: '5rem', animation: 'scroll 25s linear infinite' }}>
                    {partners.concat(partners).map((p, i) => (
                        <img 
                            key={i}
                            src={p.url} 
                            alt={p.name} 
                            style={{ 
                                height: '28px', 
                                opacity: 0.5, 
                                filter: 'invert(1) grayscale(100%)',
                                transition: 'opacity 0.3s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                        />
                    ))}
                </div>
                <style>{`
                    @keyframes scroll {
                        from { transform: translateX(0); }
                        to { transform: translateX(-50%); }
                    }
                    @keyframes twist {
                        0% { transform: scale(1) rotate(0deg); }
                        100% { transform: scale(1.1) rotate(5deg); }
                    }
                    @keyframes float {
                        0%, 100% { transform: translateY(0px) rotate(0deg); }
                        50% { transform: translateY(-20px) rotate(5deg); }
                    }
                    @keyframes rotateSlow {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes twinkle {
                        0% { opacity: 0.3; transform: scale(1); }
                        50% { opacity: 0.8; transform: scale(1.2); }
                        100% { opacity: 0.3; transform: scale(1); }
                    }
                    @keyframes gradientFlow {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                `}</style>
            </div>
        </section>
    )
}

// Stats Component
const Stat = ({ value, label }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ 
            fontSize: '2rem', 
            fontWeight: 800, 
            fontFamily: 'var(--font-heading)',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '4px',
        }}>
            {value}
        </div>
        <div style={{ 
            fontSize: '0.85rem', 
            color: '#606065',
            fontWeight: 500,
        }}>
            {label}
        </div>
    </div>
);

export default Hero;
