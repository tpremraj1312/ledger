import React from 'react';
import Navbar from './components/landing/Navbar';
import Footer from './components/landing/Footer';
import HeroSection from './components/landing/HeroSection';
import EcosystemSection from './components/landing/EcosystemSection';
import GovernanceSection from './components/landing/GovernanceSection';
import AIIntelligenceSection from './components/landing/AIIntelligenceSection';
import InvestmentSection from './components/landing/InvestmentSection';
import SecuritySection from './components/landing/SecuritySection';
import SocialProofSection from './components/landing/SocialProofSection';
import FinalCTASection from './components/landing/FinalCTASection';
import './App.css'; // ensure styles are imported

function LandingPage() {
  return (
    <div className="landing-light-theme flex flex-col min-h-screen selection:bg-fintech-primary/30 selection:text-slate-900">
      <Navbar />

      <main className="flex-1 w-full flex flex-col">
        <HeroSection />

        {/* Subtle grid background for the middle sections */}
        <div className="relative">
          <div className="absolute inset-0 bg-grid-black/5 opacity-50 z-0 pointer-events-none" />

          <EcosystemSection />
          <GovernanceSection />
          <AIIntelligenceSection />
          <InvestmentSection />
          <SecuritySection />
          <SocialProofSection />
        </div>

        <FinalCTASection />
      </main>

      <Footer />
    </div>
  );
}

export default LandingPage;