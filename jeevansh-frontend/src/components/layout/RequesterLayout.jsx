import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Logo from '../common/Logo';
import FeedbackModal from '../common/FeedbackModal';
import { PhoneIcon, HeartIcon, UsersIcon, AlertIcon } from '../common/Icons';

export default function RequesterLayout() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLink = (path, label) => {
    const isActive = location.pathname === path;
    return (
      <Link
        to={path}
        className={`nav-underline text-[13px] font-bold tracking-widest uppercase transition-colors py-2 ${
          isActive ? 'text-blood-600 active' : 'text-gray-600 hover:text-blood-600'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col relative">
      
      {/* Emergency ticker */}
      <div className="bg-olive-700 text-white text-[10px] md:text-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
            <span className="font-medium tracking-wide">24/7 Emergency Blood Helpline</span>
          </div>
          <a href="tel:1800JEEVAN" className="flex items-center gap-2 hover:text-olive-200 transition font-semibold">
            <PhoneIcon size={12} />
            1800-JEEVAN
          </a>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled || isMobileMenuOpen ? 'bg-cream-50 shadow-lg shadow-olive-900/5 border-b border-olive-100' : 'bg-cream-50 border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center group">
            <Logo size={40} textColor="text-blood-900" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-9">
            {navLink('/', 'Home')}
            {navLink('/request', 'Find Blood')}
            {navLink('/donor/register', 'Become a Donor')}
            {navLink('/bank/login', 'Blood Bank Portal')}
          </nav>

          <div className="flex items-center gap-3 md:gap-4">
            <Link to="/donor/login" className="hidden md:inline-block text-sm font-bold text-gray-600 hover:text-blood-600 transition-colors">
              Sign In
            </Link>
            <Link
              to="/donor/register"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-bold bg-blood-600 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl hover:bg-blood-700 transition-all shadow-md shadow-blood-600/20"
            >
              <HeartIcon size={16} />
              Donate Now
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-blood-600 transition-colors focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-cream-50 border-b border-olive-100 shadow-xl animate-fade-in-up">
            <div className="flex flex-col px-6 py-4 space-y-4">
              <Link to="/" className="text-base font-bold text-gray-800 hover:text-blood-600 pb-2 border-b border-gray-100">Home</Link>
              <Link to="/request" className="text-base font-bold text-gray-800 hover:text-blood-600 pb-2 border-b border-gray-100">Find Blood</Link>
              <Link to="/donor/register" className="text-base font-bold text-gray-800 hover:text-blood-600 pb-2 border-b border-gray-100">Become a Donor</Link>
              <Link to="/bank/login" className="text-base font-bold text-gray-800 hover:text-blood-600 pb-2 border-b border-gray-100">Blood Bank Portal</Link>
              <Link to="/donor/login" className="text-base font-bold text-gray-800 hover:text-blood-600">Sign In</Link>
              
              {/* Mobile only Donate Button */}
              <Link
                to="/donor/register"
                className="sm:hidden inline-flex items-center justify-center gap-2 text-sm font-bold bg-blood-600 text-white px-5 py-3 rounded-xl mt-2"
              >
                <HeartIcon size={16} />
                Donate Now
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsFeedbackOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-blood-900 text-white text-xs md:text-sm font-bold px-4 md:px-5 py-3 md:py-3.5 rounded-full shadow-2xl hover:bg-black hover:-translate-y-1 transition-all flex items-center gap-2 border-2 border-white/20"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Feedback
      </button>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      {/* Footer */}
      <footer className="bg-blood-900 text-cream-50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <Logo size={38} textColor="text-white" />
            <p className="text-olive-100 text-sm mt-4 leading-relaxed">Connecting donors to patients in seconds. Every drop counts.</p>
            <div className="flex items-center gap-2 mt-4 text-xs text-olive-300">
              <span className="w-1.5 h-1.5 bg-olive-400 rounded-full animate-pulse" /> All systems operational
            </div>
          </div>
          <div>
            <h4 className="font-bold text-base mb-4 text-white">Quick Links</h4>
            <ul className="space-y-3 text-sm text-olive-100">
              <li><Link to="/request" className="hover:text-white transition flex items-center gap-2"><HeartIcon size={14} /> Find Blood</Link></li>
              <li><Link to="/donor/register" className="hover:text-white transition flex items-center gap-2"><UsersIcon size={14} /> Become a Donor</Link></li>
              <li><Link to="/bank/login" className="hover:text-white transition flex items-center gap-2"><AlertIcon size={14} /> Blood Bank Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-base mb-4 text-white">Contact</h4>
            <ul className="space-y-3 text-sm text-olive-100">
              <li>help@jeevansh.org</li>
              <li>+91 98765 43210</li>
              <li className="pt-2 text-xs text-olive-300">Available 24/7 for emergencies</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-base mb-4 text-white">Emergency Helpline</h4>
            <p className="text-3xl font-black text-blood-400 tracking-tight">1800-JEEVAN</p>
            <p className="text-xs text-olive-300 mt-2">Free • 24/7 • Pan-India</p>
          </div>
        </div>
        <div className="border-t border-blood-800">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-olive-200">
            <p>© 2026 Jeevansh. Built for Viksit Bharat 2047.</p>
            <p className="flex items-center gap-4">
              <span className="hover:text-white cursor-pointer transition">Privacy</span>
              <span className="hover:text-white transition">Terms</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}