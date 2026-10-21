import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BLOOD_GROUPS } from '../utils/bloodCompat';
import { registerDonor } from '../services/donorService';
import {
  HeartIcon, UsersIcon, PhoneIcon, LocationIcon, ShieldIcon, CheckCircleIcon, SparkleIcon, ArrowRightIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

export default function DonorRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    name: '', 
    phone: '', 
    password: '',
    confirmPassword: '',
    whatsappOptIn: false,
    bloodType: '', 
    location: '',
    age: '',
    weight: '',
    gender: '',
    lastDonated: ''
  });
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationCoordinates, setLocationCoordinates] = useState(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported by this browser.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = coords.latitude;
        const longitude = coords.longitude;
        setLocationCoordinates({ latitude, longitude });
        // Keep the human-readable location field separate from GPS coordinates.
        setForm((previous) => ({
          ...previous,
          location: previous.location || 'Current location',
        }));
        setLocationLoading(false);
        toast.success('Current location captured successfully.');
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission denied. Please allow location access in your browser.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'Your location is currently unavailable.'
            : 'Could not get location. Please try again.';
        toast.error(message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password || !form.bloodType) return toast.error('Please fill all required fields');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    
    // Optional but helpful frontend validation
    if (form.age && (form.age < 18 || form.age > 65)) return toast.error('Age must be between 18 and 65');
    if (form.weight && form.weight < 45) return toast.error('Weight must be at least 45 kg');

    setLoading(true);
    try {
      if (!locationCoordinates) {
        setLoading(false);
        return toast.error('Please use Current Location before registering.');
      }

      const payload = {
        ...form,
        // GeoJSON uses [longitude, latitude] order.
        locationCoordinates: {
          type: 'Point',
          coordinates: [locationCoordinates.longitude, locationCoordinates.latitude],
        },
        latitude: locationCoordinates.latitude,
        longitude: locationCoordinates.longitude,
      };
      delete payload.confirmPassword;
      await registerDonor(payload);
      toast.success('Registration saved. Please log in with your phone number and password.');
      navigate('/donor/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const eligibilityCriteria = [
    { text: 'Age between 18 and 65 years', icon: <CheckCircleIcon size={16} className="text-emerald-500" /> },
    { text: 'Weight at least 45 kg to 50 kg', icon: <CheckCircleIcon size={16} className="text-emerald-500" /> },
    { text: 'Hemoglobin level of 12.5 g/dL or higher', icon: <CheckCircleIcon size={16} className="text-emerald-500" /> },
    { text: 'At least 90 days since your last donation', icon: <CheckCircleIcon size={16} className="text-emerald-500" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-olive-50 to-blood-50/20 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-olive-200/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-blood-200/40 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-3xl mx-auto py-16 px-6">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 shadow-lg shadow-blood-600/30 mb-4 animate-float">
            <HeartIcon size={26} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-blood-900 mb-2 leading-tight">
            Become a <span className="text-blood-600">Donor</span>
          </h1>
          <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto leading-relaxed">
            Join 12,000+ heroes who save lives every day. Registration takes less than 30 seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative bg-white rounded-3xl shadow-2xl shadow-olive-900/5 border-2 border-olive-100 p-8 md:p-10 animate-fade-in-up animate-delay-100">
          <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-olive-500 via-olive-600 to-olive-700 rounded-full" />

          {/* Eligibility Guidelines Section */}
          <div className="bg-cream-50 rounded-2xl p-5 mb-8 border border-olive-100">
            <div className="flex items-center gap-2 mb-4">
              <ShieldIcon size={20} className="text-blood-600" />
              <div>
                <h3 className="font-bold text-blood-900">Basic Donor Eligibility Guidelines</h3>
                <p className="text-xs text-gray-500">Please review before registering. Clinical screening is performed at the donation center.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eligibilityCriteria.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <div className="mt-0.5">{item.icon}</div>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
              <UsersIcon size={18} className="text-blood-600" /> Full Name <span className="text-blood-600">*</span>
            </label>
            <input required type="text" placeholder="e.g. Ravi Kumar" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-5 py-4 text-base bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all placeholder:text-gray-400" />
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
              <PhoneIcon size={18} className="text-blood-600" /> WhatsApp Number <span className="text-blood-600">*</span>
            </label>
            <input required type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-5 py-4 text-base bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all placeholder:text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">Password *</label>
              <input type="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-3 text-base bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">Confirm Password *</label>
              <input type="password" autoComplete="new-password" minLength={8} required placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full px-4 py-3 text-base bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all" />
            </div>
          </div>

          <label className="flex items-start gap-3 mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700">
            <input type="checkbox" checked={form.whatsappOptIn} onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })} className="mt-1 accent-red-600" />
            <span>I agree to receive WhatsApp blood-request alerts from Jeevansh. This is optional and can be left unchecked.</span>
          </label>

          {/* NEW FIELDS: Age, Weight, Gender, Last Donated */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">Age</label>
              <input type="number" placeholder="e.g. 25" min="18" max="65" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full px-4 py-3 text-base bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all placeholder:text-gray-400" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">Weight (kg)</label>
              <input type="number" placeholder="e.g. 65" min="45" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="w-full px-4 py-3 text-base bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all placeholder:text-gray-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">Gender</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-4 py-3 text-base bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all">
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">Last Donated</label>
              <input type="date" value={form.lastDonated} onChange={(e) => setForm({ ...form, lastDonated: e.target.value })} className="w-full px-4 py-3 text-base bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-blood-500/10 focus:border-blood-500 focus:bg-white outline-none transition-all text-gray-600" />
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
              <HeartIcon size={18} className="text-blood-600" /> Blood Type <span className="text-blood-600">*</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {BLOOD_GROUPS.map((bg) => {
                const selected = form.bloodType === bg;
                return (
                  <button type="button" key={bg} onClick={() => setForm({ ...form, bloodType: bg })}
                    className={`relative py-4 rounded-2xl font-black text-lg transition-all duration-200 ${selected ? 'bg-gradient-to-br from-blood-600 to-blood-700 text-white shadow-lg shadow-blood-600/40 scale-[1.05]' : 'bg-gray-50 text-gray-700 border-2 border-gray-100 hover:border-blood-300 hover:bg-blood-50/50 hover:-translate-y-0.5'}`}>
                    {bg}
                    {selected && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow"><CheckCircleIcon size={16} className="text-emerald-500" /></span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-8">
            <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
              <LocationIcon size={18} className="text-blood-600" /> Your Location
            </label>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={locationLoading}
              className="w-full px-5 py-4 rounded-2xl border-2 border-blood-200 bg-blood-50 text-blood-700 font-bold hover:bg-blood-100 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              <LocationIcon size={18} />
              {locationLoading ? 'Getting current location…' : locationCoordinates ? 'Current location captured — refresh location' : 'Use Current Location'}
            </button>
            {locationCoordinates && (
              <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                <p className="font-semibold">Location captured successfully</p>
                <p className="mt-1">Latitude: {locationCoordinates.latitude.toFixed(6)}</p>
                <p>Longitude: {locationCoordinates.longitude.toFixed(6)}</p>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Allow location permission when your browser asks. GPS coordinates are used to find nearby blood donors.
            </p>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blood-600 to-blood-700 text-white font-black text-lg py-5 rounded-2xl hover:shadow-2xl hover:shadow-blood-600/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-3 animate-pulse-glow">
            {loading ? <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Registering...</> : <><HeartIcon size={22} /> Register as Donor</>}
          </button>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><ShieldIcon size={14} className="text-emerald-500" /> Secure & Private</span>
            <span className="flex items-center gap-1.5"><CheckCircleIcon size={14} className="text-emerald-500" /> Verified Network</span>
            <span className="flex items-center gap-1.5"><SparkleIcon size={14} className="text-emerald-500" /> Zero Spam</span>
          </div>
        </form>

        <p className="text-center text-sm text-gray-600 mt-8 animate-fade-in-up animate-delay-200 font-medium">
          Already registered?{' '}
          <Link to="/donor/login" className="inline-flex items-center gap-1 text-blood-600 font-bold hover:text-blood-700 hover:underline transition">
            Login here <ArrowRightIcon size={14} />
          </Link>
        </p>
      </div>
    </div>
  );
}