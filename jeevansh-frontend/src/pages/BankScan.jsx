import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { verifyDonation, recordMedicalDecision, completeDonation } from '../services/bankService';
import { ClipboardIcon, CheckCircleIcon, AlertIcon, ShieldIcon } from '../components/common/Icons';
import toast from 'react-hot-toast';

function extractToken(value) {
  const text = (value || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    const marker = '/verify/';
    const index = url.pathname.indexOf(marker);
    if (index >= 0) return decodeURIComponent(url.pathname.slice(index + marker.length).split('/')[0]);
  } catch { /* The scanned value may be a raw token rather than a URL. */ }
  return text;
}

export default function BankScan() {
  const { bank } = useAuth();
  const location = useLocation();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [token, setToken] = useState(() => location.state?.token || localStorage.getItem('jeevansh_pending_verify_token') || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [completionBusy, setCompletionBusy] = useState(false);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  const startScan = async () => {
    if (!containerRef.current) return;
    setError(''); setResult(null); setScanning(true);
    const scanner = new Html5Qrcode(containerRef.current.id);
    scannerRef.current = scanner;
    try {
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, async (decodedText) => {
        const scannedToken = extractToken(decodedText);
        await scanner.stop().catch(() => {});
        setScanning(false);
        setToken(scannedToken);
        toast.success('QR scanned. Review and confirm verification below.');
      }, () => {});
    } catch {
      setScanning(false);
      setError('Camera could not start. Allow camera permission or enter the token manually.');
    }
  };

  const handleVerify = async () => {
    const candidate = extractToken(token || manualToken);
    if (!candidate) { setError('Scan a QR code or paste the token first.'); return; }
    setProcessing(true); setError('');
    try {
      const response = await verifyDonation(candidate, bank?.id || null);
      setResult(response);
      setToken(''); setManualToken('');
      localStorage.removeItem('jeevansh_pending_verify_token');
      toast.success('Donor identity verified. Continue with medical screening.');
    } catch (e) {
      const message = e.response?.data?.detail || e.message || 'Verification failed';
      setError(message); toast.error(message);
    } finally { setProcessing(false); }
  };

  const handleMedicalDecision = async (decision) => {
    if (!result?.request_id || !result?.donor_id) {
      setError('Verification response is missing request/donor details. Please scan the QR again.');
      return;
    }
    setDecisionBusy(true); setError('');
    try {
      const response = await recordMedicalDecision({
        requestId: result.request_id,
        donorId: result.donor_id,
        decision,
      });
      setResult((current) => ({ ...current, stage: response.status, message: response.message }));
      toast.success(decision === 'approve' ? 'Medical screening marked Confirmed.' : 'Medical screening marked Rejected.');
    } catch (e) {
      const message = e.response?.data?.detail || e.message || 'Could not save medical decision';
      setError(message); toast.error(message);
    } finally { setDecisionBusy(false); }
  };

  const handleCompleteDonation = async () => {
    if (!result?.request_id || !result?.donor_id) {
      setError('Request or donor details are missing. Please scan the donor QR again.');
      return;
    }
    if (!window.confirm('Confirm that blood collection has actually been completed? This will close the request and update donation history.')) return;
    setCompletionBusy(true); setError('');
    try {
      const response = await completeDonation({ requestId: result.request_id, donorId: result.donor_id });
      setResult((current) => ({ ...current, stage: 'completed', message: response.message }));
      toast.success('Donation completed and recorded.');
    } catch (e) {
      const message = e.response?.data?.detail || e.message || 'Could not complete donation';
      setError(message); toast.error(message);
    } finally { setCompletionBusy(false); }
  };

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div className="text-center"><div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 mb-4"><ClipboardIcon size={28} className="text-white" /></div><h1 className="text-3xl font-black text-gray-900">Verify Donor Identity</h1><p className="text-sm text-gray-600 mt-2">Scan the QR shown in the selected donor’s Jeevansh dashboard. This records identity verification only; complete fitness assessment and blood tests before recording the medical result.</p></div>
      {result ? <div className="bg-white rounded-3xl border-2 border-emerald-200 p-8 text-center"><CheckCircleIcon size={52} className="text-emerald-600 mx-auto mb-4" /><h2 className="text-2xl font-black text-emerald-700">{result.stage === 'completed' ? 'Donation Completed' : result.stage === 'confirmed' ? 'Medical Screening Confirmed' : result.stage === 'rejected' ? 'Medical Screening Rejected' : 'Donor Identity Verified'}</h2><p className="text-gray-700 mt-3">{result.message}</p><div className="grid grid-cols-2 gap-3 text-left mt-6"><div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">Donor</p><p className="font-bold">{result.donor_name}</p></div><div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">Blood group</p><p className="font-bold">{result.blood_type}</p></div><div className="bg-gray-50 rounded-xl p-3 col-span-2"><p className="text-xs text-gray-500">Request</p><p className="font-mono text-xs break-all">{result.request_id}</p></div></div>{result.stage === 'identity_verified' && <div className="mt-6 space-y-3"><p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3">Identity verification is complete. Perform the required fitness assessment and blood tests before recording a medical decision. This step does not complete the donation.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><button disabled={decisionBusy} onClick={() => handleMedicalDecision('approve')} className="bg-emerald-600 text-white font-bold rounded-xl px-5 py-3 disabled:opacity-50">{decisionBusy ? 'Saving…' : 'Medical screening: Confirmed'}</button><button disabled={decisionBusy} onClick={() => handleMedicalDecision('reject')} className="bg-red-600 text-white font-bold rounded-xl px-5 py-3 disabled:opacity-50">{decisionBusy ? 'Saving…' : 'Medical screening: Rejected'}</button></div></div>}{result.stage === 'confirmed' && <div className="mt-6 space-y-3"><p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl p-3">Medical screening is confirmed. Only press this button after blood collection has actually been completed.</p><button disabled={completionBusy} onClick={handleCompleteDonation} className="w-full bg-emerald-700 text-white font-black rounded-xl px-5 py-4 disabled:opacity-50">{completionBusy ? 'Completing…' : 'Confirm Donation & Complete Request'}</button></div>}{result.stage === 'completed' && <p className="mt-6 text-sm font-bold text-emerald-700">Donation recorded successfully. This request is now completed.</p>}<button onClick={() => setResult(null)} className="mt-6 bg-blood-600 text-white font-bold rounded-xl px-5 py-3">Scan another QR</button>{error && <p className="mt-4 text-sm text-red-700">{error}</p>}</div> : <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-5">
        <div id="jeevansh-qr-reader" ref={containerRef} className="w-full overflow-hidden rounded-xl" />
        <button disabled={scanning || processing} onClick={startScan} className="w-full bg-blood-600 text-white font-bold rounded-xl px-5 py-3 disabled:opacity-50">{scanning ? 'Camera is active — point at QR' : 'Open camera scanner'}</button>
        <div className="text-center text-xs text-gray-400">— or enter token manually —</div>
        <textarea value={manualToken} onChange={(e) => { setManualToken(e.target.value); setToken(''); }} placeholder="Paste the donation token or QR URL" rows={3} className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blood-200" />
        {token && <div className="bg-blue-50 rounded-xl p-3"><p className="text-xs font-bold text-blue-800 mb-1">QR scanned successfully</p><p className="text-xs font-mono text-blue-700 break-all">{token.slice(0, 42)}…</p></div>}
        {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700"><AlertIcon size={16} className="inline mr-1" />{error}</div>}
        <div className="text-xs text-gray-500 flex gap-2"><ShieldIcon size={15} />Signed-in blood bank: {bank?.name || 'Not identified'}. Invalid, expired or previously verified tokens will be rejected by the backend.</div>
        <button disabled={processing || !(token || manualToken.trim())} onClick={handleVerify} className="w-full bg-emerald-600 text-white font-black rounded-xl px-5 py-4 disabled:opacity-50">{processing ? 'Verifying…' : 'Verify donor identity'}</button>
      </div>}
    </div>
  );
}
