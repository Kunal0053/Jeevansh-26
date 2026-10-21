import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BLOOD_GROUPS } from '../utils/bloodCompat';
import { useRequest } from '../context/RequestContext';
import { checkBanks } from '../services/requestService';
import {
  HeartIcon,
  LocationIcon,
  UsersIcon,
  ClipboardIcon,
  ShieldIcon,
  PhoneIcon,
  CheckCircleIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

export default function RequestForm() {
  const navigate = useNavigate();
  const { setActiveRequest } = useRequest();
  const [form, setForm] = useState({
    bloodType: '',
    location: '',
    patientAge: '',
    patientGender: '',
    units: 1,
    hospital: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bloodType || !form.location) {
      return toast.error('Blood group and location are required');
    }
    setLoading(true);
    try {
      const banks = await checkBanks(form.bloodType);
      const banksWithStock = banks.filter((b) => b.hasStock);
      setActiveRequest({
  ...form,
  banks: banksWithStock,
  clientRequestId: crypto.randomUUID(),
});
      if (banksWithStock.length > 0) navigate('/request/banks');
      else navigate('/request/alerting');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm({
          ...form,
          location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        }),
      () => toast.error('Could not get location')
    );
  };

  return (
<div className="min-h-screen bg-gradient-to-br from-blood-100 via-blood-50 to-red-100 relative overflow-hidden">
      {/* Floating background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-blood-200/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-red-200/40 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blood-200/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-3xl mx-auto py-16 px-6">
        {/* ═══════════════ FORM CARD ═══════════════ */}
        <form
          onSubmit={handleSubmit}
          className="relative bg-white rounded-3xl shadow-2xl shadow-blood-200/60 border-2 border-blood-100 p-8 md:p-10 animate-fade-in-up"
        >
          {/* Gradient top accent */}
          <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-blood-500 via-blood-600 to-blood-700 rounded-full" />

          {/* ═══════════════ CARD HEADER ═══════════════ */}
          <div className="text-center mb-8 pt-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 shadow-lg shadow-blood-600/30 mb-4 animate-float">
              <HeartIcon size={26} className="text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 leading-tight">
              Request <span className="text-blood-600">Blood</span>
            </h1>
            <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto leading-relaxed">
              Fill in the details below. We'll alert compatible donors near you instantly.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-blood-100 mb-8" />

          {/* ─── Blood Group ─── */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-4">
              <HeartIcon size={18} className="text-blood-600" />
              Blood Group Needed
              <span className="text-blood-600">*</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {BLOOD_GROUPS.map((bg) => {
                const selected = form.bloodType === bg;
                return (
                  <button
                    type="button"
                    key={bg}
                    onClick={() => setForm({ ...form, bloodType: bg })}
                    className={`relative py-4 rounded-2xl font-black text-lg transition-all duration-200 ${
                      selected
                        ? 'bg-gradient-to-br from-blood-600 to-blood-700 text-white shadow-lg shadow-blood-600/40 scale-[1.05]'
                        : 'bg-gray-50 text-gray-700 border-2 border-gray-100 hover:border-blood-300 hover:bg-blood-50/50 hover:-translate-y-0.5'
                    }`}
                  >
                    {bg}
                    {selected && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow">
                        <CheckCircleIcon size={16} className="text-emerald-500" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Location ─── */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
              <LocationIcon size={18} className="text-blood-600" />
              Your Location
              <span className="text-blood-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your city or area"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-5 py-4 text-base bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={useMyLocation}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blood-600 hover:text-blood-700 transition-colors group"
            >
              <span className="w-6 h-6 rounded-full bg-blood-50 flex items-center justify-center group-hover:bg-blood-100 transition">
                <LocationIcon size={14} />
              </span>
              Use my current location
            </button>
          </div>

          {/* ─── Patient Info ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
                <UsersIcon size={18} className="text-blood-600" />
                Patient Age
              </label>
              <input
                type="number"
                placeholder="e.g. 45"
                min="1"  
                max="120"  
                value={form.patientAge}
                onChange={(e) => setForm({ ...form, patientAge: e.target.value })}
                className="w-full px-5 py-4 text-base bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
                <UsersIcon size={18} className="text-blood-600" />
                Gender
              </label>
              <select
                value={form.patientGender}
                onChange={(e) => setForm({ ...form, patientGender: e.target.value })}
                className="w-full px-5 py-4 text-base bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all"
              >
                <option value="">Select gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {/* ─── Units + Hospital ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div>
              <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
                <HeartIcon size={18} className="text-blood-600" />
                Units Needed
              </label>
              <input
                type="number"
                min="1"
                value={form.units}
                onChange={(e) => setForm({ ...form, units: e.target.value })}
                className="w-full px-5 py-4 text-base bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
                <ClipboardIcon size={18} className="text-blood-600" />
                Hospital Name
              </label>
              <input
                type="text"
                placeholder="e.g. City Hospital"
                value={form.hospital}
                onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                className="w-full px-5 py-4 text-base bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* ─── Submit ─── */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blood-600 to-blood-700 text-white font-black text-lg py-5 rounded-2xl hover:shadow-2xl hover:shadow-blood-600/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-3 animate-pulse-glow"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Searching for donors...
              </>
            ) : (
              <>
                <HeartIcon size={22} />
                Alert Nearby Donors
              </>
            )}
          </button>

          {/* ─── Trust badges ─── */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <ShieldIcon size={14} className="text-emerald-500" />
              Secure & Private
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircleIcon size={14} className="text-emerald-500" />
              Verified Donors
            </span>
            <span className="flex items-center gap-1.5">
              <PhoneIcon size={14} className="text-emerald-500" />
              24/7 Support
            </span>
          </div>
        </form>

        {/* ═══════════════ FOOTER NOTE ═══════════════ */}
        <p className="text-center text-sm text-gray-600 mt-8 animate-fade-in-up animate-delay-200 font-medium">
          No login required • Free forever • Takes less than 30 seconds
        </p>
      </div>
    </div>
  );
}