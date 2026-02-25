import React from 'react';
import { Wallet } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-fintech-base relative z-10 py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <Wallet className="text-fintech-primary" size={28} />
            <span className="text-lg sm:text-xl font-bold text-white tracking-wide">
              Ledger
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <div className="text-sm text-gray-500 text-center md:text-right">
            © {new Date().getFullYear()} Ledger. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
