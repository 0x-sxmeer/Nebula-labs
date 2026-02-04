import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Wallet, RefreshCw, ArrowUpRight, ArrowDownLeft, Plus, MoreHorizontal, 
    Layers, PieChart, TrendingUp, Search, SlidersHorizontal, ArrowDown, ExternalLink, Box
} from 'lucide-react';
import { useAccount } from 'wagmi';
import usePortfolio from '../hooks/usePortfolio';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import PortfolioChart from '../ui/shared/PortfolioChart';
import { Link, useNavigate } from 'react-router-dom';

// Components
import Navbar from '../ui/shared/Navbar';
import Footer from '../ui/shared/Footer';
import FloatingBubbles from '../ui/effects/FloatingBubbles';
import Sparkline from '../ui/shared/Sparkline';
import AllocationChart from '../ui/shared/AllocationChart';
import GasWatcher from '../ui/shared/GasWatcher';

// Modals
import ReceiveModal from '../ui/shared/ReceiveModal';
import SendModal from '../ui/shared/SendModal';

const PortfolioPage = () => {
    const { isConnected, address } = useAccount();
    const { assets, totalNetWorth, isLoading, refetch } = usePortfolio();
    const [activeTab, setActiveTab] = useState('Tokens');
    const [hideSmallBalances, setHideSmallBalances] = useState(false);
    const navigate = useNavigate();

    // Modal States
    const [isReceiveOpen, setIsReceiveOpen] = useState(false);
    const [isSendOpen, setIsSendOpen] = useState(false);

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    const formatBalance = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(val);

    // Filter Assets based on toggle
    const displayedAssets = hideSmallBalances 
        ? assets.filter(a => a.valueUSD > 1.00) 
        : assets;

    // Mock 24h change
    const change24h = -0.54; 
    const isPositive = change24h >= 0;

    return (
        <div style={{
            position: 'relative',
            minHeight: '100vh',
            width: '100%',
            background: 'linear-gradient(180deg, var(--bg-void) 0%, var(--bg-dark) 100%)',
        }}>
            <FloatingBubbles />
            
            {/* Modals */}
            <ReceiveModal isOpen={isReceiveOpen} onClose={() => setIsReceiveOpen(false)} address={address} />
            <SendModal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} />
            
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                
                <main style={{
                    flex: 1,
                    paddingTop: '60px',
                    paddingBottom: '80px',
                    maxWidth: '1280px',
                    width: '100%',
                    margin: '0 auto',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    fontFamily: 'var(--font-body, "Inter", sans-serif)',
                    color: '#fff'
                }}>
                    {!isConnected ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                             <ConnectButton />
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '40px', marginTop: '40px' }}>
                            
                            {/* LEFT COLUMN: Main Content */}
                            <div>
                                 {/* Header: Net Worth & Chart */}
                                 <div style={{ marginBottom: '40px' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
                                        <h1 style={{ 
                                            fontSize: '3.5rem', 
                                            fontWeight: 700, 
                                            margin: 0,
                                            letterSpacing: '-0.03em',
                                            background: 'linear-gradient(to right, #fff, #bbb)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent'
                                        }}>
                                            {formatCurrency(totalNetWorth)}
                                        </h1>
                                        <span style={{ 
                                            fontSize: '1.25rem', 
                                            color: isPositive ? '#4CAF50' : '#FF4444', 
                                            fontWeight: 600,
                                            background: isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                                            padding: '4px 12px',
                                            borderRadius: '20px'
                                        }}>
                                            {isPositive ? '+' : ''}{change24h}%
                                        </span>
                                    </div>

                                    {/* Chart Area */}
                                    <div style={{ height: '320px', marginBottom: '40px', marginLeft: '-10px' }}>
                                        <PortfolioChart data={null} color={isPositive ? '#4CAF50' : '#FF4444'} height={320} />
                                    </div>

                                    {/* Tabs */}
                                    <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '32px' }}>
                                        {['Tokens', 'NFTs', 'Activity'].map(tab => (
                                            <button 
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: '16px 0',
                                                    color: activeTab === tab ? '#fff' : '#888',
                                                    borderBottom: activeTab === tab ? '3px solid #FF4081' : '3px solid transparent',
                                                    cursor: 'pointer',
                                                    fontSize: '1.1rem',
                                                    fontWeight: 600,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content */}
                                    {activeTab === 'Tokens' && (
                                        <div className="animate-fade-in">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                                <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Assets</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    {/* Toggle Small Balances */}
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#aaa', fontSize: '0.9rem' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={hideSmallBalances}
                                                            onChange={(e) => setHideSmallBalances(e.target.checked)}
                                                            style={{ accentColor: '#FF4081' }} 
                                                        />
                                                        Hide small balances
                                                    </label>
                                                    
                                                    <button style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', padding: '10px', color: '#fff', cursor: 'pointer' }}>
                                                        <Search size={20} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {displayedAssets.map((asset, i) => (
                                                    <div 
                                                        key={`${asset.chainId}-${asset.symbol}`}
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'minmax(200px, 1.5fr) 120px 1fr 1fr',
                                                            alignItems: 'center',
                                                            padding: '16px 20px',
                                                            borderRadius: '20px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            background: 'rgba(255,255,255,0.02)',
                                                            border: '1px solid rgba(255,255,255,0.03)'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <div style={{ position: 'relative' }}>
                                                                <img 
                                                                    src={asset.logo} 
                                                                    alt={asset.symbol} 
                                                                    style={{ width: '42px', height: '42px', borderRadius: '50%' }} 
                                                                    onError={(e) => e.target.src = 'https://via.placeholder.com/36'}
                                                                />
                                                                <img 
                                                                    src={`https://cryptologos.cc/logos/${asset.chainName.toLowerCase() === 'ethereum' ? 'ethereum-eth-logo' : asset.chainName.toLowerCase() === 'polygon' ? 'polygon-matic-logo' : 'ethereum-eth-logo'}.png`}
                                                                    style={{ width: '16px', height: '16px', position: 'absolute', bottom: -1, right: -1, borderRadius: '50%', border: '2px solid #13131A' }} 
                                                                    onError={(e) => e.target.style.display = 'none'}
                                                                />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{asset.symbol}</div>
                                                                <div style={{ fontSize: '0.85rem', color: '#888' }}>{asset.name}</div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Sparkline Column */}
                                                        <div>
                                                            <Sparkline isPositive={i % 2 === 0} width={80} height={30} />
                                                        </div>

                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 500 }}>{formatCurrency(asset.priceUSD)}</div>
                                                            <div style={{ color: i % 2 === 0 ? '#4CAF50' : '#FF4444', fontSize: '0.85rem' }}>
                                                                {i % 2 === 0 ? '+' : ''}{Math.floor(Math.random() * 5)}.{Math.floor(Math.random() * 9)}%
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatCurrency(asset.valueUSD)}</div>
                                                            <div style={{ color: '#888', fontSize: '0.85rem' }}>{formatBalance(asset.balance)} {asset.symbol}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {displayedAssets.length === 0 && !isLoading && (
                                                    <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
                                                        <p>No tokens found with current filter.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'NFTs' && (
                                        <div style={{ padding: '80px', textAlign: 'center', color: '#888', background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>
                                            <Box size={56} style={{ opacity: 0.3, marginBottom: '24px' }} />
                                            <h3>Your Gallery is Empty</h3>
                                            <p>Collect digital art to see them here.</p>
                                        </div>
                                    )}

                                    {activeTab === 'Activity' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {/* Mock Activity or Block Explorer Link */}
                                            <div style={{ 
                                                padding: '32px', 
                                                background: 'rgba(255,255,255,0.02)', 
                                                borderRadius: '24px',
                                                display: 'flex', 
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                border: '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                    <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <ExternalLink size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: '1.2rem' }}>On-Chain History</h4>
                                                        <p style={{ margin: '4px 0 0', color: '#888', fontSize: '0.95rem' }}>View comprehensive transaction log on explorer</p>
                                                    </div>
                                                </div>
                                                <a 
                                                    href={`https://etherscan.io/address/${address}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    style={{ 
                                                        color: '#13131A', 
                                                        background: '#fff',
                                                        padding: '12px 24px',
                                                        borderRadius: '12px',
                                                        textDecoration: 'none', 
                                                        fontWeight: 700 
                                                    }}
                                                >
                                                    Open Explorer
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                 </div>
                            </div>

                            {/* RIGHT COLUMN: Sidebar (Actions & Activity) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                {/* Profile Card */}
                                <div style={{ 
                                    background: 'rgba(255,255,255,0.03)', 
                                    padding: '24px', 
                                    borderRadius: '24px', 
                                    border: '1px solid rgba(255,255,255,0.05)' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                             <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #FF6B35, #A044FF)', borderRadius: '50%' }} />
                                             <div>
                                                 <div style={{ fontSize: '0.8rem', color: '#888' }}>Connected as</div>
                                                 <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                                     {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'Wallet'}
                                                 </div>
                                             </div>
                                         </div>
                                    </div>
                                    
                                    {/* Action Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <ActionButton icon={<ArrowDownLeft size={20} />} label="Receive" color="#4CAF50" onClick={() => setIsReceiveOpen(true)} />
                                        <ActionButton icon={<ArrowUpRight size={20} />} label="Send" color="#2196F3" onClick={() => setIsSendOpen(true)} />
                                        <ActionButton icon={<Wallet size={20} />} label="Buy" color="#FF4081" onClick={() => navigate('/swap')} />
                                        <ActionButton icon={<MoreHorizontal size={20} />} label="More" color="#9C27B0" onClick={() => {}} />
                                    </div>
                                </div>

                                {/* Asset Allocation - NEW */}
                                <div style={{ 
                                    background: 'rgba(255,255,255,0.03)', 
                                    padding: '24px', 
                                    borderRadius: '24px', 
                                    border: '1px solid rgba(255,255,255,0.05)' 
                                }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>Allocation</h3>
                                    <AllocationChart assets={assets} />
                                </div>

                                {/* Gas Watcher - NEW */}
                                <GasWatcher />

                                {/* Stats Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                     <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                         <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '8px' }}>Weekly Swaps</div>
                                         <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>4</div>
                                     </div>
                                     <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                         <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '8px' }}>Volume</div>
                                         <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>$12k</div>
                                     </div>
                                </div>
                            </div>

                        </div>
                    )}
                </main>
                <Footer />
            </div>
        </div>
    );
};

// Sub-components
const ActionButton = ({ icon, label, color, onClick }) => (
    <div 
        onClick={onClick}
        style={{ 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '20px', 
            padding: '20px', 
            cursor: 'pointer',
            transition: 'background 0.2s',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    >
        <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: color, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white'
        }}>
            {icon}
        </div>
        <span style={{ fontWeight: 600 }}>{label}</span>
    </div>
);

const ActivityItem = ({ type, label, date }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={14} />
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{type}</div>
            <div style={{ fontSize: '0.85rem', color: '#888' }}>{label}</div>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#666' }}>{date}</div>
    </div>
);

export default PortfolioPage;
