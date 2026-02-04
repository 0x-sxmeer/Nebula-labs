import React, { useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConnectWalletButton from './ConnectWalletButton';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinkStyle = {
    textDecoration: 'none',
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    fontWeight: 500,
    padding: '8px 0',
    position: 'relative',
    transition: 'color 0.3s ease',
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '18px 48px',
      background: 'rgba(8, 8, 12, 0.8)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
    }} className="navbar-container">
      
      {/* Logo */}
      <Link to="/" style={{ 
        textDecoration: 'none',
        fontWeight: 700, 
        fontSize: '1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        fontFamily: 'var(--font-heading)', 
        color: 'white', 
        letterSpacing: '-0.03em',
        transition: 'all 0.3s ease'
      }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textShadow = '0 0 30px rgba(255, 107, 53, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textShadow = 'none';
        }}
      >
        <div style={{ 
          width: 32, 
          height: 32, 
          background: 'linear-gradient(135deg, #FF6B35 0%, #F7931A 100%)',
          borderRadius: '10px',
          boxShadow: '0 4px 15px rgba(255, 107, 53, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '0.9rem',
        }}>
          <span style={{ 
            background: 'white', 
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))'
          }}>⚡</span>
        </div>
        LABS
      </Link>

      {/* Desktop Menu */}
      <div style={{ 
        display: 'flex', 
        gap: '2.25rem', 
        alignItems: 'center', 
        fontSize: '0.9rem', 
        fontWeight: 500 
      }} className="desktop-menu">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/swap">Swap</NavLink>
        <NavLink to="/portfolio">Portfolio</NavLink>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          cursor: 'pointer', 
          color: 'var(--text-secondary)',
          transition: 'color 0.3s',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          Ecosystem <ChevronDown size={14} />
        </div>
        <NavLink to="#">Media</NavLink>
        <NavLink to="#">FAQ</NavLink>
      </div>

      <div className="desktop-wallet">
        <ConnectWalletButton />
      </div>

      {/* Mobile Hamburger */}
      <div 
        className="mobile-toggle" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        style={{ 
          cursor: 'pointer', 
          color: 'var(--text-primary)',
          padding: '8px',
          borderRadius: '8px',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          width: '100%',
          background: 'rgba(8, 8, 12, 0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxSizing: 'border-box',
          animation: 'slideDown 0.3s ease-out',
        }}>
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)} style={{ ...navLinkStyle, fontSize: '1.1rem' }}>Home</Link>
          <Link to="/swap" onClick={() => setIsMobileMenuOpen(false)} style={{ ...navLinkStyle, fontSize: '1.1rem' }}>Swap</Link>
          <Link to="/portfolio" onClick={() => setIsMobileMenuOpen(false)} style={{ ...navLinkStyle, fontSize: '1.1rem' }}>Portfolio</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '1.1rem'}}>
            Ecosystem <ChevronDown size={14} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <ConnectWalletButton />
          </div>
        </div>
      )}

      <style>{`
        .mobile-toggle { display: none; }
        .desktop-wallet { display: block; }

        @media (max-width: 1024px) {
          .navbar-container { padding: 16px 20px !important; }
          .desktop-menu { display: none !important; }
          .desktop-wallet { display: none !important; }
          .mobile-toggle { display: block; }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </nav>
  );
};

// Reusable Nav Link Component with hover animation
const NavLink = ({ to, children }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Link 
      to={to}
      style={{
        textDecoration: 'none',
        color: isHovered ? 'var(--primary)' : 'var(--text-secondary)',
        fontSize: '0.9rem',
        fontWeight: 500,
        position: 'relative',
        padding: '4px 0',
        transition: 'color 0.3s ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <span style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: isHovered ? '100%' : '0%',
        height: '2px',
        background: 'var(--primary-gradient)',
        borderRadius: '1px',
        transition: 'width 0.3s ease',
        boxShadow: isHovered ? '0 0 10px var(--primary-glow)' : 'none',
      }} />
    </Link>
  );
};

export default Navbar;
