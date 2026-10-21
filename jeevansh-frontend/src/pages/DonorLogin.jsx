import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginDonor } from '../services/donorService';
import { useAuth } from '../context/AuthContext';
import {
  HeartIcon,
  PhoneIcon,
  ShieldIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  UsersIcon,
  AlertIcon,
  ClipboardIcon, // Added ClipboardIcon
} from '../components/common/Icons';
import Logo from '../components/common/Logo';
import toast from 'react-hot-toast';

export default function DonorLogin() {
  const navigate = useNavigate();
  const { loginDonor: setAuth } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !password) return toast.error('Please enter your phone number and password');
    setLoading(true);
    try {
      const data = await loginDonor(phone, password);
      setAuth(data);
      toast.success('Welcome back!');
      navigate('/donor/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ═══════════════════════════════════════════════
          LEFT PANEL — Branding
      ═══════════════════════════════════════════════ */}
      <div className="relative lg:w-1/2 bg-gradient-to-br from-blood-700 via-blood-800 to-blood-900 text-white overflow-hidden flex items-center justify-center p-8 lg:p-12 animate-gradient">
        {/* Floating blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-red-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blood-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>

        <div className="relative max-w-md w-full">
          {/* Logo */}
          {/* <div className="mb-10 animate-fade-in-up">
            <Logo size={48} textColor="text-white" />
          </div> */}

          {/* Headline */}
          <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-5 animate-fade-in-up animate-delay-100">
            Welcome back,
            <br />
            <span className="text-red-300">Hero.</span>
          </h1>

          <p className="text-red-100 text-lg mb-10 leading-relaxed animate-fade-in-up animate-delay-200">
            Every time you log in, you're one step closer to saving another life. Your donation history and certificates are waiting.
          </p>

          {/* Benefits list */}
          <div className="space-y-4 mb-10 animate-fade-in-up animate-delay-300">
            {[
              { icon: <HeartIcon size={20} />, text: 'Track your donation journey' },
              { icon: <UsersIcon size={20} />, text: 'See how many lives you have impacted' },
              { icon: <ClipboardIcon size={20} />, text: 'Download and share your life-saving certificates' }, // Updated line
              { icon: <AlertIcon size={20} />, text: 'Receive alerts for nearby emergencies' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </span>
                <span className="text-red-50 font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Trust footer */}
          <div className="flex items-center gap-4 text-xs text-red-200 animate-fade-in-up animate-delay-400">
            <span className="flex items-center gap-1.5">
              <ShieldIcon size={14} />
              Encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircleIcon size={14} />
              12,480+ Donors
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          RIGHT PANEL — Login Form
      ═══════════════════════════════════════════════ */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-white relative overflow-hidden">
        {/* Subtle background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blood-50/60 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-50/60 rounded-full blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="animate-fade-in-up animate-delay-100">
            {/* Small icon */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 shadow-lg shadow-blood-600/30 mb-5 animate-float">
              <PhoneIcon size={26} className="text-white" />
            </div>

            <h2 className="text-3xl font-black text-gray-900 mb-2">
              Donor Sign In
            </h2>
            <p className="text-gray-500 mb-8">
              Sign in using your registered phone number and password.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
                  <PhoneIcon size={18} className="text-blood-600" />
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-5 py-4 text-base bg-blood-50/40 border-2 border-blood-100 rounded-2xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                  <ShieldIcon size={12} className="text-emerald-500" />
                  Use the phone number you registered with.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-base font-bold text-gray-800 mb-3">Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-5 py-4 text-base bg-blood-50/40 border-2 border-blood-100 rounded-2xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blood-600 to-blood-700 text-white font-black text-lg py-5 rounded-2xl hover:shadow-2xl hover:shadow-blood-600/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-3 animate-pulse-glow"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRightIcon size={20} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-4 text-gray-400 font-medium">
                  NEW TO JEEVANSH?
                </span>
              </div>
            </div>

            {/* Register link */}
            <Link
              to="/donor/register"
              className="flex items-center justify-center gap-2 w-full border-2 border-blood-200 text-blood-700 font-bold text-base py-4 rounded-2xl hover:bg-blood-50 transition-all"
            >
              <HeartIcon size={18} />
              Become a Donor
            </Link>

            {/* Footer trust line */}
            <p className="text-center text-xs text-gray-400 mt-8">
              By continuing, you agree to our Terms and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}