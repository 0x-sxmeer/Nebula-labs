import React from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';

const ConnectButton = () => {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, chains } = useSwitchChain();
  
  const [showWalletModal, setShowWalletModal] = React.useState(false);
  const [showChainModal, setShowChainModal] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Handle connection
  const handleConnect = async (connector) => {
    try {
      setError(null);
      await connect({ connector });
      setShowWalletModal(false);
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect wallet');
      // Keep modal open to show error
    }
  };

  // Handle disconnection
  const handleDisconnect = async () => {
    try {
      setError(null);
      await disconnect();
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect wallet');
    }
  };

  // Show error if connection fails
  React.useEffect(() => {
    if (connectError) {
      setError(connectError.message || 'Connection failed');
      console.error('Wagmi connect error:', connectError);
    }
  }, [connectError]);

  if (isConnected && address) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Chain Selector */}
          <button
            onClick={() => setShowChainModal(!showChainModal)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '1rem',
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {chain?.name || 'Unknown'}
            <ChevronDown size={14} />
          </button>

          {/* Wallet Address */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(76, 175, 80, 0.2)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: '1rem',
            padding: '6px 12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#4CAF50',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50' }} />
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(248, 113, 113, 0.2)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              borderRadius: '1rem',
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#f87171',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={14} />
          </button>
        </div>

        {/* Chain Selector Modal */}
        {showChainModal && (
          <>
            <div style={{
              position: 'absolute',
              top: '120%',
              right: 0,
              width: '220px',
              background: '#1a1b1e',
              border: '1px solid #333',
              borderRadius: '1rem',
              padding: '0.5rem',
              zIndex: 100,
              boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#888', padding: '0.5rem', fontWeight: 600 }}>
                SWITCH NETWORK
              </div>
              {chains.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    switchChain({ chainId: c.id });
                    setShowChainModal(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem',
                    background: chain?.id === c.id ? 'rgba(255, 113, 32, 0.15)' : 'transparent',
                    border: chain?.id === c.id ? '1px solid rgba(255, 113, 32, 0.3)' : '1px solid transparent',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '4px'
                  }}
                >
                  {c.name}
                  {chain?.id === c.id && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff7120' }} />
                  )}
                </button>
              ))}
            </div>
            <div onClick={() => setShowChainModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setShowWalletModal(!showWalletModal);
          setError(null); // Clear errors when opening modal
        }}
        disabled={isPending}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#ff7120',
          border: 'none',
          borderRadius: '1rem',
          padding: '8px 16px',
          fontSize: '0.9rem',
          fontWeight: 700,
          color: 'white',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1,
          transition: 'all 0.2s'
        }}
      >
        <Wallet size={16} />
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <>
          <div style={{
            position: 'absolute',
            top: '120%',
            right: 0,
            width: '280px',
            background: '#1a1b1e',
            border: '1px solid #333',
            borderRadius: '1rem',
            padding: '1rem',
            zIndex: 100,
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Connect Wallet
            </div>

            {/* Error Display */}
            {error && (
              <div style={{
                padding: '0.8rem',
                background: 'rgba(248, 113, 113, 0.15)',
                border: '1px solid rgba(248, 113, 113, 0.3)',
                borderRadius: '0.5rem',
                color: '#f87171',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector)}
                  disabled={isPending}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0.8rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.8rem',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isPending) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = '#ff7120';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <Wallet size={20} />
                  {connector.name}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>
              By connecting, you agree to our Terms of Service
            </div>
          </div>
          <div onClick={() => setShowWalletModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
        </>
      )}
    </div>
  );
};

export default ConnectButton;
