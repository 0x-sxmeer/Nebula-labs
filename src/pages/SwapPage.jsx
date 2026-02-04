import React from 'react';
import Navbar from '../ui/shared/Navbar';
import Footer from '../ui/shared/Footer';
import FloatingBubbles from '../ui/effects/FloatingBubbles';
import SwapCard from '../ui/sections/SwapCard';
import { Reveal } from '../ui/effects/Animations';
import { Zap, Shield, TrendingUp } from 'lucide-react';

const SwapPage = () => {
    return (
        <div style={{ 
            position: 'relative', 
            minHeight: '100vh', 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            background: 'linear-gradient(180deg, var(--bg-void) 0%, var(--bg-dark) 100%)',
        }}>
            <FloatingBubbles />
            
            {/* Ambient background glow - Optimized (No Blur Filter) */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100vw',
                height: '100vh',
                background: 'radial-gradient(circle at 50% 30%, rgba(255, 107, 53, 0.05) 0%, transparent 50%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />
            
            <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Navbar />
                
                <main style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '100px 20px 80px',
                    minHeight: 'calc(100vh - 280px)'
                }}>
                   <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {/* Header Section */}
                        <Reveal>
                            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                                {/* Badge */}
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(255, 107, 53, 0.1)',
                                    border: '1px solid rgba(255, 107, 53, 0.2)',
                                    borderRadius: '100px',
                                    padding: '6px 14px',
                                    marginBottom: '1.25rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: 'var(--primary)',
                                }}>
                                    <Zap size={12} />
                                    Powered by LI.FI
                                </div>
                                
                                {/* Title */}
                                <h1 style={{ 
                                    fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', 
                                    fontWeight: 800, 
                                    marginBottom: '0.75rem',
                                    fontFamily: 'var(--font-heading)',
                                    letterSpacing: '-0.02em',
                                    lineHeight: 1.1,
                                }}>
                                    <span style={{
                                        background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.8) 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}>
                                        SWAP 
                                    </span>
                                    <span style={{
                                        background: 'var(--primary-gradient)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        marginLeft: '0.4rem',
                                    }}>
                                        AGGREGATOR
                                    </span>
                                </h1>
                                
                                {/* Subtitle */}
                                <p style={{ 
                                    color: 'var(--text-secondary)', 
                                    fontSize: '1.05rem', 
                                    maxWidth: '550px', 
                                    margin: '0 auto',
                                    lineHeight: 1.6,
                                }}>
                                    Best rates from 150+ DEXs across 40+ chains.
                                    <span style={{ color: 'var(--success)', fontWeight: 500 }}> Zero extra fees</span> on native token swaps.
                                </p>
                            </div>
                        </Reveal>

                        {/* SwapCard */}
                        <Reveal delay={0.15}>
                            <SwapCard />
                        </Reveal>

                        {/* Trust Badges */}
                        <Reveal delay={0.3}>
                            <div style={{
                                display: 'flex',
                                gap: '2rem',
                                marginTop: '2.5rem',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                            }}>
                                <TrustBadge icon={<Shield size={16} />} text="Audited Smart Contracts" />
                                <TrustBadge icon={<TrendingUp size={16} />} text="Best Price Guarantee" />
                                <TrustBadge icon={<Zap size={16} />} text="Instant Execution" />
                            </div>
                        </Reveal>
                   </div>
                </main>

                <Footer />
            </div>
        </div>
    );
};

// Trust Badge Component
const TrustBadge = ({ icon, text }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        fontWeight: 500,
    }}>
        <div style={{ color: 'var(--primary)', opacity: 0.7 }}>
            {icon}
        </div>
        {text}
    </div>
);

export default SwapPage;
