import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogin = () => {
        navigate('/login');
    };

    const handleSignup = () => {
        navigate('/signup');
    };

    return (
        <motion.nav
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 relative z-50"
        >
            <div className="flex items-center justify-between glass-panel px-6 py-3 rounded-2xl border border-slate-200/50 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="relative">
                        <Wallet className="text-fintech-primary group-hover:scale-110 transition-transform" size={28} />
                        <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    </div>
                    <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 text-transparent bg-clip-text">
                        Ledger
                    </span>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-slate-500 hover:text-slate-900 transition-colors"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <Menu size={24} />
                </button>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-10">
                    <a href="#ecosystem" className="text-slate-600 hover:text-slate-900 transition-all relative group text-sm font-medium tracking-wide">
                        Ecosystem
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-fintech-primary transition-all duration-300 group-hover:w-full" />
                    </a>
                    <a href="#intelligence" className="text-slate-600 hover:text-slate-900 transition-all relative group text-sm font-medium tracking-wide">
                        Intelligence
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-fintech-primary transition-all duration-300 group-hover:w-full" />
                    </a>
                    <a href="#security" className="text-slate-600 hover:text-slate-900 transition-all relative group text-sm font-medium tracking-wide">
                        Security
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-fintech-primary transition-all duration-300 group-hover:w-full" />
                    </a>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <button
                        onClick={handleLogin}
                        className="text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:text-slate-900 transition-colors"
                    >
                        Sign In
                    </button>
                    <button
                        onClick={handleSignup}
                        className="bg-fintech-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 hover:shadow-lg transition-all duration-300"
                    >
                        Get Started
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="absolute top-20 left-4 right-4 glass-panel rounded-b-xl p-4 md:hidden border-t-0 mt-2 z-40 shadow-xl border border-slate-200">
                    <div className="flex flex-col gap-4">
                        <a href="#ecosystem" className="text-slate-600 hover:text-slate-900 transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Ecosystem</a>
                        <a href="#intelligence" className="text-slate-600 hover:text-slate-900 transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Intelligence</a>
                        <a href="#security" className="text-slate-600 hover:text-slate-900 transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Security</a>
                        <hr className="my-2 border-slate-200" />
                        <button className="text-slate-600 font-semibold px-4 py-2 text-left hover:text-slate-900 transition-colors" onClick={handleLogin}>
                            Sign In
                        </button>
                        <button className="bg-fintech-primary text-white px-4 py-2 rounded-lg text-left font-semibold" onClick={handleSignup}>
                            Get Started
                        </button>
                    </div>
                </div>
            )}
        </motion.nav>
    );
};

export default Navbar;
