import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDonorDashboard, getPendingRequests, acceptRequest, getCertificates, updateDonorAvailability, getSelectedRequests } from '../services/donorService';
import { AlertIcon, CheckCircleIcon, LocationIcon, ShieldIcon, ClipboardIcon } from '../components/common/Icons';
import toast from 'react-hot-toast';

export default function DonorDashboard() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [activeQr, setActiveQr] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jeevansh_active_qr') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashboard, requests, certs, selected] = await Promise.all([
        getDonorDashboard(), getPendingRequests(), getCertificates(), getSelectedRequests(),
      ]);
      setStats(dashboard);
      setPending(requests);
      setCertificates(certs);
      setSelectedRequests(selected);
    } catch (error) {
      console.error('Unable to load donor dashboard:', error);
      toast.error(error.response?.data?.detail || 'Could not load your dashboard. Please sign in again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // The loader synchronizes this screen with the API on mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadData(); }, [loadData]);

  const handleAccept = async (requestId) => {
    setBusyId(requestId);
    try {
      const result = await acceptRequest(requestId);
      if (!result?.token || !result?.qr_image_base64) {
        throw new Error('The server accepted the request but did not return a QR code.');
      }
      const qr = { ...result, request_id: requestId, created_at: new Date().toISOString() };
      setActiveQr(qr);
      localStorage.setItem('jeevansh_active_qr', JSON.stringify(qr));
      setPending((items) => items.filter((item) => item.id !== requestId));
      toast.success('Request accepted. Show this QR to the blood bank.');
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to accept request');
    } finally { setBusyId(null); }
  };

  const handleAvailability = async () => {
    if (!stats?.donor) return;
    try {
      const updated = await updateDonorAvailability(!stats.donor.is_available);
      setStats((old) => ({ ...old, donor: updated, available: updated.is_available }));
      toast.success(updated.is_available ? 'You are marked available.' : 'You are marked unavailable.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not update availability');
    }
  };

  const handleCopyToken = async () => {
    if (!activeQr?.token) return;
    try {
      await navigator.clipboard.writeText(activeQr.token);
      setCopied(true);
      toast.success('Token copied');
      window.setTimeout(() => setCopied(false), 1800);
    } catch { toast.error('Could not copy token on this browser'); }
  };

  if (loading) return <div className="text-center py-20 animate-pulse text-gray-500">Loading your real donor data...</div>;
  if (!stats) return <div className="text-center py-20 text-gray-600">Your dashboard could not be loaded. Please log out and sign in again.</div>;

  const profile = stats.donor;
  const totalDonations = stats.totalDonations || 0;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blood-600 via-blood-700 to-blood-800 text-white p-6 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black mb-1">Welcome, {profile?.name || 'Donor'} 👋</h1>
            <p className="text-red-100 text-sm">{profile?.blood_type || 'Blood group not set'} · {profile?.city || 'Location registered'}</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 rounded-2xl px-5 py-3 text-center"><p className="text-2xl font-black">{totalDonations}</p><p className="text-xs text-red-100">Verified donations</p></div>
            <div className="bg-white/10 rounded-2xl px-5 py-3 text-center"><p className="text-2xl font-black">{certificates.length}</p><p className="text-xs text-red-100">Certificates</p></div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-sm">Availability: <strong>{profile?.is_available ? 'Available' : 'Unavailable'}</strong></span>
          <button onClick={handleAvailability} className="bg-white text-blood-700 font-bold text-sm rounded-xl px-4 py-2 hover:bg-red-50">Mark {profile?.is_available ? 'unavailable' : 'available'}</button>
        </div>
      </div>

      {activeQr && (
        <section className="bg-white rounded-3xl shadow-xl border-2 border-blood-200 p-6 md:p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blood-100 mb-3"><CheckCircleIcon size={30} className="text-blood-600" /></div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Your Donation QR</h2>
          <p className="text-sm text-gray-600 mb-5">Show this QR to authorized blood-bank staff for verification. The QR itself does not confirm a donation.</p>
          {activeQr.qr_image_base64 ? <img src={`data:image/png;base64,${activeQr.qr_image_base64}`} alt="Donation verification QR code" className="w-64 max-w-full mx-auto mb-5 rounded-xl border p-2" /> : <p className="text-sm text-amber-700">QR image is unavailable. Use the token below.</p>}
          <div className="max-w-md mx-auto bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
            <p className="text-xs font-bold text-blue-800 uppercase mb-2"><ClipboardIcon size={14} className="inline mr-1" />Backup token</p>
            <div className="flex items-center gap-2"><span className="text-xs text-gray-600 font-mono truncate flex-1">{activeQr.token}</span><button onClick={handleCopyToken} className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg">{copied ? 'Copied' : 'Copy'}</button></div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Request: {activeQr.request_id || 'Accepted donation request'}</p>
          <button onClick={() => { setActiveQr(null); localStorage.removeItem('jeevansh_active_qr'); }} className="mt-4 text-sm font-bold text-gray-500 underline">Hide QR on this device</button>
        </section>
      )}

      <section className="bg-white rounded-3xl shadow-xl border-2 border-emerald-100 p-6">
        <div className="flex items-center gap-3 mb-5"><span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><ShieldIcon size={20} className="text-emerald-600" /></span><div><h2 className="font-bold text-gray-900">WhatsApp-selected requests</h2><p className="text-xs text-gray-500">If you were selected, show the QR/token below to authorized blood-bank staff. Identity verification is not medical clearance.</p></div></div>
        {selectedRequests.length === 0 ? <p className="text-sm text-gray-500 py-5 text-center border-2 border-dashed border-gray-200 rounded-2xl">No selected requests yet. If selected, your request and QR will appear here.</p> : <div className="space-y-4">{selectedRequests.map((req) => <div key={req.request_id} className="border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start"><div className="flex-1"><p className="font-black text-gray-900">{req.blood_type} request · {req.hospital_name}</p><p className="text-xs text-gray-500 mt-1">Status: <strong>{(req.donor_status || 'selected').replaceAll('_', ' ')}</strong></p><p className="text-xs text-gray-500 mt-1">Request ID: {req.request_id}</p><p className="text-xs text-amber-700 mt-2">Staff must verify your identity, then conduct fitness assessment and blood tests. This QR does not mean your donation is complete.</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={async () => { try { await navigator.clipboard.writeText(req.token || ''); toast.success('Token copied'); } catch { toast.error('Could not copy token'); } }} className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg">Copy token</button>{req.verify_url && <a href={req.verify_url} className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg" target="_blank" rel="noreferrer">Open verification link</a>}</div></div>{req.qr_image_base64 && <img src={`data:image/png;base64,${req.qr_image_base64}`} alt="Selected request verification QR" className="w-36 h-36 border rounded-xl p-2 self-center" />}</div>)}</div>}
      </section>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5"><span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><AlertIcon size={20} className="text-amber-600" /></span><div><h2 className="font-bold text-gray-900">Requests matching your profile</h2><p className="text-xs text-gray-500">Accept only if you are willing and able to travel.</p></div></div>
        {pending.length === 0 ? <p className="text-sm text-gray-500 py-6 text-center border-2 border-dashed border-gray-200 rounded-2xl">No matching active requests right now.</p> : <div className="space-y-3">{pending.map((req) => <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100"><div><p className="font-black text-gray-900">{req.blood_type} needed</p><p className="text-xs text-gray-500 mt-1"><LocationIcon size={12} className="inline mr-1" />{req.hospital_name || req.location_text || 'Hospital details pending'}</p><p className="text-xs text-gray-500 mt-1">Units: {req.units || 1}</p></div><button disabled={busyId === req.id} onClick={() => handleAccept(req.id)} className="bg-blood-600 text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-blood-700 disabled:opacity-50">{busyId === req.id ? 'Accepting...' : 'Accept request'}</button></div>)}</div>}
      </section>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5"><span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><ShieldIcon size={20} className="text-emerald-600" /></span><div><h2 className="font-bold text-gray-900">My verified donation certificates</h2><p className="text-xs text-gray-500">Certificates appear after a blood bank verifies a donation.</p></div></div>
        {certificates.length === 0 ? <p className="text-sm text-gray-500 py-6 text-center border-2 border-dashed border-gray-200 rounded-2xl">No verified donation certificates yet.</p> : <div className="space-y-3">{certificates.map((cert) => <Link key={cert.id} to={`/donor/certificate/${cert.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-4 hover:border-blood-200 hover:bg-blood-50"><div><p className="font-bold text-gray-900">{cert.blood_type} donation</p><p className="text-xs text-gray-500">{cert.verified_at ? new Date(cert.verified_at).toLocaleString() : 'Verified donation'}</p></div><span className="text-sm font-bold text-blood-700">View certificate →</span></Link>)}</div>}
      </section>
    </div>
  );
}
