import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../ui/sections/Header';

const TermsPage = () => {
  return (
    <div className="page-container">
      <Header />
      
      <div className="content-wrapper" style={{ paddingTop: '100px', maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
        <Link to="/" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', marginBottom: '24px', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Back to App
        </Link>
        
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="legal-card"
            style={{ 
                background: 'rgba(20, 20, 22, 0.6)', 
                backdropFilter: 'blur(10px)', 
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '24px',
                padding: '40px'
            }}
        >
          <div className="legal-header" style={{ marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: '#3b82f6' }}>
                    <FileText size={24} />
                </div>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Terms of Service</h1>
            </div>
            <p style={{ color: '#888' }}>Last Updated: February 2026</p>
          </div>

          <div className="legal-content" style={{ color: '#ccc', lineHeight: '1.6' }}>
            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '16px' }}>1. Acceptance of Terms</h2>
                <p>By accessing and using this interface, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '16px' }}>2. Description of Service</h2>
                <p>This application is a user interface for accessing decentralized finance protocols. It does not control, manage, or hold custody of your assets. You retain full control of your private keys and assets at all times.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '16px' }}>3. Risks</h2>
                <p>Using blockchain protocols involves significant risks, including but not limited to:</p>
                <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginTop: '12px' }}>
                    <li style={{ marginBottom: '8px' }}>Smart contract vulnerabilities</li>
                    <li style={{ marginBottom: '8px' }}>Market volatility and slippage</li>
                    <li style={{ marginBottom: '8px' }}>Loss of private keys</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '16px' }}>4. No Financial Advice</h2>
                <p>Content on this interface is for informational purposes only and does not constitute financial, investment, or legal advice.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsPage;
