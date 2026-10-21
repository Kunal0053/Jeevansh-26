
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequest } from '../context/RequestContext';
import {
  createRequest,
  getRequestStatus,
} from '../services/requestService';

import {
  HeartIcon,
  SendIcon,
  ShieldIcon,
  CheckCircleIcon,
  PhoneIcon,
  SparkleIcon,
  ArrowRightIcon,
  UsersIcon,
  AlertIcon,
} from '../components/common/Icons';

export default function AlertingScreen() {
  const { activeRequest, setActiveRequest } = useRequest();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [dotCount, setDotCount] = useState(0);
  const [error, setError] = useState('');

  // Create or retrieve the request using the same clientRequestId.
  useEffect(() => {
    if (!activeRequest) {
      navigate('/request', { replace: true });
      return;
    }

    let cancelled = false;

    async function submitRequest() {
      try {
        const created = await createRequest(activeRequest);

        // Ignore stale UI updates, but do not cancel the server request.
        if (cancelled) return;

        setRequest(created);
        setActiveRequest((previous) => ({
          ...(previous || {}),
          ...created,
          clientRequestId: activeRequest.clientRequestId,
        }));
      } catch (err) {
        console.error('Failed to create blood request:', err);

        if (!cancelled) {
          setError(
            err?.response?.data?.detail ||
              err?.message ||
              'Unable to create your request. Please try again.'
          );
        }
      }
    }

    void submitRequest();

    return () => {
      cancelled = true;
    };
  }, []);

  // Animate the sending dots.
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((count) => (count + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Refresh request status every four seconds.
  useEffect(() => {
    if (!request?.id) return;

    let cancelled = false;
    let timerId;

    const pollStatus = async () => {
      try {
        const latest = await getRequestStatus(request.id);

        if (cancelled) return;

        setRequest((previous) => ({
          ...previous,
          ...latest,
        }));

        setActiveRequest((previous) => ({
          ...(previous || {}),
          ...latest,
        }));
      } catch (err) {
        if (!cancelled) {
          console.error('Request status refresh failed:', err);
        }
      }

      if (!cancelled) {
        timerId = setTimeout(pollStatus, 4000);
      }
    };

    void pollStatus();

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [request?.id, setActiveRequest]);

  if (error && !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blood-100 via-blood-50 to-red-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertIcon
            size={36}
            className="text-red-600 mx-auto mb-4"
          />

          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Request could not be loaded
          </h2>

          <p className="text-sm text-gray-600 mb-6">{error}</p>

          <button
            onClick={() => navigate('/request')}
            className="w-full bg-blood-600 text-white font-bold py-3 rounded-xl"
          >
            Back to Request Form
          </button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blood-100 via-blood-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blood-200 border-t-blood-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            Preparing your request...
          </p>
        </div>
      </div>
    );
  }

  const alertedDonors = Number(request.alerted_donors ?? 0);
  const bloodType =
    request.blood_type || activeRequest?.bloodType || '—';

  const radius =
    request.current_radius_km ??
    request.workflow?.current_radius_km ??
    5;

  const status = String(request.status || 'searching').toLowerCase();

  const statusMessages = {
    searching: 'Searching for compatible donors near you.',
    matching: 'Finding eligible donors for your request.',
    evaluating: 'Checking compatible donor availability.',
    outreach_active: 'Donor alerts are being processed.',
    escalated: 'Searching for eligible donors. The request may need a wider search.',
    accepted: 'A donor has accepted your request.',
    completed: 'Your request has been completed.',
    cancelled: 'This request has been cancelled.',
    closed: 'This request is closed.',
    ready_for_review: 'A potential donor match is ready for review.',
  };

  const isFinished = [
    'completed',
    'cancelled',
    'closed',
  ].includes(status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blood-100 via-blood-50 to-red-100 relative overflow-hidden">
      {/* Floating background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-blood-200/40 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 -right-20 w-96 h-96 bg-red-200/40 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto py-16 px-6">
        {/* Hero and animated radar */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="relative inline-flex items-center justify-center w-32 h-32 mb-6">
            {!isFinished && (
              <>
                <span
                  className="absolute inset-0 rounded-full bg-blood-200/60 animate-ping"
                  style={{ animationDuration: '2.5s' }}
                />
                <span
                  className="absolute inset-3 rounded-full bg-blood-300/50 animate-ping"
                  style={{
                    animationDuration: '2s',
                    animationDelay: '0.5s',
                  }}
                />
                <span
                  className="absolute inset-6 rounded-full bg-blood-100/70 animate-ping"
                  style={{
                    animationDuration: '1.5s',
                    animationDelay: '1s',
                  }}
                />
              </>
            )}

            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blood-500 to-blood-700 shadow-2xl shadow-blood-600/50 flex items-center justify-center animate-float">
              <SendIcon size={36} className="text-white" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-blood-200 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase text-blood-700 mb-4">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            {status === 'accepted'
              ? 'Donor Accepted'
              : isFinished
                ? 'Request Closed'
                : 'Live Alert Active'}
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 leading-tight">
            {status === 'accepted'
              ? 'Donor Found'
              : status === 'completed'
                ? 'Request Completed'
                : status === 'cancelled' || status === 'closed'
                  ? 'Request Closed'
                  : status === 'escalated'
                    ? 'Expanding Search'
                    : 'Alerting Donors'}
            {!isFinished && status !== 'accepted' && (
              <span className="text-blood-600">
                {'.'.repeat(dotCount)}
              </span>
            )}
          </h1>

          <p className="text-base text-gray-600 max-w-md mx-auto leading-relaxed">
            {statusMessages[status] ||
              'Your request is being processed. Check live status for updates.'}
          </p>

          <p className="text-sm text-gray-600 mt-2">
            WhatsApp alerts sent to{' '}
            <span className="font-bold text-blood-700">
              {alertedDonors}
            </span>{' '}
            compatible donors.
          </p>
        </div>

        {/* Impact statistics */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in-up animate-delay-100">
          <div className="bg-white rounded-2xl shadow-lg shadow-blood-100/60 border-2 border-blood-100 p-4 text-center hover:-translate-y-1 transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blood-100 mb-2">
              <UsersIcon size={20} className="text-blood-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">
              {alertedDonors}
            </p>
            <p className="text-xs font-medium text-gray-500">Alerted</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-blood-100/60 border-2 border-blood-100 p-4 text-center hover:-translate-y-1 transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 mb-2">
              <HeartIcon size={20} className="text-blue-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">
              {bloodType}
            </p>
            <p className="text-xs font-medium text-gray-500">Needed</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-blood-100/60 border-2 border-blood-100 p-4 text-center hover:-translate-y-1 transition-all">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 mb-2">
              <SparkleIcon size={20} className="text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">{radius}</p>
            <p className="text-xs font-medium text-gray-500">km radius</p>
          </div>
        </div>

        {/* Track live status */}
        <div className="w-full mb-6 animate-fade-in-up animate-delay-200">
          <button
            onClick={() => navigate(`/request/status/${request.id}`)}
            className="w-full bg-gradient-to-r from-blood-600 to-blood-700 text-white font-black text-lg py-5 rounded-2xl hover:shadow-2xl hover:shadow-blood-600/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 animate-pulse-glow"
          >
            Track Live Status
            <ArrowRightIcon size={22} />
          </button>
        </div>

        {/* Request information */}
        <div className="relative bg-white rounded-3xl shadow-xl shadow-blood-200/40 border-2 border-blood-100 p-6 mb-6 animate-fade-in-up animate-delay-300">
          <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full" />

          <div className="flex items-start gap-4 pt-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
              <AlertIcon size={24} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 mb-1">
                Request Received
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                You will be notified when a donor accepts.
              </p>

              <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                <p className="text-xs text-gray-500 mb-0.5">
                  Request ID
                </p>
                <p className="font-mono text-xs font-bold text-gray-800 break-all">
                  {request.id}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="relative bg-white rounded-3xl shadow-xl shadow-blood-200/40 border-2 border-blood-100 p-6 mb-6 animate-fade-in-up animate-delay-400">
          <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-blood-500 via-blood-600 to-blood-700 rounded-full" />

          <h3 className="font-bold text-gray-900 mb-4 pt-2">
            What happens next?
          </h3>

          <div className="space-y-3">
            {[
              {
                icon: <SendIcon size={18} />,
                text: 'Compatible donors receive alerts on WhatsApp',
                color: 'bg-blood-100 text-blood-600',
              },
              {
                icon: <HeartIcon size={18} />,
                text: 'A compatible donor can accept the request',
                color: 'bg-blue-100 text-blue-600',
              },
              {
                icon: <CheckCircleIcon size={18} />,
                text: 'You can view available donor contact information',
                color: 'bg-emerald-100 text-emerald-600',
              },
              {
                icon: <ShieldIcon size={18} />,
                text: 'Donation verification follows your bank workflow',
                color: 'bg-amber-100 text-amber-600',
              },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-gray-600 animate-fade-in-up animate-delay-500">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldIcon size={14} className="text-emerald-500" />
            Secure Alerts
          </span>

          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircleIcon size={14} className="text-emerald-500" />
            Verified Donors
          </span>

          <span className="flex items-center gap-1.5 font-medium">
            <PhoneIcon size={14} className="text-emerald-500" />
            24/7 Support
          </span>
        </div>
      </div>
    </div>
  );
}
