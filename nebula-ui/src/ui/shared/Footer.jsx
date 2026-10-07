import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Github, MessageCircle, Globe } from 'lucide-react';

const Footer = () => {
  const socialLinks = [
    { icon: <Twitter size={18} />, href: '#', label: 'Twitter' },
    { icon: <Github size={18} />, href: '#', label: 'GitHub' },
    { icon: <MessageCircle size={18} />, href: '#', label: 'Discord' },
    { icon: <Globe size={18} />, href: '#', label: 'Website' },
  ];

  const linkStyle = {
    color: 'var(--text-muted)',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  };

  return (
    <footer style={{ 
      padding: '4rem 48px 2rem', 
      background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 100%)',
      borderTop: '1px solid rgba(255, 255, 255, 0.04)',
      position: 'relative',
    }}>
      {/* Top gradient line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '10%',
        right: '10%',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255, 107, 53, 0.3), transparent)',
      }} />

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(280px, 2fr) 1fr 1fr 1fr', 
        gap: '3rem', 
        marginBottom: '4rem',
        maxWidth: '1400px',
        margin: '0 auto 4rem',
      }}>
        {/* Brand Column */}
        <div>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ 
              fontSize: 'clamp(4rem, 12vw, 8rem)', 
              fontFamily: 'var(--font-heading)', 
              fontWeight: 800, 
              lineHeight: 0.85,
              letterSpacing: '-0.04em',
              marginBottom: '1.5rem',
              background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.4) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              LABS
            </div>
          </Link>
          <p style={{ 
            color: 'var(--text-muted)', 
            fontSize: '0.9rem', 
            lineHeight: 1.6,
            maxWidth: '280px',
            marginBottom: '1.5rem',
          }}>
            The most advanced multi-chain DeFi aggregator. Get the best rates across 150+ protocols.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            {socialLinks.map((social, i) => (
              <a 
                key={i} 
                href={social.href}
                aria-label={social.label}
                style={{ 
                  width: 42, 
                  height: 42, 
                  background: 'rgba(255, 255, 255, 0.04)', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-muted)',
                  transition: 'all 0.3s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 107, 53, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.3)';
                  e.currentTarget.style.color = '#FF6B35';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Product Links */}
        <div>
          <h4 style={{ 
            marginBottom: '1.25rem', 
            fontSize: '0.75rem', 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--text-tertiary)', 
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}>
            Product
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, lineHeight: 2.3, fontSize: '0.95rem' }}>
            <li><Link to="/swap" style={linkStyle} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>Swap</Link></li>
            <li><a href="#" style={linkStyle} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>Portfolio</a></li>
            <li><a href="#" style={linkStyle} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>Bridge</a></li>
            <li><a href="#" style={linkStyle} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>Analytics</a></li>
          </ul>
        </div>

        {/* Resources Links */}
        <div>
          <h4 style={{ 
            marginBottom: '1.25rem', 
            fontSize: '0.75rem', 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--text-tertiary)', 
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}>
            Resources
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, lineHeight: 2.3, fontSize: '0.95rem' }}>
            <li><a href="#" style={linkStyle} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>Documentation</a></li>
            <li><a href="#" style={linkStyle} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>Blog</a></li>
            <li><a href="#" style={linkStyle} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>Brand Kit</a></li>
            <li><a href="#" style={linkStyle} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>API</a></li>
          </ul>
        </div>
        
        {/* Support Links */}
        <div>
          <h4 style={{ 
            marginBottom: '1.25rem', 
            fontSize: '0.75rem', 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--text-tertiary)', 
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}>
            Support
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, lineHeight: 2.3, fontSize: '0.95rem' }}>
            <li><a href="#" style={linkStyle} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>Help Center</a></li>
            <li><a href="#" style={linkStyle} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>Contact</a></li>
            <li><a href="#" style={linkStyle} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>Status</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        fontSize: '0.8rem', 
        color: 'var(--text-muted)',
        paddingTop: '2rem', 
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        fontFamily: 'var(--font-mono)',
        maxWidth: '1400px',
        margin: '0 auto',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ opacity: 0.6 }}>
          © 2024 Labs Protocol. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', opacity: 0.6 }}>
          <a href="#" style={{ ...linkStyle, fontSize: '0.8rem' }}>Privacy Policy</a>
          <a href="#" style={{ ...linkStyle, fontSize: '0.8rem' }}>Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
