import React from 'react';
import './App.css'
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  PieChart,
  Brain,
  Receipt,
  ChevronRight,
  Shield,
  LineChart,
  Landmark,
  Smartphone,
  ArrowRight,
  Coins,
  TrendingUp,
  Sparkles,
  Target,
  Bell,
  Menu
} from 'lucide-react';

// interface FeatureCardProps {
//   icon: React.ReactNode;
//   title: string;
//   description: string;
//   image?: string;
// }


const FeatureCard = ({ icon, title, description, image }) => {
    return (
      <div className="p-4 sm:p-6 md:p-8 rounded-2xl bg-white border border-gray-100 hover:shadow-xl transition-all duration-500 group hover:-translate-y-2">
        <div className="h-12 w-12 md:h-14 md:w-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-all duration-500">
          {icon}
        </div>
        <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2 md:mb-3 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6 leading-relaxed">{description}</p>
        {image && (
          <div className="mt-4 md:mt-6 rounded-xl overflow-hidden shadow-lg transform-gpu">
            <img 
              src={image} 
              alt={title} 
              className="w-full h-36 sm:h-40 md:h-48 object-cover transform transition duration-700 group-hover:scale-110" 
            />
          </div>
        )}
      </div>
    );
  };
  

const FloatingElement = ({ children }) => {
    return <div className="absolute animate-float">{children}</div>;
  };

function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const handleLogin = ()=>{
    navigate("/login");
  }
  const handleSignup = ()=>{
    navigate("/signup");
  }
  

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 relative z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <Wallet className="text-blue-600 animate-pulse" size={28} sm:size={36} />
              <div className="absolute -top-1 -right-1 h-2 w-2 sm:h-3 sm:w-3 bg-green-400 rounded-full" />
            </div>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-transparent bg-clip-text">
              Ledger
            </span>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu size={24} />
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
              How it Works
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
              Testimonials
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full" />
            </a>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={handleLogin}
              className="text-gray-700 px-4 sm:px-6 py-2 rounded-lg font-semibold hover:text-blue-600 transition-colors"
            >
              Login
            </button>
            <button 
              onClick={handleSignup}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              Sign Up Free
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-b-xl p-4 md:hidden">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">
                How it Works
              </a>
              <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors">
                Testimonials
              </a>
              <hr className="my-2" />
              <button className="text-gray-700 px-4 py-2 rounded-lg font-semibold hover:text-blue-600 transition-colors" onClick={handleLogin}>
                Login
              </button>
              <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold" onClick={handleSignup}>
                Sign Up Free
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="container mx-auto px-4 sm:px-6 py-12 md:py-20 lg:py-32 relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-blue-50 to-transparent -z-10 rounded-full blur-3xl" />
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16">
          <div className="flex-1 space-y-6 md:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 px-4 py-2 rounded-full">
              <Shield size={16} />
              <span className="text-sm font-medium">Bank-Grade Security</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 text-transparent bg-clip-text">Master Your Money</span>
              <span className="block mt-2 bg-gradient-to-r from-blue-600 to-blue-800 text-transparent bg-clip-text">With AI Power</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Experience the future of personal finance with AI-driven insights, smart budgeting, and intelligent investment recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center lg:justify-start">
              <button className="group bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-300 transform hover:-translate-y-0.5">
                Start Your Journey 
                <ArrowRight size={20} className="inline ml-2 transform group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="relative overflow-hidden border-2 border-gray-200 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-300 hover:border-blue-600 hover:text-blue-600 group">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Watch Demo <ChevronRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-blue-50 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </button>
            </div>
          </div>
          <div className="flex-1 relative w-full max-w-xl lg:max-w-none">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-blue-50 rounded-3xl transform -rotate-2" />
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000"
              alt="Finance Dashboard"
              className="relative rounded-3xl shadow-2xl transform hover:scale-105 transition-all duration-700 hover:shadow-blue-600/20 w-full"
            />
            <FloatingElement>
              <div className="absolute -right-4 sm:-right-8 -top-4 sm:-top-8 bg-white p-3 sm:p-4 rounded-xl shadow-lg">
                <Sparkles className="text-yellow-400" size={20} sm:size={24} />
              </div>
            </FloatingElement>
            <FloatingElement>
              <div className="absolute -left-4 sm:-left-8 bottom-8 sm:bottom-12 bg-white p-3 sm:p-4 rounded-xl shadow-lg">
                <Target className="text-green-500" size={20} sm:size={24} />
              </div>
            </FloatingElement>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 md:py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/50 to-blue-50" />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 sm:mb-6 bg-gradient-to-r from-gray-900 to-gray-700 text-transparent bg-clip-text">
            Your Financial Command Center
          </h2>
          <p className="text-base sm:text-lg text-gray-600 text-center max-w-3xl mx-auto mb-12 sm:mb-16 md:mb-20">
            Experience a comprehensive suite of tools designed to transform your financial journey, powered by cutting-edge AI technology.
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard
              icon={<Smartphone className="text-blue-600" size={28} />}
              title="Smart UPI Payments"
              description="Seamlessly manage all your payments with our advanced UPI integration. Send money, pay bills, and track expenses in real-time with intelligent categorization."
              image="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800"
            />
            <FeatureCard
              icon={<PieChart className="text-blue-600" size={28} />}
              title="AI-Powered Analytics"
              description="Watch your spending patterns come to life with beautiful visualizations. Our AI analyzes your transactions to provide personalized insights and spending recommendations."
              image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800"
            />
            <FeatureCard
              icon={<Brain className="text-blue-600" size={28} />}
              title="Smart Investment Advisor"
              description="Let our AI analyze your spending patterns and savings to recommend personalized investment opportunities. Make informed decisions with real-time market insights."
              image="https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800"
            />
            <FeatureCard
              icon={<LineChart className="text-blue-600" size={28} />}
              title="Intelligent Budget Planning"
              description="Create dynamic budgets that adapt to your lifestyle. Our AI helps you set realistic goals and sends smart alerts to keep you on track."
              image="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800"
            />
            <FeatureCard
              icon={<Receipt className="text-blue-600" size={28} />}
              title="Smart Transaction History"
              description="Every transaction is automatically categorized and analyzed. Get detailed insights into your spending patterns with advanced filtering and search capabilities."
              image="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800"
            />
            <FeatureCard
              icon={<Coins className="text-blue-600" size={28} />}
              title="Automated Savings"
              description="Our AI identifies opportunities to save money and automatically sets aside funds based on your spending patterns and financial goals."
              image="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700" />
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="container mx-auto px-4 sm:px-6 text-center relative">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 sm:mb-8 leading-tight">
              Ready to Transform Your Financial Future?
            </h2>
            <p className="text-blue-100 mb-8 sm:mb-12 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Join thousands of users who are already experiencing the power of AI-driven financial management. Start your journey to financial freedom today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
              <button className="group bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg">
                Create Free Account
                <ArrowRight size={20} className="inline ml-2 transform group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="relative overflow-hidden border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold group">
                <span className="relative z-10">Schedule Demo</span>
                <div className="absolute inset-0 bg-white/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <Wallet className="text-blue-600" size={28} sm:size={32} />
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 text-transparent bg-clip-text">
                Ledger
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-gray-600">
              <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
            </div>
            <div className="text-sm text-gray-600 text-center md:text-right">
              © 2024 Ledger. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;