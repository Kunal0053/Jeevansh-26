
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { HeartIcon, AlertIcon } from '../components/common/Icons';

const configuredApiUrl = (
  import.meta.env.VITE_API_URL ||
  'https://jeevansh-backend.onrender.com/api'
).replace(/\/+$/, '');

// Keep the frontend API base consistent whether VITE_API_URL includes /api or not.
const API_URL = configuredApiUrl.endsWith('/api')
  ? configuredApiUrl
  : `${configuredApiUrl}/api`;

export default function VerifyScreen() {
  const { token } = useParams();
  const [qrImage, setQrImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadQR() {
      setLoading(true);
      setError('');
      setQrImage('');

      try {
        const response = await axios.get(
          `${API_URL}/donations/public-qr/${encodeURIComponent(token)}`
        );

        if (cancelled) return;

        const image = response.data.qr_image_base64;

        if (!image) {
          throw new Error('QR image was not returned by the server.');
        }

        setQrImage(
          image.startsWith('data:image/')
            ? image
            : `data:image/png;base64,${image}`
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
            err.message ||
            'Unable to load QR code. Please try again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token) {
      loadQR();
    } else {
      setError('Verification link is missing its token.');
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="max-w-xl mx-auto py-12 px-5">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-7 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blood-100 flex items-center justify-center mx-auto mb-4">
          <HeartIcon size={32} className="text-blood-600" />
        </div>

        <h1 className="text-2xl font-black text-gray-900">
          Jeevansh Donation Verification
        </h1>

        <p className="text-sm text-gray-600 mt-3">
          Show this QR code to authorized blood-bank staff
          when you visit the blood bank.
        </p>

        {loading && (
          <div className="py-12 text-gray-500">
            Loading your QR code...
          </div>
        )}

        {!loading && qrImage && (
          <div className="mt-6 flex flex-col items-center">
            <div className="p-3 bg-white border border-gray-200 rounded-2xl">
              <img
                src={qrImage}
                alt="Donation verification QR code"
                className="w-64 h-64 object-contain"
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-gray-800">
              Please show this QR to blood-bank staff.
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Identity verification must be completed by authorized staff.
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
            <AlertIcon size={16} className="inline mr-1" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
