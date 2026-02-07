import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Preloader from './ui/effects/Preloader';
import ErrorBoundary from './ui/shared/ErrorBoundary';
import './App.css';

// Lazy Load Pages
const Home = lazy(() => import('./pages/Home'));
const SwapPage = lazy(() => import('./pages/SwapPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
import DebugPanel from './ui/components/DebugPanel'; // ✅ Debug Tool

import { useAccount } from 'wagmi';
import { useEffect } from 'react';

function App() {
  // ✅ NEW: Handle wallet disconnection cleanup
  // Note: We need to use useAccount/useDisconnect here, but App is outside WagmiProvider?
  // Wait, index.js wraps App in WagmiProvider. So this is safe.
  /*
     However, standard practice is to do this inside a child component or use a hook.
     Let's adding a simple effect here might require importing useAccount.
  */
  
  return (
    <ErrorBoundary name="Application" message="The application encountered an unexpected error.">
      <Router>
        <Suspense fallback={<Preloader />}>
          <div className="app-container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/swap" element={<SwapPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
            </Routes>
            <WalletCleanup />
            <DebugPanel />
          </div>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

const WalletCleanup = () => {
    const { isConnected } = useAccount();

    useEffect(() => {
        if (!isConnected) {
            // Clear sensitive local storage
            localStorage.removeItem('lifi_cache_v4_permanent');
            localStorage.removeItem('swap_history');
            console.log('🧹 Wallet disconnected - cache cleared');
        }
    }, [isConnected]);

    return null;
}

export default App;

