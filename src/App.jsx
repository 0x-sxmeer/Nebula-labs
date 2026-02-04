import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SwapPage from './pages/SwapPage';
import PortfolioPage from './pages/PortfolioPage';
import Preloader from './ui/effects/Preloader';
import ErrorBoundary from './ui/shared/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary name="Application" message="The application encountered an unexpected error.">
      <Router>
        <Preloader />
        <div className="app-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

