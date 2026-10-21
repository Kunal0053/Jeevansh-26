import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequest } from '../context/RequestContext';
import {
  LocationIcon,
  HeartIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ShieldIcon,
  PhoneIcon,
  SparkleIcon,
  AlertIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

export default function BanksScreen() {
  const { activeRequest } = useRequest();
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeRequest) {
      navigate('/request');
    }
  }, [activeRequest, navigate]);

  if (!activeRequest || !activeRequest.banks) return null;

  const handleReserve = (bankName) => {
    toast.success(`Reservation request sent to ${bankName}. They'll contact you shortly.`);
  };

  const handleDirections = (bankName) => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(bankName)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blood-100 via-blood-50 to-red-100 relative overflow-hidden">
      {/* Floating blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-blood-200/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-red-200/40 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-3xl mx-auto py-12 px-6">
        {/* ═══════════════ HEADER ═══════════════ */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-600/30 mb-4 animate-float">
            <CheckCircleIcon size={28} className="text-white" />
          </div>
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-emerald-200 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase text-emerald-700 mb-4">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Blood in Stock
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 leading-tight">
            Blood Available <span className="text-blood-600">Nearby!</span>
          </h1>
          <p className="text-base text-gray-600 max-w-lg mx-auto leading-relaxed">
            We found blood banks with{' '}
            <span className="inline-flex items-center gap-1 font-bold text-blood-700">
              <HeartIcon size={16} />
              {activeRequest.bloodType}
            </span>{' '}
            in stock. Reserve a unit or get directions.
          </p>
        </div>

        {/* ═══════════════ BANK CARDS ═══════════════ */}
        <div className="space-y-4 mb-8">
          {activeRequest.banks.map((bank, i) => (
            <div
              key={bank.id}
              className="relative bg-white rounded-3xl shadow-xl shadow-blood-200/40 border-2 border-blood-100 p-6 md:p-7 animate-fade-in-up hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${100 + i * 100}ms` }}
            >
              {/* Gradient top accent */}
              <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 rounded-full" />

              {/* Bank header */}
              <div className="flex items-start justify-between gap-4 mb-5 pt-2">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Bank icon */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blood-600/30">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg md:text-xl font-black text-gray-900 truncate">
                      {bank.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-500">
                      <LocationIcon size={14} className="text-blood-600 flex-shrink-0" />
                      <span className="font-medium">{bank.distance} km away</span>
                    </div>
                  </div>
                </div>

                {/* Stock badge */}
                <span className="flex-shrink-0 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  {bank.unitsAvailable} {bank.unitsAvailable === 1 ? 'unit' : 'units'}
                </span>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleDirections(bank.name)}
                  className="flex items-center justify-center gap-2 bg-white border-2 border-blood-200 text-blood-700 font-bold py-3.5 rounded-2xl hover:bg-blood-50 transition-all text-sm md:text-base"
                >
                  <LocationIcon size={18} />
                  Get Directions
                </button>
                <button
                  onClick={() => handleReserve(bank.name)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blood-600 to-blood-700 text-white font-bold py-3.5 rounded-2xl hover:shadow-lg hover:shadow-blood-600/30 hover:-translate-y-0.5 transition-all text-sm md:text-base"
                >
                  <HeartIcon size={18} />
                  Reserve Unit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════════ CAN'T REACH A BLOOD BANK ═══════════════ */}
        <div
          className="relative bg-white rounded-3xl shadow-xl shadow-amber-200/40 border-2 border-amber-200 p-6 md:p-7 animate-fade-in-up"
          style={{ animationDelay: `${100 + activeRequest.banks.length * 100}ms` }}
        >
          <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full" />

          <div className="flex items-start gap-4 pt-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
              <AlertIcon size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-gray-900 mb-1">
                Can't reach a blood bank?
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                No problem. You can still alert nearby donors directly via WhatsApp — they'll get your request instantly.
              </p>
              <button
                onClick={() => navigate('/request/alerting')}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold px-6 py-3 rounded-2xl hover:shadow-lg hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all text-sm md:text-base"
              >
                <SparkleIcon size={18} />
                Still Alert Donors
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════ TRUST BADGES ═══════════════ */}
        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-gray-600 animate-fade-in-up"
          style={{ animationDelay: `${300 + activeRequest.banks.length * 100}ms` }}
        >
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldIcon size={14} className="text-emerald-500" />
            Verified Banks Only
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircleIcon size={14} className="text-emerald-500" />
            Real-time Stock Data
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <PhoneIcon size={14} className="text-emerald-500" />
            24/7 Support
          </span>
        </div>

        {/* ═══════════════ BACK LINK ═══════════════ */}
        <div className="text-center mt-8 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <button
            onClick={() => navigate('/request')}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blood-600 font-medium transition-colors"
          >
            ← Modify Request
          </button>
        </div>
      </div>
    </div>
  );
}