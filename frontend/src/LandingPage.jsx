import React from 'react';
import Navbar from './components/landing/Navbar';
import Footer from './components/landing/Footer';
import CursorGlow from './components/landing/CursorGlow';
import HeroSection from './components/landing/HeroSection';
import DashboardPreviewSection from './components/landing/DashboardPreviewSection';
import FinancialHealthSection from './components/landing/FinancialHealthSection';
import TransactionIntelligenceSection from './components/landing/TransactionIntelligenceSection';
import EcosystemSection from './components/landing/EcosystemSection';
import BillScanSection from './components/landing/BillScanSection';
import AnalyticsSection from './components/landing/AnalyticsSection';
import GovernanceSection from './components/landing/GovernanceSection';
import AIIntelligenceSection from './components/landing/AIIntelligenceSection';
import GamificationSection from './components/landing/GamificationSection';
import InvestmentSection from './components/landing/InvestmentSection';
import SecuritySection from './components/landing/SecuritySection';
import SocialProofSection from './components/landing/SocialProofSection';
import FinalCTASection from './components/landing/FinalCTASection';
import './App.css';

function LandingPage() {
  return (
    <div className="landing-light-theme flex flex-col min-h-screen selection:bg-fintech-primary/30 selection:text-slate-900">
      <CursorGlow />
      <Navbar />

      <main className="flex-1 w-full flex flex-col">
        <HeroSection />

        {/* Enterprise SaaS Mockups */}
        <DashboardPreviewSection />
        <FinancialHealthSection />
        <TransactionIntelligenceSection />

        {/* Subtle grid background for the middle sections */}
        <div className="relative">
          <div className="absolute inset-0 bg-grid-black/5 opacity-50 z-0 pointer-events-none" />

          <EcosystemSection />
          <BillScanSection />
          <AnalyticsSection />
          <GovernanceSection />
          <AIIntelligenceSection />
          <GamificationSection />
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