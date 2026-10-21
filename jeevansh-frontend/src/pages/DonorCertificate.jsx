import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas-pro';
import { getCertificateById } from '../services/donorService';
import { CheckCircleIcon, ArrowRightIcon, HeartIcon, SendIcon } from '../components/common/Icons';
import toast from 'react-hot-toast';

export default function DonorCertificate() {
  const { certId } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef(null);

  useEffect(() => {
    getCertificateById(certId)
      .then(setCert)
      .catch(() => toast.error('Certificate not found'))
      .finally(() => setLoading(false));
  }, [certId]);

  const handleDownload = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Jeevansh_Certificate_${cert.donor_name.replace(' ', '_')}.png`;
      link.click();
      toast.success('Certificate downloaded!');
    } catch (err) {
      console.error("Download Error:", err);
      toast.error('Failed to download certificate');
    } finally {
      setDownloading(false);
    }
  };

  const handleShareLinkedIn = () => {
    const text = encodeURIComponent(`I just saved a life by donating blood through Jeevansh! 🩸❤️ Proud to be a donor.`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}%20${url}`, '_blank');
  };

  if (loading || !cert) return <div className="text-center py-20 animate-pulse text-gray-500">Loading certificate...</div>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      
      {/* The Actual Certificate Design */}
      <div 
        ref={certRef} 
        className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border-[8px] border-double border-amber-200 p-10 md:p-16 text-center mb-8"
      >
        {/* Decorative Corner Elements */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-amber-100 to-transparent opacity-50 rounded-br-full" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-amber-100 to-transparent opacity-50 rounded-tl-full" />

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blood-500 to-blood-700 shadow-xl shadow-blood-600/30 mb-6">
            <HeartIcon size={40} className="text-white" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-serif font-black text-gray-900 mb-2">
            Certificate of Life
          </h1>
          <p className="text-sm font-bold tracking-[0.3em] text-amber-600 uppercase mb-10">
            Officially Verified by Jeevansh
          </p>

          <p className="text-gray-500 italic mb-2">This certificate is proudly presented to</p>
          <h2 className="text-4xl md:text-5xl font-black text-blood-700 mb-10">
            {cert.donor_name}
          </h2>

          <p className="text-gray-600 max-w-lg mx-auto leading-relaxed mb-10">
            For their selfless act of donating <strong className="text-gray-900">{cert.blood_type}</strong> blood, 
            potentially saving up to <strong className="text-gray-900">3 lives</strong>. Your contribution makes the world a better place.
          </p>

          <div className="flex justify-center gap-12 border-t border-gray-200 pt-8">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
              <p className="font-bold text-gray-800">{new Date(cert.verified_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Hospital</p>
              <p className="font-bold text-gray-800 capitalize">{cert.bank_id.replace('-', ' ')}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Blood Type</p>
              <p className="font-bold text-blood-600">{cert.blood_type}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={handleDownload}
          disabled={downloading}
          className="w-full bg-gradient-to-r from-blood-600 to-blood-700 text-white font-black py-4 rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {downloading ? 'Generating...' : '📥 Download as Image'}
        </button>
        
        <button 
          onClick={handleShareLinkedIn}
          className="w-full bg-[#0A66C2] text-white font-black py-4 rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition flex items-center justify-center gap-2"
        >
          <SendIcon size={20} />
          Share on LinkedIn
        </button>
      </div>

      <button 
        onClick={() => navigate('/donor/dashboard')}
        className="w-full mt-4 bg-white border-2 border-gray-200 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-50 transition flex items-center justify-center gap-2"
      >
        <ArrowRightIcon size={18} className="rotate-180" />
        Back to Dashboard
      </button>

    </div>
  );
}