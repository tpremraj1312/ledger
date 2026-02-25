import React from 'react';
import { Wallet } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-12 relative z-10 w-full">
      <div className="container mx-auto px-4 md:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Wallet className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              Ledger
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-10 text-sm font-medium text-slate-600">
            <a href="#ecosystem" className="hover:text-blue-600 transition-colors">Ecosystem</a>
            <a href="#intelligence" className="hover:text-blue-600 transition-colors">Intelligence</a>
            <a href="#security" className="hover:text-blue-600 transition-colors">Security</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
          </div>

          <div className="text-sm text-slate-400 font-medium">
            © {new Date().getFullYear()} Ledger. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
