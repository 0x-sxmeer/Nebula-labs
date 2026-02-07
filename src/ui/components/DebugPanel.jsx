import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { lifiService } from '../../services/lifiService';
import { formatUnits } from 'viem';

const DebugPanel = () => {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [isOpen, setIsOpen] = useState(false);
    
    // Test Balance Fetch
    const { data: balance, isError: balanceError, isLoading: balanceLoading } = useBalance({
        address: address,
    });

    // Test API Connectivity
    const [apiStatus, setApiStatus] = useState('Checking...');
    const [chainsLoaded, setChainsLoaded] = useState(0);

    const checkApi = async () => {
        setApiStatus('Checking...');
        try {
            const start = Date.now();
            // 1. Check General API (Chains)
            const chains = await lifiService.getChains();
            const chainsLatency = Date.now() - start;
            
            // 2. Check Routing API (Mock Route)
            // Current Chain Native -> USDC (or placeholder)
            const startRoute = Date.now();
            const routes = await lifiService.getRoutes({
                fromChainId: chainId,
                fromTokenAddress: '0x0000000000000000000000000000000000000000',
                fromAmount: '1000000000000000000', // 1 Unit
                toChainId: chainId,
                toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC (Mainnet address, but safe fallback for check)
                options: { slippage: 0.005 }
            }).catch(e => {
                console.warn("Route Check Failed:", e);
                return [];
            });
            const routeLatency = Date.now() - startRoute;

            setApiStatus(`OK (Chains: ${chainsLatency}ms, Routes: ${routes.length > 0 ? 'OK' : 'Empty'} ${routeLatency}ms)`);
            setChainsLoaded(chains.length);
        } catch (e) {
            console.error("DebugPanel API Check Failed:", e);
            setApiStatus(`FAIL: ${e.message || 'Unknown Error'}`);
            setChainsLoaded(0);
        }
    };

    useEffect(() => {
        if (isOpen) checkApi();
    }, [isOpen]);

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '10px',
                    right: '10px',
                    zIndex: 9999,
                    background: 'red',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    fontSize: '12px',
                    opacity: 0.8
                }}
            >
                🐞 Debug
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: '300px',
            background: 'rgba(0,0,0,0.9)',
            color: '#0f0',
            fontFamily: 'monospace',
            fontSize: '11px',
            padding: '10px',
            borderRadius: '8px',
            zIndex: 9999,
            border: '1px solid #333'
        }}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                <strong>SYSTEM STATUS</strong>
                <button onClick={() => setIsOpen(false)} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}>X</button>
            </div>

            <div style={{marginBottom:'5px'}}>
                <span style={{color:'#888'}}>Wallet:</span> {isConnected ? '✅ Connected' : '❌ Disconnected'}
            </div>
            <div style={{marginBottom:'5px', wordBreak:'break-all'}}>
                <span style={{color:'#888'}}>Addr:</span> {address || 'N/A'}
            </div>
            <div style={{marginBottom:'5px'}}>
                <span style={{color:'#888'}}>Chain ID:</span> {chainId}
            </div>

            <hr style={{borderColor:'#333'}}/>

            <div style={{marginBottom:'5px'}}>
                <span style={{color:'#888'}}>RPC Balance:</span> 
                {balanceLoading ? ' Loading...' : 
                 balanceError ? ' ❌ ERROR' : 
                 balance ? ` ${parseFloat(formatUnits(balance.value, 18)).toFixed(4)} ${balance.symbol}` : ' N/A'}
            </div>

            <hr style={{borderColor:'#333'}}/>

            <div style={{marginBottom:'5px'}}>
                <span style={{color:'#888'}}>API Status:</span> 
                <span style={{color: apiStatus.startsWith('OK') ? '#0f0' : 'red'}}>{apiStatus}</span>
            </div>
            <div style={{marginBottom:'5px'}}>
                <span style={{color:'#888'}}>Chains Loaded:</span> {chainsLoaded}
            </div>
            
            <button onClick={checkApi} style={{marginTop:'5px', width:'100%'}}>
                Re-Test Connectivity
            </button>
            
            <hr style={{borderColor:'#333', margin:'10px 0'}}/>
            
            <div style={{fontSize:'10px'}}>
                <strong>Token State Debug:</strong>
            </div>
            {/* We need to inject these via props or context in a real app, 
                but for this specific component instance, we don't have access to useSwap state directly unless passed.
                The user can verify via the UI values.
             */}
            <div style={{color:'#666', fontSize:'10px', marginTop:'5px'}}>
               Use console to see full objects.
            </div>
        </div>
    );
};

export default DebugPanel;
