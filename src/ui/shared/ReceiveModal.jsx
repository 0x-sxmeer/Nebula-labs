import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, QrCode } from 'lucide-react';

const ReceiveModal = ({ isOpen, onClose, address }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(8px)',
                        cursor: 'pointer'
                    }}
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '400px',
                        background: '#13131A',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        padding: '32px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        textAlign: 'center'
                    }}
                >
                    <button 
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <X size={24} />
                    </button>

                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        color: '#FF4081'
                    }}>
                        <QrCode size={32} />
                    </div>

                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px', color: 'white' }}>Receive Assets</h2>
                    <p style={{ color: '#888', marginBottom: '32px', fontSize: '0.9rem' }}>
                        Scan this QR code or copy the address below to receive tokens.
                    </p>

                    {/* QR Code Placeholder (Generated via API for now, or just placeholder style) */}
                    <div style={{
                        background: 'white',
                        padding: '16px',
                        borderRadius: '16px',
                        display: 'inline-block',
                        marginBottom: '32px'
                    }}>
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${address}`} 
                            alt="Wallet Address QR" 
                            style={{ width: '180px', height: '180px', display: 'block' }}
                        />
                    </div>

                    {/* Address Box */}
                    <div 
                        onClick={handleCopy}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        <div style={{ 
                            fontSize: '0.9rem', 
                            color: '#ccc', 
                            fontFamily: 'monospace', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {address}
                        </div>
                        <div style={{ color: copied ? '#4CAF50' : '#888' }}>
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </div>
                    </div>
                    {copied && <div style={{ color: '#4CAF50', fontSize: '0.8rem', marginTop: '8px' }}>Copied to clipboard!</div>}

                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ReceiveModal;
