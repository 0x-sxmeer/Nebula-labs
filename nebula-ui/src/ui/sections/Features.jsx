import React, { useRef, useEffect } from 'react';
import { Reveal } from '../effects/Animations';
import { GlowingCard } from '../shared/GlowingCard';
import { Zap, Shield, TrendingUp, Layers, ArrowUpRight } from 'lucide-react';

const Features = () => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(e => console.warn("Force play failed:", e));
        }
    }, []);

  return (
    <section style={{ 
        padding: '8rem 48px', 
        maxWidth: '1440px', 
        margin: '0 auto',
        position: 'relative',
    }}>
      {/* Section Header */}
      <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end', 
          marginBottom: '5rem', 
          flexWrap: 'wrap', 
          gap: '2rem' 
      }}>
        <Reveal>
            <div>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 107, 53, 0.1)',
                    border: '1px solid rgba(255, 107, 53, 0.2)',
                    borderRadius: '100px',
                    padding: '6px 14px',
                    marginBottom: '1.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    letterSpacing: '0.5px',
                }}>
                    <Zap size={12} />
                    WHY CHOOSE US
                </div>
                <h2 style={{ 
                    fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', 
                    lineHeight: 1.05, 
                    fontWeight: 800, 
                    letterSpacing: '-0.03em',
                    fontFamily: 'var(--font-heading)',
                }}>
                    <span style={{
                        background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.7) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        SUPERCHARGING<br/>
                    </span>
                    <span style={{
                        background: 'var(--primary-gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        WEB3 BUILDERS
                    </span>
                </h2>
            </div>
        </Reveal>
        
        <Reveal delay={0.2}>
            <div style={{ textAlign: 'right' }}>
                <div style={{ 
                    fontSize: '0.75rem', 
                    marginBottom: '1rem', 
                    fontWeight: 600, 
                    letterSpacing: '1.5px', 
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                }}>
                    Focus Areas
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {['DeFi', 'Cross-Chain', 'Aggregation', 'MEV Protection'].map(tag => (
                        <span key={tag} style={{ 
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)', 
                            padding: '8px 16px', 
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            borderRadius: '10px',
                            transition: 'all 0.3s',
                            cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.3)';
                            e.currentTarget.style.background = 'rgba(255, 107, 53, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </Reveal>
      </div>

      {/* Features Grid */}
      <div className="features-grid" style={{ 
          display: 'grid', 
          gap: '2rem', 
          alignItems: 'stretch'
      }}>
        <Reveal delay={0.3} width="100%">
            <GlowingCard>
                <div style={{ 
                    padding: '2.5rem', 
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '480px'
                }}>
                    <div>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(255, 107, 53, 0.1) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1.5rem',
                        }}>
                            <TrendingUp size={24} style={{ color: 'var(--primary)' }} />
                        </div>
                        <h3 style={{ 
                            fontSize: '1.75rem', 
                            marginBottom: '1rem', 
                            letterSpacing: '-0.02em', 
                            fontWeight: 700,
                            fontFamily: 'var(--font-heading)',
                            lineHeight: 1.2,
                        }}>
                            BEST RATES<br/>
                            <span style={{ color: 'var(--primary)' }}>GUARANTEED</span>
                        </h3>
                        <p style={{ 
                            color: 'var(--text-secondary)', 
                            lineHeight: 1.7, 
                            fontSize: '0.95rem' 
                        }}>
                            Our advanced routing algorithm scans 150+ DEXs across 40+ chains in real-time to find you the optimal swap path.
                        </p>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, marginTop: '2rem' }}>
                        {['Smart Order Routing', 'Split Trading', 'Gas Optimization', 'MEV Protection'].map(item => (
                            <li key={item} style={{ 
                                padding: '12px 0', 
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)', 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.9rem', 
                                fontWeight: 500,
                                color: 'var(--text-secondary)',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                            >
                                {item} 
                                <ArrowUpRight size={14} style={{ color: 'var(--primary)', opacity: 0.7 }} />
                            </li>
                        ))}
                    </ul>
                </div>
            </GlowingCard>
        </Reveal>

        <Reveal delay={0.4} width="100%">
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100%',
                width: '100%',
                position: 'relative',
                minHeight: '400px',
                perspective: '1000px',
            }}>
                <video 
                    ref={videoRef}
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    style={{ 
                        width: '120%', 
                        height: '100%', 
                        maxHeight: '550px',
                        objectFit: 'contain', 
                        pointerEvents: 'none',
                        filter: 'brightness(1.1)',
                        position: 'relative',
                    }}
                >
                    <source src="/robo.webm" type="video/webm" />
                    {/* Fallback to online if local fails (unlikely) */}
                    <source src="https://chaingpt-web.s3.us-east-2.amazonaws.com/assets/video/Labs/LABS_hero_SAFARI_HEVC.mp4" type="video/mp4; codecs=hvc1" />
                </video>
            </div>
        </Reveal>

        <Reveal delay={0.5} width="100%">
            <GlowingCard>
                <div style={{ 
                    padding: '2.5rem', 
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '480px'
                }}>
                    <div>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1.5rem',
                        }}>
                            <Shield size={24} style={{ color: 'var(--success)' }} />
                        </div>
                        <h3 style={{ 
                            fontSize: '1.75rem', 
                            marginBottom: '1rem', 
                            letterSpacing: '-0.02em', 
                            fontWeight: 700,
                            fontFamily: 'var(--font-heading)',
                            lineHeight: 1.2,
                        }}>
                            SECURE &<br/>
                            <span style={{ color: 'var(--success)' }}>TRUSTLESS</span>
                        </h3>
                        <p style={{ 
                            color: 'var(--text-secondary)', 
                            lineHeight: 1.7, 
                            fontSize: '0.95rem' 
                        }}>
                            Non-custodial by design. Your assets stay in your wallet until the moment of swap. Fully audited smart contracts.
                        </p>
                    </div>
                     <ul style={{ listStyle: 'none', padding: 0, marginTop: '2rem' }}>
                        {['Audited Contracts', 'Non-Custodial', 'Transparent Fees', 'Open Source'].map(item => (
                            <li key={item} style={{ 
                                padding: '12px 0', 
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)', 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.9rem', 
                                fontWeight: 500,
                                color: 'var(--text-secondary)',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                            >
                                {item} 
                                <ArrowUpRight size={14} style={{ color: 'var(--success)', opacity: 0.7 }} />
                            </li>
                        ))}
                    </ul>
                </div>
            </GlowingCard>
        </Reveal>
      </div>
      
      <style>{`
          .features-grid {
              grid-template-columns: minmax(280px, 1fr) 28% minmax(280px, 1fr);
          }
          @media (max-width: 1024px) {
              .features-grid {
                  grid-template-columns: 1fr;
              }
          }
      `}</style>
    </section>
  );
};

export default Features;
