import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldIcon, ArrowRightIcon } from '../common/Icons';

export default function BankLayout() {
  const { bank, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blood-700 to-blood-800 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
          {/* Logo / Bank name */}
          <Link to="/bank/dashboard" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
              <ShieldIcon size={22} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm md:text-base font-bold truncate max-w-[180px]">
                {bank?.name || 'Blood Bank Portal'}
              </p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-red-200">
                Admin Portal
              </p>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Admin Dashboard
            </span>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm font-bold bg-white text-blood-700 px-4 py-2.5 rounded-xl hover:bg-red-50 hover:-translate-y-0.5 transition-all shadow-sm"
            >
              Logout
              <ArrowRightIcon size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}