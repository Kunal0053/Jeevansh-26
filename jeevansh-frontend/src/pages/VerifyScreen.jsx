import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verifyDonation } from '../services/bankService';
import { HeartIcon, ShieldIcon, CheckCircleIcon, AlertIcon } from '../components/common/Icons';

export default function VerifyScreen() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { bank } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) localStorage.setItem('jeevansh_pending_verify_token', token);
  }, [token]);

  const handleVerify = async () => {
    setLoading(true); setError('');
    try {
      const data = await verifyDonation(token, bank?.id || null);
      setResult(data);
      localStorage.removeItem('jeevansh_pending_verify_token');
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed. The token may be invalid, expired, or already used.');
    } finally { setLoading(false); }
  };

  if (result) return <div className="max-w-xl mx-auto py-16 px-6"><div className="bg-white rounded-3xl border-2 border-emerald-200 p-8 text-center"><CheckCircleIcon size={56} className="text-emerald-600 mx-auto mb-4" /><h1 className="text-3xl font-black text-emerald-700">Donor Identity Verified</h1><p className="mt-3 text-gray-600">{result.message}</p><p className="mt-4 text-gray-700">Donor: <strong>{result.donor_name}</strong> · Blood group: <strong>{result.blood_type}</strong></p><button onClick={() => navigate('/bank/scan')} className="mt-6 bg-blood-600 text-white font-bold rounded-xl px-5 py-3">Return to verification portal</button></div></div>;

  return <div className="max-w-xl mx-auto py-16 px-6"><div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center"><div className="w-16 h-16 rounded-2xl bg-blood-100 flex items-center justify-center mx-auto mb-4"><HeartIcon size={32} className="text-blood-600" /></div><h1 className="text-2xl font-black text-gray-900">Jeevansh Donation Verification</h1><p className="text-sm text-gray-600 mt-3">This QR contains a time-limited donation token. Only signed-in blood-bank staff should use this link to verify the selected donor’s identity. Medical screening and final decision are separate steps.</p><div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-3 text-left"><p className="text-xs text-gray-500 mb-1">Token preview</p><p className="text-xs font-mono break-all">{token?.slice(0, 48)}…</p></div>{!bank ? <><p className="mt-5 text-sm text-amber-700"><ShieldIcon size={16} className="inline mr-1" />Please sign in as blood-bank staff to continue.</p><Link to="/bank/login" className="inline-block mt-4 bg-blood-600 text-white font-bold rounded-xl px-5 py-3">Blood bank sign in</Link><p className="text-xs text-gray-500 mt-3">After signing in, open the verification scanner and paste/scan this token if it does not resume automatically.</p></> : <button disabled={loading} onClick={handleVerify} className="mt-5 w-full bg-emerald-600 text-white font-black rounded-xl px-5 py-4 disabled:opacity-50">{loading ? 'Verifying…' : 'Verify donor identity'}</button>}{error && <div className="mt-5 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700"><AlertIcon size={16} className="inline mr-1" />{error}</div>}</div></div>;
}
