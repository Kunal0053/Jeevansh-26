import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';
import { HeartIcon, ArrowRightIcon } from '../common/Icons';

export default function DonorLayout() {
  const { donor, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
          {/* Logo */}
          <Link to="/donor/dashboard" className="flex items-center gap-3 flex-shrink-0">
            <Logo size={40} />
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold tracking-widest uppercase text-blood-600 bg-blood-50 px-2.5 py-1 rounded-full border border-blood-100">
              Donor
            </span>
          </Link>

          {/* Right side — user + actions */}
          <div className="flex items-center gap-3">
            {/* User info pill */}
            <div className="hidden md:flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blood-500 to-blood-700 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {donor?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'D'}
              </div>
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  Signed in
                </p>
                <p className="text-sm font-bold text-gray-900 truncate max-w-[120px]">
                  {donor?.name || 'Donor'}
                </p>
              </div>
            </div>

            {/* Dashboard link */}
            <Link
              to="/donor/dashboard"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-blood-600 transition-colors px-3 py-2"
            >
              <HeartIcon size={16} />
              Dashboard
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm font-bold bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black hover:-translate-y-0.5 transition-all shadow-sm"
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