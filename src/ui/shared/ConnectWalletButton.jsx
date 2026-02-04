import React from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { Wallet, LogOut, ChevronDown, Zap } from 'lucide-react';

const ConnectWalletButton = () => {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, chains } = useSwitchChain();
  
  const [showWalletModal, setShowWalletModal] = React.useState(false);
  const [showChainModal, setShowChainModal] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [showNotification, setShowNotification] = React.useState(false);

  const handleConnect = async (connector) => {
    try {
      setError(null);
      setShowNotification(true);
      await connect({ connector });
      setShowWalletModal(false);
      setShowNotification(false);
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect wallet');
      setShowNotification(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setError(null);
      await disconnect();
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect wallet');
    }
  };

  React.useEffect(() => {
    if (connectError) {
      setError(connectError.message || 'Connection failed');
      console.error('Wagmi connect error:', connectError);
    }
  }, [connectError]);

  // Connected State - Premium
  if (isConnected && address) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Chain Selector - Premium */}
          <button
            onClick={() => setShowChainModal(!showChainModal)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '8px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            {chain?.name || 'Unknown'}
            <ChevronDown size={14} style={{ opacity: 0.7 }} />
          </button>

          {/* Wallet Address - Premium Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '8px 14px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#10B981',
            fontFamily: 'var(--font-mono)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.1)',
          }}>
            <Zap size={14} />
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>

          {/* Disconnect Button - Premium */}
          <button
            onClick={handleDisconnect}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '8px 12px',
              color: '#EF4444',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Chain Selector Modal - Premium */}
        {showChainModal && (
          <>
            <div style={{
              position: 'absolute',
              top: '120%',
              right: 0,
              width: '240px',
              background: 'linear-gradient(180deg, #0f0f15 0%, #0a0a10 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '8px',
              zIndex: 100,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 107, 53, 0.1)',
              animation: 'fadeIn 0.2s ease-out',
            }}>
              <div style={{ 
                fontSize: '0.7rem', 
                color: 'rgba(255,255,255,0.4)', 
                padding: '8px 12px', 
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                Switch Network
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
                    padding: '12px',
                    background: chain?.id === c.id ? 'rgba(255, 107, 53, 0.12)' : 'transparent',
                    border: chain?.id === c.id ? '1px solid rgba(255, 107, 53, 0.3)' : '1px solid transparent',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '4px',
                  }}
                  onMouseEnter={(e) => {
                    if (chain?.id !== c.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (chain?.id !== c.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {c.name}
                  {chain?.id === c.id && (
                    <div style={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      background: '#FF6B35',
                      boxShadow: '0 0 10px #FF6B35',
                    }} />
                  )}
                </button>
              ))}
            </div>
            <div 
              onClick={() => setShowChainModal(false)} 
              style={{ position: 'fixed', inset: 0, zIndex: 90 }} 
            />
          </>
        )}
      </div>
    );
  }

  // Disconnected State - Premium CTA Button
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setShowWalletModal(!showWalletModal);
          setError(null);
        }}
        disabled={isPending}
        style={{
          background: 'linear-gradient(135deg, #FF6B35 0%, #F7931A 100%)',
          border: 'none',
          padding: '12px 28px',
          color: 'white',
          fontWeight: 700,
          fontSize: '0.9rem',
          borderRadius: '12px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          letterSpacing: '0.02em',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1,
          minWidth: '170px',
          boxShadow: '0 4px 20px rgba(255, 107, 53, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!isPending) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(255, 107, 53, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 107, 53, 0.3)';
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <Wallet size={18} />
          {isPending ? 'CONNECTING...' : 'CONNECT WALLET'}
        </span>
      </button>

      {/* Wallet Selection Modal - Premium */}
      {showWalletModal && (
        <>
          <div style={{
            position: 'absolute',
            top: '120%',
            right: 0,
            width: '300px',
            background: 'linear-gradient(180deg, #0f0f15 0%, #0a0a10 100%)',
            border: '1px solid rgba(255, 107, 53, 0.2)',
            borderRadius: '20px',
            padding: '20px',
            zIndex: 100,
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8), 0 0 60px rgba(255, 107, 53, 0.1)',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{ 
              fontSize: '1.1rem', 
              fontWeight: 700, 
              marginBottom: '16px',
              fontFamily: 'var(--font-heading)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <Wallet size={20} style={{ color: '#FF6B35' }} />
              Connect Wallet
            </div>

            {error && (
              <div style={{
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                color: '#EF4444',
                fontSize: '0.85rem',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector)}
                  disabled={isPending}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.5 : 1,
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isPending) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.4)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(255, 107, 53, 0.1) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Wallet size={18} style={{ color: '#FF6B35' }} />
                  </div>
                  {connector.name}
                </button>
              ))}
            </div>
            
            <div style={{ 
              marginTop: '16px', 
              fontSize: '0.75rem', 
              color: 'rgba(255,255,255,0.35)', 
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              By connecting, you agree to our Terms of Service
            </div>
          </div>
          <div 
            onClick={() => setShowWalletModal(false)} 
            style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} 
          />
        </>
      )}

      {/* Notification Toast - Premium */}
      {showNotification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #0f0f15 0%, #0a0a10 100%)',
          border: '2px solid #FF6B35',
          borderRadius: '16px',
          padding: '16px 24px',
          zIndex: 200,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 107, 53, 0.2)',
          animation: 'slideIn 0.3s ease-out',
          maxWidth: '340px',
        }}>
          <div style={{ 
            fontSize: '1rem', 
            fontWeight: 700, 
            color: '#FF6B35',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <Wallet size={20} />
            Check Your Wallet
          </div>
          <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
            Click on your wallet extension to approve the connection request.
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
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
    </div>
  );
};

export default ConnectWalletButton;
