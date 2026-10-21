import { useState } from 'react';
import { SendIcon, CheckCircleIcon, HeartIcon } from './Icons';
import toast from 'react-hot-toast';

export default function FeedbackModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.message) return toast.error('Please enter a message');
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setForm({ name: '', email: '', message: '' });
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
        {/* Decorative header */}
        <div className="bg-gradient-to-r from-blood-600 to-blood-800 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <HeartIcon size={32} className="mx-auto mb-2 text-white" />
          <h2 className="text-xl font-black">Share Your Feedback</h2>
          <p className="text-red-100 text-xs mt-1">Help us improve Jeevansh</p>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white text-xl font-bold">✕</button>
        </div>

        {submitted ? (
          <div className="p-10 text-center animate-fade-in-up">
            <CheckCircleIcon size={48} className="text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h3>
            <p className="text-gray-500 text-sm">Your feedback has been received.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">Name (Optional)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blood-500 focus:border-blood-500 outline-none transition-all text-sm"
                placeholder="Your name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blood-500 focus:border-blood-500 outline-none transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-700 mb-1">Message <span className="text-blood-600">*</span></label>
              <textarea
                required
                rows="3"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blood-500 focus:border-blood-500 outline-none transition-all text-sm resize-none"
                placeholder="Tell us what you love or what we can improve..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blood-600 to-blood-700 text-white font-bold py-3.5 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <SendIcon size={18} />
              Submit Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  );
}