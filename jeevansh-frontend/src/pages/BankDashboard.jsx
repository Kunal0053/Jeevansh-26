import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getBankReviewQueue } from '../services/bankService';
import { useAuth } from '../context/AuthContext';
import {
  HeartIcon,
  UsersIcon,
  AlertIcon,
  CheckCircleIcon,
  ShieldIcon,
  ClipboardIcon,
  SendIcon,
  ArrowRightIcon,
  SparkleIcon,
  PhoneIcon,
} from '../components/common/Icons';

// Blood stock data — in production this comes from the backend
const BLOOD_STOCK = [
  { group: 'A+',  units: 24, capacity: 40 },
  { group: 'A-',  units: 6,  capacity: 40 },
  { group: 'B+',  units: 18, capacity: 40 },
  { group: 'B-',  units: 11, capacity: 40 },
  { group: 'AB+', units: 9,  capacity: 40 },
  { group: 'AB-', units: 2,  capacity: 40 },
  { group: 'O+',  units: 32, capacity: 40 },
  { group: 'O-',  units: 4,  capacity: 40 },
];

// Weekly donation trend — synthetic for demo
const WEEKLY_TREND = [
  { day: 'Mon', donations: 8 },
  { day: 'Tue', donations: 12 },
  { day: 'Wed', donations: 6 },
  { day: 'Thu', donations: 14 },
  { day: 'Fri', donations: 18 },
  { day: 'Sat', donations: 9 },
  { day: 'Sun', donations: 5 },
];

// Recent verified donations
const RECENT_DONATIONS = [
  { name: 'Rahul S.', blood: 'B+', time: '10:42 AM', status: 'Verified' },
  { name: 'Priya M.', blood: 'O+', time: '10:15 AM', status: 'Verified' },
  { name: 'Amit K.', blood: 'A+', time: '9:50 AM', status: 'Pending' },
  { name: 'Neha R.', blood: 'B+', time: '9:20 AM', status: 'Verified' },
];

// Helper: determine stock status
function getStockStatus(units, capacity) {
  const pct = units / capacity;
  if (pct < 0.2) return { label: 'Critical', color: 'red', bar: 'from-red-500 to-red-700', text: 'text-red-600', bg: 'bg-red-50 border-red-200' };
  if (pct < 0.4) return { label: 'Low', color: 'amber', bar: 'from-amber-400 to-amber-600', text: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  return { label: 'Good', color: 'emerald', bar: 'from-emerald-500 to-emerald-700', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
}

export default function BankDashboard() {
  const { bank } = useAuth();
  const [workflowRequests, setWorkflowRequests] = useState([]);
  const [workflowError, setWorkflowError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const items = await getBankReviewQueue();
        if (active) { setWorkflowRequests(items); setWorkflowError(''); }
      } catch (error) {
        if (active) setWorkflowError(error.response?.data?.detail || 'Could not load live request workflow.');
      }
    };
    load();
    const timer = window.setInterval(load, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [bank?.id]);

  // Derived stats
  const totalUnits = BLOOD_STOCK.reduce((sum, s) => sum + s.units, 0);
  const totalCapacity = BLOOD_STOCK.reduce((sum, s) => sum + s.capacity, 0);
  const stockHealthPct = Math.round((totalUnits / totalCapacity) * 100);
  const criticalTypes = BLOOD_STOCK.filter((s) => s.units / s.capacity < 0.2);
  const weeklyTotal = WEEKLY_TREND.reduce((sum, d) => sum + d.donations, 0);
  const maxWeekly = Math.max(...WEEKLY_TREND.map((d) => d.donations));

  return (
    <div className="space-y-6">
      {/* ═══════════════ WELCOME HERO ═══════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blood-600 via-blood-700 to-blood-800 text-white p-6 md:p-8 animate-fade-in-up">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 -right-10 w-72 h-72 bg-red-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-3">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Live Command Center
            </div>
            <h1 className="text-2xl md:text-3xl font-black mb-1">
              {bank?.name || 'City Hospital Blood Bank'}
            </h1>
            <p className="text-red-100 text-sm md:text-base">
              Real-time stock, donations, and requests at a glance.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
            <ShieldIcon size={22} className="text-white" />
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-wider font-bold text-red-100">Admin</p>
              <p className="text-sm font-bold">Officer Verified</p>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 animate-fade-in-up">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div><h2 className="text-xl font-black text-gray-900">Live donor workflow</h2><p className="text-xs text-gray-500 mt-1">WhatsApp-selected donors, identity verification and medical screening.</p></div>
          <Link to="/bank/scan" className="bg-blood-600 text-white text-sm font-bold rounded-xl px-4 py-3">Open QR/token scanner</Link>
        </div>
        {workflowError && <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3 mb-3">{workflowError}</p>}
        {workflowRequests.length === 0 ? <p className="text-sm text-gray-500 py-5 text-center border-2 border-dashed border-gray-200 rounded-2xl">No shortlisted or medically reviewed requests yet.</p> : <div className="space-y-4">{workflowRequests.map((req) => <div key={req.id} className="rounded-2xl border border-gray-100 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black text-gray-900">{req.blood_type} · {req.hospital_name || req.location_text || 'Hospital details pending'}</p><p className="text-xs text-gray-500 mt-1">Request #{req.id.slice(-8).toUpperCase()} · {req.units || 1} unit(s)</p></div><span className="text-xs font-bold uppercase rounded-full bg-blue-50 text-blue-700 px-3 py-1">{(req.status || 'pending').replaceAll('_', ' ')}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{(req.candidates || []).map((candidate) => <div key={candidate.id} className="bg-gray-50 rounded-xl p-3"><p className="font-bold text-sm text-gray-900">{candidate.name}</p><p className="text-xs text-gray-500">{candidate.blood_type} · {candidate.distance_km == null ? 'Distance unavailable' : `${Number(candidate.distance_km).toFixed(1)} km`}</p><p className="text-xs mt-2 font-bold text-blood-700">{(candidate.status || 'selected').replaceAll('_', ' ')}</p></div>)}</div></div>)}</div>}
      </section>

      {/* ═══════════════ CRITICAL ALERTS ═══════════════ */}
      {criticalTypes.length > 0 && (
        <div className="relative bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-3xl p-5 animate-fade-in-up overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/30 animate-pulse">
              <AlertIcon size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-red-800 mb-1">
                ⚠️ Critical Stock Alert
              </h3>
              <p className="text-sm text-red-700 mb-3">
                {criticalTypes.length} blood {criticalTypes.length === 1 ? 'type is' : 'types are'} critically low and need urgent collection.
              </p>
              <div className="flex flex-wrap gap-2">
                {criticalTypes.map((type) => (
                  <span
                    key={type.group}
                    className="inline-flex items-center gap-1.5 bg-white border-2 border-red-300 text-red-700 font-black px-3 py-1.5 rounded-xl text-sm"
                  >
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    {type.group} — {type.units} units
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ KPI CARDS ═══════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Donations",
            value: '3',
            sub: '2 verified, 1 pending',
            icon: <HeartIcon size={22} />,
            gradient: 'from-blood-500 to-blood-700',
            shadow: 'shadow-blood-500/30',
          },
          {
            label: 'Active Requests',
            value: '7',
            sub: '3 high priority',
            icon: <AlertIcon size={22} />,
            gradient: 'from-blue-500 to-blue-700',
            shadow: 'shadow-blue-500/30',
          },
          {
            label: 'Stock Health',
            value: `${stockHealthPct}%`,
            sub: `${totalUnits} units total`,
            icon: <ShieldIcon size={22} />,
            gradient: 'from-emerald-500 to-emerald-700',
            shadow: 'shadow-emerald-500/30',
          },
          {
            label: 'Fulfillment Rate',
            value: '94%',
            sub: 'Last 30 days',
            icon: <CheckCircleIcon size={22} />,
            gradient: 'from-amber-500 to-amber-700',
            shadow: 'shadow-amber-500/30',
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-3xl shadow-xl shadow-blood-100/60 border-2 border-blood-100 p-5 hover:-translate-y-1 transition-all animate-fade-in-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg ${stat.shadow} mb-3`}>
              {stat.icon}
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-gray-900 leading-tight">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ═══════════════ QUICK SCAN CTA — NOW ABOVE BLOOD STOCK ═══════════════ */}
      <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <Link to="/bank/scan">
          <button className="w-full bg-gradient-to-r from-blood-600 to-blood-700 text-white font-black text-lg py-5 rounded-2xl hover:shadow-2xl hover:shadow-blood-600/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 animate-pulse-glow">
            <ClipboardIcon size={22} />
            Scan QR to Verify Donation
            <ArrowRightIcon size={22} />
          </button>
        </Link>
      </div>

      {/* ═══════════════ BLOOD STOCK CHART ═══════════════ */}
      <div className="bg-white rounded-3xl shadow-xl shadow-blood-100/60 border-2 border-blood-100 p-6 md:p-7 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 flex items-center justify-center shadow-lg shadow-blood-500/30">
              <ClipboardIcon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Blood Stock Levels</h3>
              <p className="text-xs text-gray-500">Real-time inventory across 8 blood groups</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-gray-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Good
            </span>
            <span className="flex items-center gap-1.5 font-medium text-gray-500">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Low
            </span>
            <span className="flex items-center gap-1.5 font-medium text-gray-500">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Critical
            </span>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
          {BLOOD_STOCK.map((stock, i) => {
            const status = getStockStatus(stock.units, stock.capacity);
            const heightPct = Math.max((stock.units / stock.capacity) * 100, 8);
            return (
              <div
                key={stock.group}
                className="flex flex-col items-center animate-fade-in-up"
                style={{ animationDelay: `${600 + i * 50}ms` }}
              >
                <p className={`text-xs font-black mb-1.5 ${status.text}`}>
                  {stock.units}
                </p>

                <div className="relative w-full h-32 bg-gray-100 rounded-2xl overflow-hidden">
                  <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${status.bar} rounded-2xl transition-all duration-1000 ease-out`}
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>

                <p className="text-sm font-black text-gray-900 mt-2">
                  {stock.group}
                </p>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${status.text} mt-0.5`}>
                  {status.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Summary row */}
        <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Units</p>
            <p className="text-xl font-black text-gray-900">{totalUnits}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Capacity Used</p>
            <p className="text-xl font-black text-gray-900">{stockHealthPct}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Critical Types</p>
            <p className="text-xl font-black text-red-600">{criticalTypes.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Healthy Types</p>
            <p className="text-xl font-black text-emerald-600">
              {BLOOD_STOCK.filter((s) => s.units / s.capacity >= 0.4).length}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════ WEEKLY TREND + TODAY'S SNAPSHOT ═══════════════ */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Weekly Trend */}
        <div className="bg-white rounded-3xl shadow-xl shadow-blood-100/60 border-2 border-blood-100 p-6 animate-fade-in-up" style={{ animationDelay: '900ms' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <SendIcon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Weekly Trend</h3>
              <p className="text-xs text-gray-500">{weeklyTotal} donations this week</p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 h-32">
            {WEEKLY_TREND.map((day) => {
              const heightPct = (day.donations / maxWeekly) * 100;
              return (
                <div key={day.day} className="flex flex-col items-center flex-1">
                  <p className="text-[10px] font-bold text-blue-600 mb-1">{day.donations}</p>
                  <div className="w-full h-20 bg-gray-100 rounded-xl overflow-hidden flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-xl transition-all duration-1000"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 mt-1.5">{day.day}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Snapshot */}
        <div className="bg-white rounded-3xl shadow-xl shadow-blood-100/60 border-2 border-blood-100 p-6 animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <SparkleIcon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Today's Snapshot</h3>
              <p className="text-xs text-gray-500">Live metrics for {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Donations Verified', value: '2', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Pending Verification', value: '1', color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Requests Handled', value: '5', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Avg Response Time', value: '18 min', color: 'text-blood-600', bg: 'bg-blood-50' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <span className={`text-sm font-black px-3 py-1 rounded-xl ${item.bg} ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════ RECENT DONATIONS ═══════════════ */}
      <div className="bg-white rounded-3xl shadow-xl shadow-blood-100/60 border-2 border-blood-100 p-6 animate-fade-in-up" style={{ animationDelay: '1100ms' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 flex items-center justify-center shadow-lg shadow-blood-500/30">
              <UsersIcon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Recent Donations</h3>
              <p className="text-xs text-gray-500">Latest verified entries today</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-blood-50 text-blood-700 px-3 py-1.5 rounded-full border border-blood-100 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-blood-500 rounded-full animate-pulse" />
            Live
          </span>
        </div>

        <div className="space-y-3">
          {RECENT_DONATIONS.map((d, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-blood-500 to-blood-700 rounded-2xl flex items-center justify-center font-black text-white text-xs shadow-md shadow-blood-500/30">
                  {d.blood}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.time}</p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                  d.status === 'Verified'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {d.status === 'Verified' ? '✓ ' : '⏳ '}
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ SUPPORT FOOTER ═══════════════ */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-gray-600 animate-fade-in-up" style={{ animationDelay: '1200ms' }}>
        <span className="flex items-center gap-1.5 font-medium">
          <ShieldIcon size={14} className="text-emerald-500" />
          Audit Logged
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <CheckCircleIcon size={14} className="text-emerald-500" />
          ISO 27001
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <PhoneIcon size={14} className="text-emerald-500" />
          24/7 Support
        </span>
      </div>
    </div>
  );
}