import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas-pro';
import { getCertificateById } from '../services/donorService';
import { ArrowRightIcon, HeartIcon, SendIcon } from '../components/common/Icons';
import toast from 'react-hot-toast';

function formatCertificateDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DonorCertificate() {
  const { certId } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCertificateById(certId)
      .then((data) => { if (active) setCert(data); })
      .catch(() => { if (active) toast.error('Certificate not found'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [certId]);

  const handleDownload = async () => {
    if (!certRef.current || !cert) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      const safeName = (cert.donor_name || 'Donor').trim().replace(/\s+/g, '_');
      link.download = `Jeevansh_Certificate_${safeName}.png`;
      link.click();
      toast.success('Certificate downloaded!');
    } catch (err) {
      console.error('Download Error:', err);
      toast.error('Failed to download certificate');
    } finally {
      setDownloading(false);
    }
  };

  const handleShareLinkedIn = () => {
    const text = encodeURIComponent('I just saved a life by donating blood through Jeevansh! 🩸❤️ Proud to be a donor.');
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}%20${url}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) return <div className="text-center py-16 animate-pulse text-gray-500">Loading certificate...</div>;
  if (!cert) return <div className="text-center py-16 text-gray-600">Certificate not found.</div>;

  const certificateDate = formatCertificateDate(cert.verified_at || cert.completed_at || cert.created_at);
  const hospitalName = cert.hospital_name || cert.location_text || 'Hospital not specified';

  return (
    <div className="w-full max-w-4xl mx-auto py-5 sm:py-8 px-3 sm:px-5">
      {/* Compact certificate: responsive spacing keeps it readable on mobile and desktop. */}
      <div
        ref={certRef}
        className="relative isolate bg-white overflow-hidden border-[5px] sm:border-[8px] border-double border-amber-200 rounded-2xl sm:rounded-3xl shadow-xl px-4 py-6 sm:px-8 sm:py-9 md:px-12 md:py-10 text-center mb-6"
      >
        <div className="absolute -top-2 -left-2 w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-amber-100 to-transparent opacity-70 rounded-br-full pointer-events-none" />
        <div className="absolute -bottom-2 -right-2 w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-tl from-amber-100 to-transparent opacity-70 rounded-tl-full pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blood-500 to-blood-700 shadow-lg shadow-blood-600/20 mb-3 sm:mb-4">
            <HeartIcon size={28} className="text-white sm:hidden" />
            <HeartIcon size={34} className="text-white hidden sm:block" />
          </div>

          <p className="text-[10px] sm:text-xs font-bold tracking-[0.18em] sm:tracking-[0.28em] text-amber-600 uppercase mb-2">
            Officially Verified by Jeevansh
          </p>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-black leading-tight text-gray-900 mb-4">
            Certificate of Life
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 italic mb-1">This certificate is proudly presented to</p>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black leading-tight text-blood-700 break-words mb-4 sm:mb-5">
            {cert.donor_name || 'Valued Donor'}
          </h2>

          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto leading-relaxed mb-5 sm:mb-6">
            In recognition of their selfless blood donation ({' '}
            <strong className="text-gray-900">{cert.blood_type || 'Blood group not specified'}</strong>),
            helping support patients in need. Your contribution makes a difference.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 border-t border-gray-200 pt-4 sm:pt-5 text-center">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
              <p className="text-sm sm:text-base font-bold text-gray-800">{certificateDate}</p>
            </div>
            <div className="min-w-0 px-1">
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Hospital</p>
              <p className="text-sm sm:text-base font-bold text-gray-800 break-words">{hospitalName}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Blood Type</p>
              <p className="text-sm sm:text-base font-bold text-blood-600">{cert.blood_type || '—'}</p>
            </div>
          </div>
          <p className="mt-5 text-[10px] sm:text-xs tracking-widest uppercase text-gray-400">Every donation counts · Jeevansh</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full bg-gradient-to-r from-blood-600 to-blood-700 text-white font-black py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {downloading ? 'Generating...' : '📥 Download as Image'}
        </button>
        <button
          onClick={handleShareLinkedIn}
          className="w-full bg-[#0A66C2] text-white font-black py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:shadow-xl transition flex items-center justify-center gap-2"
        >
          <SendIcon size={20} />
          Share on LinkedIn
        </button>
      </div>

      <button
        onClick={() => navigate('/donor/dashboard')}
        className="w-full mt-3 sm:mt-4 bg-white border-2 border-gray-200 text-gray-600 font-bold py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-gray-50 transition flex items-center justify-center gap-2"
      >
        <ArrowRightIcon size={18} className="rotate-180" />
        Back to Dashboard
      </button>
    </div>
  );
}
