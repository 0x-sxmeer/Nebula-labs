import React from 'react';
import Navbar from '../ui/shared/Navbar';
import Hero from '../ui/sections/Hero';
import Features from '../ui/sections/Features';
import Footer from '../ui/shared/Footer';
import FloatingBubbles from '../ui/effects/FloatingBubbles';

const Home = () => {
    return (
        <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
            <FloatingBubbles />
            <div style={{ position: 'relative', zIndex: 1 }}>
                <Navbar />
                <Hero />
                <Features />
                <Footer />
            </div>
        </div>
    );
};

export default Home;
