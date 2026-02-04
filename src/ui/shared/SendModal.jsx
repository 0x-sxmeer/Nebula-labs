import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Loader } from 'lucide-react';
import { useSendTransaction, useWaitForTransactionReceipt, useConfig } from 'wagmi';
import { parseEther, isAddress } from 'viem';

const SendModal = ({ isOpen, onClose, selectedAsset }) => {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    
    const { sendTransaction, isPending, data: hash } = useSendTransaction();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const handleSend = async (e) => {
        e.preventDefault();
        setError('');

        if (!isAddress(recipient)) {
            setError('Invalid ERC-20 address');
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setError('Invalid amount');
            return;
        }

        try {
            // NOTE: For a real app, we need to distinguish between ETH (sendTransaction)
            // and ERC20 tokens (writeContract with approve/transfer).
            // For this layout demo, we'll simulate ETH transfer logic for simplicity
            // or assume native token if selectedAsset is not passed.
            // Complex ERC20 logic requires ABI and `useWriteContract`.
            
            sendTransaction({ 
                to: recipient, 
                value: parseEther(amount) 
            });
        } catch (err) {
            setError('Transaction failed to initiate');
            console.error(err);
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
                        maxWidth: '480px',
                        background: '#13131A',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        padding: '32px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
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
                        }}
                    >
                        <X size={24} />
                    </button>

                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '24px', color: 'white' }}>Send Assets</h2>

                    {isConfirmed ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                             <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#4CAF50', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                 <ArrowRight size={32} />
                             </div>
                             <h3>Transfer Successful!</h3>
                             <p style={{ color: '#888', marginTop: '8px' }}>Hash: {hash?.substring(0,6)}...{hash?.substring(hash.length-4)}</p>
                             <button 
                                onClick={onClose}
                                style={{ marginTop: '24px', padding: '12px 24px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', border: 'none', color: 'white', cursor: 'pointer' }}
                            >
                                Close
                             </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '0.9rem' }}>Recipient Address</label>
                                <input 
                                    type="text"
                                    placeholder="0x..."
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '16px',
                                        padding: '16px',
                                        color: 'white',
                                        outline: 'none',
                                        fontSize: '1rem',
                                        fontFamily: 'monospace'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '0.9rem' }}>Amount</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '16px',
                                            padding: '16px',
                                            color: 'white',
                                            outline: 'none',
                                            fontSize: '1.5rem',
                                            fontWeight: 600
                                        }}
                                    />
                                    <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#888' }}>
                                        ETH
                                    </div>
                                </div>
                            </div>

                            {error && <div style={{ color: '#FF4444', fontSize: '0.9rem' }}>{error}</div>}

                            <button 
                                type="submit"
                                disabled={isPending || isConfirming}
                                style={{
                                    background: '#FF4081',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '16px',
                                    padding: '18px',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    opacity: (isPending || isConfirming) ? 0.7 : 1,
                                    marginTop: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    transition: 'transform 0.1s'
                                }}
                            >
                                {isPending ? 'Confirming in Wallet...' : isConfirming ? 'Processing...' : 'Send'}
                                {(isPending || isConfirming) && <Loader className="spin" size={20} />}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SendModal;
