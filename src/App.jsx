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

function App() {
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
          </div>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

