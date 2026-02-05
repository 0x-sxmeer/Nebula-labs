import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../ui/sections/Header';

const PrivacyPage = () => {
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
                <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#10b981' }}>
                    <ShieldCheck size={24} />
                </div>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Privacy Policy</h1>
            </div>
            <p style={{ color: '#888' }}>Last Updated: February 2026</p>
          </div>

          <div className="legal-content" style={{ color: '#ccc', lineHeight: '1.6' }}>
            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '16px' }}>1. Data Collection</h2>
                <p>We respect your privacy. As a decentralized application (DApp):</p>
                <ul style={{ listStyle: 'disc', paddingLeft: '24px', marginTop: '12px' }}>
                    <li style={{ marginBottom: '8px' }}>We do not collect personal identification information (PII).</li>
                    <li style={{ marginBottom: '8px' }}>We do not store IP addresses or user behavior data.</li>
                    <li style={{ marginBottom: '8px' }}>Wallet addresses are processed only for the purpose of executing transactions.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '16px' }}>2. Third-Party Services</h2>
                <p>This interface interacts with third-party protocols (such as Li.Fi, RPC providers, and wallet providers). These services may have their own privacy policies regarding data collection.</p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ color: 'white', fontSize: '1.4rem', marginBottom: '16px' }}>3. Local Storage</h2>
                <p>We use local storage on your device solely to save your preferences (such as theme or slippage settings) and recent transaction history for your convenience.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPage;
