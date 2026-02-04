import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

const TokenSelector = ({ selectedToken, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const tokens = [
        { symbol: 'ETH', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png' },
        { symbol: 'USDC', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
        { symbol: 'USDT', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
        { symbol: 'DAI', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png' },
        { symbol: 'WETH', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png' }
    ];

    const filteredTokens = tokens.filter(t => 
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ position: 'relative' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px', 
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '2rem',
                    padding: '0.5rem 1rem',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: '100px'
                }}
            >
                <img src={selectedToken.logo} alt={selectedToken.symbol} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                {selectedToken.symbol}
                <ChevronDown size={14} />
            </button>

            {isOpen && (
                <>
                    <div style={{
                        position: 'absolute',
                        top: '120%',
                        right: 0,
                        width: '300px',
                        background: '#1a1b1e',
                        border: '1px solid #333',
                        borderRadius: '1rem',
                        padding: '1rem',
                        zIndex: 100,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#666' }} />
                            <input 
                                type="text" 
                                placeholder="Search token..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: '#111',
                                    border: '1px solid #333',
                                    borderRadius: '0.5rem',
                                    padding: '0.6rem 0.6rem 0.6rem 2.2rem',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {filteredTokens.map((t) => (
                                <div 
                                    key={t.symbol}
                                    onClick={() => { onSelect(t); setIsOpen(false); setSearchQuery(''); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '0.6rem',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        background: selectedToken.symbol === t.symbol ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = selectedToken.symbol === t.symbol ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}
                                >
                                    <img src={t.logo} alt={t.symbol} style={{ width: 26, height: 26, borderRadius: '50%' }} />
                                    <div style={{ fontWeight: 600 }}>{t.symbol}</div>
                                    {selectedToken.symbol === t.symbol && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#ff7120' }}></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                </>
            )}
        </div>
    );
};

export default TokenSelector;
