import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginBank } from '../services/bankService';
import { useAuth } from '../context/AuthContext';
import {
  ShieldIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ClipboardIcon,
  HeartIcon,
  AlertIcon,
  UsersIcon,
  SendIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

export default function BankLogin() {
  const navigate = useNavigate();
  const { loginBank: setAuth } = useAuth();
  const [bankId, setBankId] = useState('bank-1');
  const [password, setPassword] = useState('city123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Trim whitespace to prevent copy/paste errors
    const cleanBankId = bankId.trim();
    const cleanPassword = password.trim();

    if (!cleanBankId || !cleanPassword) {
      return toast.error('Please enter both Bank ID and Password');
    }

    setLoading(true);
    try {
      const data = await loginBank(cleanBankId, cleanPassword);
      setAuth(data);
      toast.success(`Welcome, ${data.bank.name}`);
      const pendingToken = localStorage.getItem('jeevansh_pending_verify_token');
      if (pendingToken) navigate('/bank/scan', { state: { token: pendingToken } });
      else navigate('/bank/dashboard');
    } catch (err) {
      const message = err.response?.data?.detail || 'Invalid credentials.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ═══════════════════════════════════════════════
          LEFT PANEL — Admin Branding (RED THEME)
      ═══════════════════════════════════════════════ */}
      <div className="relative lg:w-1/2 bg-gradient-to-br from-blood-700 via-blood-800 to-blood-900 text-white overflow-hidden flex items-center justify-center p-8 lg:p-12 animate-gradient">
        {/* Floating blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-red-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blood-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>

        <div className="relative max-w-md w-full">
          {/* Admin badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase text-red-100 mb-8 animate-fade-in-up">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Admin Access
          </div>

          {/* Headline */}
          <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-5 animate-fade-in-up animate-delay-100">
            Blood Bank
            <br />
            <span className="text-red-300">Portal</span>
          </h1>

          <p className="text-red-100 text-lg mb-10 leading-relaxed animate-fade-in-up animate-delay-200">
            Verify donations, manage incoming requests, and monitor real-time blood stock levels for your facility.
          </p>

          {/* Capability list */}
          <div className="space-y-4 mb-10 animate-fade-in-up animate-delay-300">
            {[
              { icon: <ClipboardIcon size={20} />, text: 'Verify donations via QR scan' },
              { icon: <HeartIcon size={20} />, text: 'Monitor real-time blood stock' },
              { icon: <AlertIcon size={20} />, text: 'Handle incoming requests' },
              { icon: <SendIcon size={20} />, text: 'Sync with the donor network' },
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
              AES-256 Encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <UsersIcon size={14} />
              128 Partner Banks
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          RIGHT PANEL — Login Form
      ═══════════════════════════════════════════════ */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blood-50/60 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-50/60 rounded-full blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="animate-fade-in-up animate-delay-100">
            {/* Icon badge */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 shadow-lg shadow-blood-600/30 mb-5 animate-float">
              <ShieldIcon size={26} className="text-white" />
            </div>

            <h2 className="text-3xl font-black text-gray-900 mb-2">
              Admin Sign In
            </h2>
            <p className="text-gray-500 mb-8">
              Enter your bank credentials to access the portal.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
                  <UsersIcon size={18} className="text-blood-600" />
                  Bank ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. bank-1"
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="w-full px-5 py-4 text-base bg-blood-50/40 border-2 border-blood-100 rounded-2xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
                  <ShieldIcon size={18} className="text-blood-600" />
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 text-base bg-blood-50/40 border-2 border-blood-100 rounded-2xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                  <ShieldIcon size={12} className="text-emerald-500" />
                  Access is logged for security compliance
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blood-600 to-blood-700 text-white font-black text-lg py-5 rounded-2xl hover:shadow-2xl hover:shadow-blood-600/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-3 animate-pulse-glow"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Access Portal
                    <ArrowRightIcon size={20} />
                  </>
                )}
              </button>
            </form>

            {/* Security footer */}
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon size={12} className="text-emerald-500" />
                TLS 1.3
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon size={12} className="text-emerald-500" />
                ISO 27001
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon size={12} className="text-emerald-500" />
                Audit Logged
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}