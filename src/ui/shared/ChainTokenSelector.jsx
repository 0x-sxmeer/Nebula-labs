import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
// import { FixedSizeList } from 'react-window';
import { ChevronDown, Search, X, Zap, TrendingUp, Star, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { lifiService } from '../../services/lifiService';
import { logger } from '../../utils/logger';
import './ChainTokenSelector.css';

import { POPULAR_CHAINS, POPULAR_TOKEN_SYMBOLS, PRIORITY_TOKEN_ADDRESSES } from '../../config/chains';

// Utility to format price nicely (e.g. $1.2M, $0.0001)
const formatPrice = (priceStr) => {
    if (!priceStr) return null;
    const num = parseFloat(priceStr);
    if (isNaN(num)) return null;
    
    // Very small numbers
    if (num < 0.01) return '< $0.01';
    
    // Large formatting with M/B/T
    if (num >= 1_000_000_000_000) return '$' + (num / 1_000_000_000_000).toFixed(2) + 'T';
    if (num >= 1_000_000_000) return '$' + (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return '$' + (num / 1_000_000).toFixed(2) + 'M';
    
    // Standard Formatting
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
};

const TokenItem = React.memo(({ token, isSelected, onSelect }) => (
    <div 
        className={`list-item token-item ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(token)}
    >
        <img 
            src={token.logoURI} 
            className="item-logo" 
            alt={token.symbol}
            loading="lazy"
            onError={(e) => e.target.src = 'https://via.placeholder.com/24'} 
        />
        <div className="item-info">
            <div className="item-symbol">{token.symbol}</div>
            <div className="item-name">{token.name}</div>
        </div>
        {token.priceUSD && (
            <div className="item-price-column">
                <div className="price-val">{formatPrice(token.priceUSD)}</div>
            </div>
        )}
    </div>
));

const ChainItem = React.memo(({ chain, isSelected, onSelect }) => (
    <div 
        className={`list-item chain-item ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(chain)}
    >
        <img src={chain.logo} className="item-logo small" alt={chain.name} loading="lazy" />
        <span className="chain-name">{chain.name}</span>
        {isSelected && <div className="active-dot"/>}
    </div>
));

const ChainTokenSelector = ({ 
    selectedChain, 
    selectedToken, 
    onChainSelect, 
    onTokenSelect,
    label = "Select Token",
    chainType = 'all' // 'all', 'evm', 'svm' (future)
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    // State initialization from CACHE or EMPTY
    const [tokens, setTokens] = useState(() => {
        if (!selectedChain) return [];
        // 1. Try Cache
        const cached = lifiService.getTokensCached(selectedChain.id);
        if (cached && cached.length > 0) return cached;
        return [];
    });
    const activeChainIdRef = React.useRef(selectedChain?.id);
    const [chains, setChains] = useState(() => {
        const cached = lifiService.getChainsCached();
        return cached ? cached : POPULAR_CHAINS; // Fallback to popular if no cache
    }); 
    const [tokensLoading, setTokensLoading] = useState(false);
    const [chainsLoading, setChainsLoading] = useState(true); // Start true - chains load on mount
    const [activeTab, setActiveTab] = useState('tokens');

    // Alias for backwards compatibility
    const loading = tokensLoading;

    useEffect(() => {
        loadChains();
    }, []);

    useEffect(() => {
        if (selectedChain) {
            activeChainIdRef.current = selectedChain.id; // Update active ref
            
            // INSTANT UI: Use Cached -> Empty
            const cached = lifiService.getTokensCached(selectedChain.id);
            if (cached && cached.length > 0) {
                 setTokens(sortTokens(cached));
            } else {
                 setTokens([]); 
            }
            // Background fetch to get full list
            loadTokens(selectedChain.id);
        }
    }, [selectedChain]);

    const loadChains = async (retryCount = 0) => {
        if (retryCount === 0) setChainsLoading(true);
        try {
            const fetchedChains = await lifiService.getChains();
            logger.log("Found chains:", fetchedChains.length);

            // Simple map: Use API data directly. 
            // Note: popularChains is just used for BETTER logos/keys if available, NOT for filtering.
            const allChains = fetchedChains.map(chain => {
                const popular = POPULAR_CHAINS.find(p => String(p.id) === String(chain.id));
                return {
                    ...chain,
                    // Use popular logo if available (usually better quality), else API logo
                    logo: popular?.logo || chain.logoURI || 'https://via.placeholder.com/32',
                    key: popular?.key || chain.key || chain.name?.toUpperCase().substring(0, 3) || 'UNK',
                    isPopular: !!popular
                };
            });

            // Sort: Popular first, then Alphabetical
            const sortedChains = allChains.sort((a, b) => {
                if (a.isPopular && !b.isPopular) return -1;
                if (!a.isPopular && b.isPopular) return 1;
                return (a.name || '').localeCompare(b.name || '');
            });
            
            setChains(sortedChains);
        } catch (error) {
            logger.error('Error loading chains:', error);
            
            if (retryCount < 3) {
                setTimeout(() => loadChains(retryCount + 1), 1000);
            } else {
                 // Fallback to offline popular list ONLY if API dead
                 setChains(POPULAR_CHAINS.map(c => ({...c, isPopular: true})));
            }
        } finally {
            setChainsLoading(false);
        }
    };

    const [error, setError] = useState(null); // Add error state

    const loadTokens = async (chainId, retryCount = 0) => {
        setTokensLoading(true);
        setError(null); // Reset error
        try {
            const fetchedTokens = await lifiService.getTokens(chainId);
            
            // RACE CONDITION CHECK: Only update if user hasn't switched chains
            if (activeChainIdRef.current === chainId) {
                setTokens(sortTokens(fetchedTokens));
            }
        } catch (error) {
            logger.error('Error loading tokens:', error);
            
            // Retry logic
            if (retryCount < 3) {
                const delay = 1500 * (retryCount + 1);
                logger.warn(`Token load failed for chain ${chainId}, retrying in ${delay}ms...`);
                // Check ref again before retrying to ensure we don't retry for an old chain
                if (activeChainIdRef.current === chainId) {
                    setTimeout(() => loadTokens(chainId, retryCount + 1), delay);
                }
                return;
            }

            if (activeChainIdRef.current === chainId) {
                // If we have seed tokens, keep them but show error
                setError("Failed to load full token list. Showing top tokens.");
                // Ensure we don't accidentally clear seed tokens if they exist
                if (tokens.length === 0) setTokens([]);
            }
        } finally {
            if (activeChainIdRef.current === chainId) {
                setTokensLoading(false);
            }
        }
    };

    const sortTokens = (tokenList) => {
        if (!tokenList || !Array.isArray(tokenList)) return [];
        
        // Deduplicate using Map by address
        const uniqueTokens = new Map();
        tokenList.forEach(t => {
            if (t && t.address) {
                uniqueTokens.set(t.address.toLowerCase(), t);
            }
        });

        // Convert back to array, filter, and sort
        return Array.from(uniqueTokens.values())
            .filter(t => t && t.symbol && t.name) // Defensive filter
            .sort((a, b) => {
                // 0. Priority Addresses (Chain Specific)
                if (selectedChain && PRIORITY_TOKEN_ADDRESSES[selectedChain.id]) {
                    const priorities = PRIORITY_TOKEN_ADDRESSES[selectedChain.id];
                    const aIsPriority = a.address && priorities.includes(a.address.toLowerCase());
                    const bIsPriority = b.address && priorities.includes(b.address.toLowerCase());
                    if (aIsPriority && !bIsPriority) return -1;
                    if (!aIsPriority && bIsPriority) return 1;
                }

                // 1. Popular Symbols
                const aIsPopular = POPULAR_TOKEN_SYMBOLS.includes(a.symbol);
                const bIsPopular = POPULAR_TOKEN_SYMBOLS.includes(b.symbol);
                if (aIsPopular && !bIsPopular) return -1;
                if (!aIsPopular && bIsPopular) return 1;
                
                // 2. Price
                const priceA = !isNaN(parseFloat(a.priceUSD)) ? parseFloat(a.priceUSD) : 0;
                const priceB = !isNaN(parseFloat(b.priceUSD)) ? parseFloat(b.priceUSD) : 0;
                return priceB - priceA;
            }); // Removed slice limit to show ALL tokens
    };

    const [visibleLimit, setVisibleLimit] = useState(20);
    const containerRef = React.useRef(null);

    // Background Pre-fetch Popular Chains on Mount
    useEffect(() => {
        const prefetch = async () => {
            const topChainIds = [1, 137, 56, 42161, 10, 1151111081099710]; // ETH, POL, BSC, ARB, OPT, SOL
            topChainIds.forEach(id => {
                // Fire and forget - populates cache
                lifiService.getTokens(id).catch(e => logger.warn('Prefetch failed', id));
            });
        };
        prefetch();
    }, []);

    // Scroll Handler for Pagination (Infinite Scroll)
    const handleScroll = useCallback(() => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            if (scrollHeight - scrollTop <= clientHeight + 100) {
                setVisibleLimit(prev => Math.min(prev + 20, 500));
            }
        }
    }, []);

    const filteredTokens = useMemo(() => {
        return tokens.filter(t => {
            // Strict Chain Filter
            if (selectedChain && t.chainId !== selectedChain.id) return false;

            const query = searchQuery.toLowerCase();
            return (
                t.symbol.toLowerCase().includes(query) ||
                t.name.toLowerCase().includes(query) || 
                (t.address && t.address.toLowerCase() === query)
            );
        });
    }, [tokens, searchQuery, selectedChain]);

    const displayTokens = useMemo(() => {
        return filteredTokens.slice(0, visibleLimit);
    }, [filteredTokens, visibleLimit]);

    useEffect(() => {
        setVisibleLimit(20); // Reset limit on search or chain change
    }, [searchQuery, selectedChain]);

    const filteredChains = chains.filter(c => {
        const query = searchQuery.toLowerCase();
        const nameMatch = (c.name || '').toLowerCase().includes(query);
        const keyMatch = (c.key || '').toLowerCase().includes(query);
        return nameMatch || keyMatch;
    });

    const handleChainSelectWrapper = useCallback((chain) => {
        onChainSelect(chain);
        setSearchQuery('');
        // setVisibleLimit(20); // Handled by effect
    }, [onChainSelect]);

    const handleTokenSelectDirect = useCallback((token) => {
       onTokenSelect(token);
       setIsOpen(false);
       setSearchQuery('');
       setActiveTab('tokens');
    }, [onTokenSelect]);

    return (
        <div className="selector-container">
            {/* Trigger Button */}
            <button className="selector-button" onClick={() => setIsOpen(!isOpen)}>
                <div className="selector-content">
                    {selectedChain && (
                        <img 
                            src={selectedChain.logo || selectedChain.logoURI} 
                            alt={selectedChain.name} 
                            className="token-logo"
                            onError={(e) => e.target.src = 'https://via.placeholder.com/24'}
                        />
                    )}
                    {selectedToken && (
                        <img 
                            src={selectedToken.logoURI} 
                            alt={selectedToken.symbol} 
                            className="token-logo"
                            style={{ marginLeft: -12 }} // Overlap
                            onError={(e) => e.target.src = 'https://via.placeholder.com/24'}
                        />
                    )}
                    <span className="token-symbol">
                        {selectedToken?.symbol || 'Select'}
                    </span>
                </div>
                <ChevronDown size={16} />
            </button>

            {/* Modal - Portalled to body to escape parent transforms/clipping */}
            {isOpen && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="backdrop"
                                onClick={() => setIsOpen(false)}
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="selector-modal"
                            >
                                {/* Header */}
                                <div className="selector-header">
                                    <span className="selector-title">Exchange from</span>
                                    <X className="close-button" size={20} onClick={() => setIsOpen(false)} />
                                </div>

                                {/* Split Content */}
                                <div className="split-view-container">
                                    
                                    {/* LEFT COLUMN: TOKENS */}
                                    <div className="column-left">
                                        <div className="search-container">
                                            <Search className="search-icon" size={16} />
                                            <input 
                                                className="search-input"
                                                placeholder={`Search ${selectedChain?.name || ''} tokens...`}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                autoFocus
                                            />
                                        </div>

                                        <div 
                                            className="token-list-container" 
                                            style={{ contentVisibility: 'auto' }}
                                            ref={containerRef}
                                            onScroll={handleScroll}
                                        >
                                            {error && (
                                                <div style={{padding:'10px 15px', background:'rgba(255,59,48,0.1)', border:'1px solid rgba(255,59,48,0.3)', borderRadius:'12px', marginBottom:'10px', color:'#ff3b30', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'8px'}}>
                                                    <span>⚠️ {error}</span>
                                                    <button onClick={() => loadTokens(selectedChain?.id)} style={{background:'none', border:'none', color:'#ff3b30', textDecoration:'underline', cursor:'pointer', padding:0, fontSize:'0.85rem'}}>Retry</button>
                                                </div>
                                            )}
                                            {loading && displayTokens.length === 0 ? (
                                                <div style={{padding:'40px', textAlign:'center', color:'#666'}}>
                                                    <div className="spin" style={{display:'inline-block', marginBottom:'10px'}}><Zap size={24}/></div>
                                                    <div>Loading tokens...</div>
                                                </div>
                                            ) : displayTokens.length > 0 ? (
                                                <>
                                                    {displayTokens.map((token, idx) => (
                                                        <TokenItem 
                                                            key={`${token.address}-${idx}`}
                                                            token={token}
                                                            isSelected={selectedToken?.address === token.address}
                                                            onSelect={handleTokenSelectDirect}
                                                        />
                                                    ))}
                                                    {filteredTokens.length > visibleLimit && (
                                                        <div style={{padding:'10px', textAlign:'center', color:'#444', fontSize:'0.8rem'}}>
                                                            Loading more...
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{padding:'20px', textAlign:'center', color:'#444'}}>No tokens found</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN: CHAINS */}
                                    <div className="column-right">
                                        <div className="column-header">Select Network</div>
                                        <div className="chain-list-container" style={{ contentVisibility: 'auto' }}>
                                            {chainsLoading && chains.length === 0 ? (
                                                // Skeleton loader for chains
                                                <div style={{padding: '20px'}}>
                                                    {[1,2,3,4,5].map(i => (
                                                        <div key={i} className="skeleton-chain" style={{
                                                            height: '40px',
                                                            background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
                                                            backgroundSize: '200% 100%',
                                                            animation: 'shimmer 1.5s infinite',
                                                            borderRadius: '8px',
                                                            marginBottom: '8px'
                                                        }} />
                                                    ))}
                                                </div>
                                            ) : (
                                                filteredChains.map(chain => (
                                                    <ChainItem
                                                        key={chain.id}
                                                        chain={chain}
                                                        isSelected={selectedChain?.id === chain.id}
                                                        onSelect={handleChainSelectWrapper}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

import PropTypes from 'prop-types';

ChainTokenSelector.propTypes = {
    selectedChain: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        logo: PropTypes.string,
        logoURI: PropTypes.string,
        key: PropTypes.string
    }),
    selectedToken: PropTypes.shape({
        address: PropTypes.string,
        symbol: PropTypes.string,
        name: PropTypes.string,
        decimals: PropTypes.number,
        logoURI: PropTypes.string,
        priceUSD: PropTypes.string,
        chainId: PropTypes.number
    }),
    onChainSelect: PropTypes.func.isRequired,
    onTokenSelect: PropTypes.func.isRequired,
    label: PropTypes.string,
    chainType: PropTypes.oneOf(['all', 'evm', 'svm'])
};

// ✅ UPGRADE #9: React.memo() optimization
export default React.memo(ChainTokenSelector);
