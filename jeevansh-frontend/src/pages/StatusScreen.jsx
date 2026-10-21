import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRequestStatus } from '../services/requestService';
import {
  HeartIcon,
  AlertIcon,
  CheckCircleIcon,
  PhoneIcon,
  ShieldIcon,
  UsersIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

export default function StatusScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);

  const fetchStatus = useCallback(async (isManual = false) => {
    try {
      const s = await getRequestStatus(id);
      setStatus(s);
      if (isManual) toast.success('Status refreshed');
      return s;
    } catch {
      return null;
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      if (!isMounted) return;
      const s = await fetchStatus();
      if (s && (s.status === 'completed' || s.status === 'rejected' || s.status === 'rejected_by_blood_bank')) return;
      if (isMounted) setTimeout(poll, 5000);
    };
    poll();
    return () => { isMounted = false; };
  }, [id, fetchStatus]);

  const steps = [
    { key: 'searching', label: 'Searching Donors', icon: <AlertIcon size={20} /> },
    { key: 'matching', label: 'Matching Donors', icon: <UsersIcon size={20} /> },
    { key: 'outreach_active', label: 'WhatsApp Outreach', icon: <PhoneIcon size={20} /> },
    { key: 'donors_shortlisted', label: 'Donors Shortlisted', icon: <HeartIcon size={20} /> },
    { key: 'medical_screening', label: 'Medical Screening', icon: <ShieldIcon size={20} /> },
    { key: 'confirmed', label: 'Screening Confirmed', icon: <CheckCircleIcon size={20} /> },
    { key: 'completed', label: 'Donation Completed', icon: <CheckCircleIcon size={20} /> },
  ];
  
  const currentIdx = steps.findIndex((s) => s.key === (status?.status || 'searching'));
  const isCompleted = status?.status === 'completed';
  const isRejected = ['rejected', 'rejected_by_blood_bank'].includes(status?.status);
  const isShortlisted = ['donors_shortlisted', 'medical_screening', 'confirmed'].includes(status?.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blood-100 via-blood-50 to-red-100 relative overflow-hidden">
      <div className="relative max-w-2xl mx-auto py-12 px-6">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">Request Status</h1>
          <p className="text-sm text-gray-600 font-mono mb-4">
            ID: <span className="font-bold text-blood-700">#{id.slice(-8).toUpperCase()}</span>
          </p>
          <button onClick={() => fetchStatus(true)} className="text-xs font-bold text-blood-600 bg-white px-4 py-2 rounded-full shadow-sm">
            Refresh Status
          </button>
        </div>

        <div className="relative bg-white rounded-3xl shadow-2xl border-2 border-blood-100 p-8 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-gray-900">Progress</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              isCompleted ? 'bg-emerald-100 text-emerald-700' : isRejected ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isRejected ? 'Screening Rejected' : status?.status === 'confirmed' ? 'Medical Screening Confirmed' : steps[currentIdx]?.label || (status?.status || 'Searching').replaceAll('_', ' ')}
            </span>
          </div>

          <div className="relative">
            <div className="absolute top-6 left-6 right-6 h-1 bg-gray-100 rounded-full" />
            <div className="absolute top-6 left-6 h-1 bg-gradient-to-r from-blood-500 to-blood-700 rounded-full transition-all duration-700"
              style={{ width: `calc(${(Math.max(0, currentIdx) / (steps.length - 1)) * 100}% - ${currentIdx === 0 ? 0 : 12}px)` }} />

            <div className="relative flex justify-between">
              {steps.map((step, i) => {
                const isDone = i <= currentIdx && !isRejected;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isDone ? 'bg-gradient-to-br from-blood-500 to-blood-700 text-white shadow-lg shadow-blood-600/40' : 'bg-white border-2 border-gray-200 text-gray-400'
                    } ${i === currentIdx && !isCompleted && !isRejected ? 'ring-4 ring-blood-200 animate-pulse' : ''}`}>
                      {isDone ? step.icon : <span className="text-sm font-bold">{i + 1}</span>}
                    </div>
                    <p className={`mt-3 text-[10px] md:text-xs font-bold text-center ${isDone ? 'text-blood-700' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {status?.status === 'searching' && (
          <div className="bg-white rounded-3xl shadow-lg border-2 border-dashed border-amber-300 p-6 mb-6 animate-fade-in-up text-center">
            <p className="text-amber-800 font-bold mb-2">Alerting donors nearby...</p>
            <p className="text-xs text-amber-600">We will update this page automatically when someone accepts.</p>
          </div>
        )}

        {isShortlisted && Array.isArray(status?.shortlisted_donors) && (
          <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-6 mb-6 animate-fade-in-up">
            <h2 className="text-xl font-black text-gray-900 mb-2">Selected donors</h2>
            <p className="text-sm text-gray-600 mb-4">Up to three closest eligible donors were shortlisted from the requester's location. Identity verification and medical screening are separate steps.</p>
            <div className="space-y-3">{status.shortlisted_donors.map((candidate, index) => <div key={candidate.id || `${candidate.name}-${index}`} className="rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-3"><div><p className="font-bold text-gray-900">{candidate.name}</p><p className="text-xs text-gray-500">{candidate.blood_type || status.blood_type} · {candidate.distance_km == null ? 'Distance unavailable' : `${Number(candidate.distance_km).toFixed(1)} km away`}</p></div><span className="text-xs font-bold uppercase rounded-full bg-blue-50 text-blue-700 px-3 py-1">{(candidate.status || 'selected').replaceAll('_', ' ')}</span></div>)}</div>
          </div>
        )}

        {status?.status === 'donor_found' && status.accepted_donor && (
          <div className="bg-white rounded-3xl shadow-xl border-2 border-emerald-200 p-8 animate-fade-in-up text-center">
            <h2 className="text-2xl font-black text-emerald-800 mb-2">🎉 Donor Found!</h2>
            <p className="text-sm text-gray-500 mb-6">Please contact them to coordinate your arrival at the hospital.</p>
            <div className="bg-gray-50 rounded-2xl p-5 max-w-sm mx-auto">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Donor Name</p>
              <p className="text-lg font-black text-gray-900 mb-4">{status.accepted_donor.name}</p>
              <a href={`tel:${status.accepted_donor.phone}`} className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                <PhoneIcon size={20} /> Call {status.accepted_donor.phone}
              </a>
            </div>
          </div>
        )}

        {status?.status === 'at_blood_bank' && (
          <div className="bg-white rounded-3xl shadow-xl border-2 border-blue-200 p-8 animate-fade-in-up text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4 animate-pulse">
              <UsersIcon size={32} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-blue-800 mb-2">At Blood Bank</h2>
            <p className="text-sm text-gray-600">The donor has arrived and is currently undergoing medical screening. This usually takes 10-15 minutes.</p>
          </div>
        )}

        {isCompleted && (
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl shadow-2xl p-8 animate-fade-in-up text-center text-white">
            <CheckCircleIcon size={48} className="mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-2">Donation Completed!</h2>
            <p className="text-emerald-50 mb-6">The hospital has successfully collected the blood. Thank you for using Jeevansh.</p>
            <button onClick={() => navigate('/')} className="bg-white text-emerald-700 font-bold px-8 py-3 rounded-xl">Back to Home</button>
          </div>
        )}
      </div>
    </div>
  );
}